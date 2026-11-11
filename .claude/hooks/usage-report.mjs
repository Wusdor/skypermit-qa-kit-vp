#!/usr/bin/env node
// SessionEnd-хук: отчёт о расходе токенов и оценке стоимости сессии.
// stdin: { session_id, transcript_path, cwd, ... }
// Пишет reports/ws2/<YYYY-MM-DD>-<session_id>.md в корне проекта.
//
// Структура transcript (проверена на реальных файлах):
// - assistant: один API-запрос разбит на несколько записей (по блоку content) с одним requestId;
//   промежуточные записи могут нести неполный output_tokens — берём запись с максимальным.
// - субагенты: <dir(transcript)>/<session_id>/subagents/agent-<id>.jsonl + agent-<id>.meta.json.
// - /compact: system/compact_boundary с compactMetadata; сам вызов сжатия в assistant не пишется.
// - cost-state: накопительный modelUsage по моделям (включая субагентов, compact и служебные вызовы).

import { readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

// Цена за 1M токенов, USD: [вход, выход]
const PRICES = [
  { re: /^claude-haiku-5-5/, name: 'Haiku 5.5', in: 0.10, out: 0.50 },
  { re: /^claude-sonnet-5-5/, name: 'Sonnet 5.5', in: 2, out: 10 },
  { re: /^claude-opus-5-5/, name: 'Opus 5.5', in: 4, out: 20 },
  { re: /^claude-fable-5-/, name: 'Fable 5.x', in: 10, out: 50 },
];
const CACHE_READ_MULT = 0.1; // чтение из кеша = 1/10 цены входа
const CACHE_WRITE_5M = 1.25; // допущение: множитель цены входа для записи в кеш с TTL 5 мин
const CACHE_WRITE_1H = 2.0; // допущение: то же для TTL 1 ч
const PROMPT_PREVIEW = 80;

const priceFor = (model) => PRICES.find((p) => p.re.test(model ?? ''));

function readJsonl(path) {
  if (!existsSync(path)) return [];
  const out = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* битая строка — пропускаем */ }
  }
  return out;
}

function emptyUsage() {
  return { requests: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, write5m: 0, write1h: 0, writeUnsplit: 0 };
}

function addUsage(acc, u) {
  acc.requests += u.requests ?? 1;
  for (const k of ['input', 'output', 'cacheRead', 'cacheWrite', 'write5m', 'write1h', 'writeUnsplit']) acc[k] += u[k];
  return acc;
}

// usage из message.usage API-ответа
function fromApiUsage(u = {}) {
  const cacheWrite = u.cache_creation_input_tokens ?? 0;
  const write5m = u.cache_creation?.ephemeral_5m_input_tokens ?? 0;
  const write1h = u.cache_creation?.ephemeral_1h_input_tokens ?? 0;
  return {
    input: u.input_tokens ?? 0,
    output: u.output_tokens ?? 0,
    cacheRead: u.cache_read_input_tokens ?? 0,
    cacheWrite,
    write5m,
    write1h,
    writeUnsplit: Math.max(0, cacheWrite - write5m - write1h),
  };
}

// usage из cost-state.modelUsage[model]
function fromCostState(m = {}) {
  const cacheWrite = m.cacheCreationInputTokens ?? 0;
  const write5m = m.cacheCreationEphemeral5mInputTokens ?? 0;
  const write1h = m.cacheCreationEphemeral1hInputTokens ?? 0;
  return {
    input: m.inputTokens ?? 0,
    output: m.outputTokens ?? 0,
    cacheRead: m.cacheReadInputTokens ?? 0,
    cacheWrite,
    write5m,
    write1h,
    writeUnsplit: Math.max(0, cacheWrite - write5m - write1h),
  };
}

// Стоимость в USD или null, если модели нет в таблице.
// Запись в кеш без разбивки на 5m/1h считаем по ставке 5m (отмечается в отчёте).
function cost(model, u) {
  const p = priceFor(model);
  if (!p) return null;
  const inRate = p.in / 1e6;
  return u.input * inRate
    + u.output * (p.out / 1e6)
    + u.cacheRead * inRate * CACHE_READ_MULT
    + (u.write5m + u.writeUnsplit) * inRate * CACHE_WRITE_5M
    + u.write1h * inRate * CACHE_WRITE_1H;
}

function promptText(content) {
  let text = typeof content === 'string'
    ? content
    : Array.isArray(content) ? content.filter((b) => b?.type === 'text').map((b) => b.text).join(' ') : '';
  text = text
    .replace(/<\/?pasted_content[^>]*>/g, ' ')
    .replace(/<command-message>[\s\S]*?<\/command-message>/g, ' ')
    .replace(/<\/?command-(name|args)>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > PROMPT_PREVIEW ? text.slice(0, PROMPT_PREVIEW) + '…' : text;
}

const isToolResult = (c) => Array.isArray(c) && c.some((b) => b?.type === 'tool_result');

function isHumanPrompt(e) {
  return e.type === 'user' && e.origin?.kind === 'human' && !e.isMeta && !e.isCompactSummary
    && !isToolResult(e.message?.content);
}

// Уникальные запросы файла: requestId → { model, usage, timestamp, prompt }.
// prompt — последний человеческий промпт перед запросом (для субагента — его входной промпт).
function collectRequests(entries, { source, firstUserIsPrompt = false }) {
  const byId = new Map();
  let prompt = '';
  let sawUser = false;
  for (const e of entries) {
    if (e.type === 'user') {
      if (firstUserIsPrompt) {
        if (!sawUser && !isToolResult(e.message?.content)) prompt = promptText(e.message?.content);
        sawUser = true;
      } else if (isHumanPrompt(e)) {
        prompt = promptText(e.message?.content);
      }
      continue;
    }
    if (e.type !== 'assistant' || !e.message?.usage) continue;
    const id = e.requestId ?? e.message.id;
    const usage = fromApiUsage(e.message.usage);
    const prev = byId.get(id);
    if (!prev) {
      byId.set(id, { id, source, model: e.message.model, usage, timestamp: e.timestamp, prompt });
    } else if (usage.output > prev.usage.output) {
      prev.usage = usage;
    }
  }
  return [...byId.values()];
}

function loadSubagents(transcriptPath, sessionId) {
  const dir = join(dirname(transcriptPath), sessionId, 'subagents');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /^agent-.+\.jsonl$/.test(f))
    .map((f) => {
      const agentId = f.replace(/^agent-|\.jsonl$/g, '');
      let meta = {};
      try { meta = JSON.parse(readFileSync(join(dir, `agent-${agentId}.meta.json`), 'utf8')); } catch { /* нет meta */ }
      const type = meta.agentType ?? 'unknown';
      const requests = collectRequests(readJsonl(join(dir, f)), { source: `субагент ${type}`, firstUserIsPrompt: true });
      return { agentId, type, description: meta.description ?? '', requests };
    });
}

function byModel(requests) {
  const m = new Map();
  for (const r of requests) addUsage(m.get(r.model) ?? m.set(r.model, emptyUsage()).get(r.model), r.usage);
  return m;
}

const fmt = (n) => n.toLocaleString('ru-RU');
const usd = (v) => (v == null ? 'нет цены' : `$${v.toFixed(4)}`);
const pct = (a, b) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : '—');
const cacheShare = (u) => pct(u.cacheRead, u.input + u.cacheRead + u.cacheWrite);

function usageRow(label, model, u) {
  return `| ${label} | ${u.requests ?? '—'} | ${fmt(u.input)} | ${fmt(u.output)} | ${fmt(u.cacheRead)} | ${fmt(u.cacheWrite)} | ${cacheShare(u)} | ${usd(cost(model, u))} |`;
}

const TABLE_HEAD = [
  '| Модель | Запросов | Input | Output | Cache read | Cache write | Input из кеша | Оценка |',
  '|---|---:|---:|---:|---:|---:|---:|---:|',
];

function sumCost(entries) {
  let total = 0;
  let unknown = false;
  for (const [model, u] of entries) {
    const c = cost(model, u);
    if (c == null) unknown = true; else total += c;
  }
  return { total, unknown };
}

function buildReport({ sessionId, transcriptPath, entries, subagents }) {
  const main = collectRequests(entries, { source: 'основной поток' });
  const subRequests = subagents.flatMap((a) => a.requests);
  const all = [...main, ...subRequests];
  const models = byModel(all);
  const totals = [...models.values()].reduce(addUsage, emptyUsage());

  const compacts = entries.filter((e) => e.type === 'system' && e.subtype === 'compact_boundary');
  const costState = entries.filter((e) => e.type === 'cost-state').at(-1);
  const anyUnsplit = all.some((r) => r.usage.writeUnsplit > 0);

  const L = [];
  L.push(`# Отчёт о расходе: сессия ${sessionId}`, '');
  L.push(`- Дата отчёта: ${new Date().toISOString()}`);
  L.push(`- Transcript: \`${transcriptPath}\``);
  L.push(`- Уникальных API-запросов в transcript: ${all.length} (основной поток ${main.length}, субагенты ${subRequests.length})`, '');

  L.push('## Модели и токены (по запросам из transcript)', '', ...TABLE_HEAD);
  for (const [model, u] of models) L.push(usageRow(model, model, u));
  const { total, unknown } = sumCost(models);
  L.push(`| **Итого** | ${totals.requests} | ${fmt(totals.input)} | ${fmt(totals.output)} | ${fmt(totals.cacheRead)} | ${fmt(totals.cacheWrite)} | ${cacheShare(totals)} | **$${total.toFixed(4)}**${unknown ? ' + модели без цены' : ''} |`, '');

  L.push('## Субагенты', '');
  if (!subagents.length) {
    L.push('Субагентов в сессии не было.', '');
  } else {
    const subUsage = subRequests.reduce((acc, r) => addUsage(acc, r.usage), emptyUsage());
    const sc = sumCost(byModel(subRequests));
    L.push(`**Субагенты всего:** агентов ${subagents.length}, запросов ${subRequests.length}, input ${fmt(subUsage.input)}, output ${fmt(subUsage.output)}, cache read ${fmt(subUsage.cacheRead)}, cache write ${fmt(subUsage.cacheWrite)}, из кеша ${cacheShare(subUsage)}, ≈ $${sc.total.toFixed(4)}${sc.unknown ? ' + модели без цены' : ''}`, '');
    L.push('| Агент | Тип | Модель | Запросов | Output | Оценка |', '|---|---|---|---:|---:|---:|');
    for (const a of subagents) {
      for (const [model, u] of byModel(a.requests)) {
        L.push(`| ${a.agentId} | ${a.type} | ${model} | ${u.requests} | ${fmt(u.output)} | ${usd(cost(model, u))} |`);
      }
    }
    L.push('');
  }

  L.push('## /compact', '');
  if (!compacts.length) {
    L.push('Сжатий контекста не было.', '');
  } else {
    L.push('| Время | Триггер | Токенов до | Токенов после |', '|---|---|---:|---:|');
    for (const c of compacts) {
      const m = c.compactMetadata ?? {};
      L.push(`| ${c.timestamp} | ${m.trigger ?? '—'} | ${m.preTokens != null ? fmt(m.preTokens) : '—'} | ${m.postTokens != null ? fmt(m.postTokens) : '—'} |`);
    }
    L.push('', 'Сам запрос сжатия в transcript как assistant-запись не пишется; его токены видны только в cost-state (раздел ниже).', '');
  }

  L.push('## Сверка с cost-state (все вызовы Claude Code)', '');
  if (!costState?.modelUsage) {
    L.push('Записи cost-state в transcript нет (на момент SessionEnd ещё не записана или отсутствует). Вызовы вне transcript (compact, служебные) не учтены.', '');
  } else {
    L.push('Разница = cost-state − запросы из transcript: вызов сжатия, служебные запросы (например, генерация заголовка) и прочее, чего нет среди assistant-записей.', '', ...TABLE_HEAD);
    const residuals = [];
    for (const [model, m] of Object.entries(costState.modelUsage)) {
      const cs = { requests: null, ...fromCostState(m) };
      const seen = models.get(model) ?? emptyUsage();
      const diff = { requests: null };
      for (const k of ['input', 'output', 'cacheRead', 'cacheWrite', 'write5m', 'write1h', 'writeUnsplit']) diff[k] = Math.max(0, cs[k] - seen[k]);
      L.push(usageRow(`${model} (cost-state)`, model, cs));
      L.push(usageRow(`${model} (разница)`, model, diff));
      residuals.push([model, cs]);
    }
    const all2 = sumCost(residuals);
    L.push('', `**Оценка по cost-state, всего: $${all2.total.toFixed(4)}**${all2.unknown ? ' + модели без цены' : ''}. Для справки: собственная оценка Claude Code — $${(costState.totalCostUSD ?? 0).toFixed(4)}.`, '');
  }

  L.push('## Топ-3 самых дорогих запроса', '', '| # | Оценка | Модель | Источник | Время | Промпт (первые 80 символов) |', '|---:|---:|---|---|---|---|');
  const ranked = all
    .map((r) => ({ ...r, usd: cost(r.model, r.usage) }))
    .filter((r) => r.usd != null)
    .sort((a, b) => b.usd - a.usd)
    .slice(0, 3);
  ranked.forEach((r, i) => {
    const p = (r.prompt || '—').replace(/\|/g, '\\|');
    L.push(`| ${i + 1} | ${usd(r.usd)} | ${r.model} | ${r.source} | ${r.timestamp} | ${p} |`);
  });
  L.push('');

  L.push('## Допущения', '');
  L.push(`- Цены за 1M токенов (вход/выход): ${PRICES.map((p) => `${p.name} $${p.in}/$${p.out}`).join(', ')}. Модели вне таблицы — «нет цены», их токены считаются, в сумму $ не входят.`);
  L.push(`- Чтение из кеша = ${CACHE_READ_MULT} × цена входа.`);
  L.push(`- **Допущение:** запись в кеш = ${CACHE_WRITE_5M} × цена входа для TTL 5 мин (ephemeral_5m), ${CACHE_WRITE_1H} × для TTL 1 ч (ephemeral_1h).`);
  if (anyUnsplit) L.push('- Часть записи в кеш пришла без разбивки 5m/1h — посчитана по ставке 5m.');
  L.push('- Доля input из кеша = cache read / (input + cache read + cache write).');
  L.push('- Запрос = уникальный requestId; из повторяющихся записей берётся та, где output_tokens максимален.');
  L.push('- Промпт запроса — последний человеческий промпт перед ним; для субагента — его входной промпт.');
  L.push('');
  return L.join('\n');
}

async function main() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  const input = JSON.parse(raw || '{}');
  const { session_id: sessionId, transcript_path: transcriptPath } = input;
  if (!sessionId || !transcriptPath) return;

  const entries = readJsonl(transcriptPath);
  const subagents = loadSubagents(transcriptPath, sessionId);
  const report = buildReport({ sessionId, transcriptPath, entries, subagents });

  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const outDir = join(root, 'reports', 'ws2');
  mkdirSync(outDir, { recursive: true });
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  writeFileSync(join(outDir, `${date}-${sessionId}.md`), report);
}

// Хук не должен ломать завершение сессии
main().catch((err) => {
  process.stderr.write(`usage-report: ${err?.stack ?? err}\n`);
}).finally(() => process.exit(0));
