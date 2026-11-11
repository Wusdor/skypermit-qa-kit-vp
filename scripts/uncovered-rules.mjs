#!/usr/bin/env node
// Непокрытые бизнес-правила SkyPermit: rule_reference из 06-business-rules.md §6
// (с учётом 07-clarifications.md), для которых в test-cases/ нет кейса.
//
// Использование: node scripts/uncovered-rules.mjs [max-rules] [gate]
//   max-rules — сколько дыр показать (по умолчанию 5; `all` или 0 — все)
//   gate      — PILOT | AIRCRAFT | ZONE | TIME_WINDOW | REGISTRATION (регистр не важен)
//
// Правило покрыто, если в разделе `## Expected result` какого-либо кейса есть
// `failing_gate: <GATE>` и `rule_reference: "<ref>"` (для REGISTRATION — только
// rule_reference). Ключ — пара (gate, ref): `ZC-2026.1 §2` общая у AIRCRAFT и ZONE.
//
// Только чтение. Пути: QA_KIT_ROOT (корень кита), SKYPERMIT_DOCS (папка docs).
// Ошибки печатаются в stdout с кодом 0: вывод вставляется в SKILL.md через
// dynamic context injection, и сообщение должно дойти до модели.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GATES = ['PILOT', 'AIRCRAFT', 'ZONE', 'TIME_WINDOW', 'REGISTRATION'];
const DEFAULT_MAX = 5;

const ROOT = process.env.QA_KIT_ROOT || fileURLToPath(new URL('..', import.meta.url));
const DOCS = process.env.SKYPERMIT_DOCS || join(ROOT, '..', 'skypermit', 'docs');

function fail(msg) {
  console.log(`ОШИБКА uncovered-rules: ${msg}`);
  process.exit(0);
}

function parseArgs(argv) {
  let max = DEFAULT_MAX;
  let gate = null;
  for (const a of argv.flatMap((s) => s.split(/\s+/)).filter(Boolean)) {
    if (/^\d+$/.test(a)) max = Number(a) === 0 ? Infinity : Number(a);
    else if (a.toLowerCase() === 'all') max = Infinity;
    else if (GATES.includes(a.toUpperCase())) gate = a.toUpperCase();
    else fail(`неизвестный аргумент «${a}». Ожидается [max-rules: число | all] [gate: ${GATES.join(' | ')}].`);
  }
  return { max, gate };
}

function read(path) {
  if (!existsSync(path)) fail(`файл не найден: ${path}`);
  return readFileSync(path, 'utf8');
}

const norm = (s) => s.replace(/ /g, ' ').replace(/`/g, '').replace(/\s+/g, ' ').trim();
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// `OH-1 §2.1` не должен совпадать с `OH-1 §2.10` или `OH-1 §2.1.3`
const refRe = (ref) => new RegExp(`${escapeRe(norm(ref)).replace(/ /g, '\\s*')}(?![\\d]|\\.\\d)`);

// Секция Markdown от заголовка, совпавшего с re, до следующего заголовка того же или более высокого уровня.
function section(text, re) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => re.test(l));
  if (start === -1) return '';
  const level = lines[start].match(/^#+/)[0].length;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(#+)\s/);
    if (m && m[1].length <= level) { end = i; break; }
  }
  return lines.slice(start, end).join('\n');
}

const cells = (line) => line.split('|').slice(1, -1).map((c) => c.trim());

// Таблицы секции: [{ header: [...], rows: [[...], ...] }]
function tables(text) {
  const out = [];
  let cur = null;
  for (const line of text.split('\n')) {
    if (!line.trim().startsWith('|')) { cur = null; continue; }
    const c = cells(line.trim());
    if (c.every((x) => /^:?-+:?$/.test(x))) continue;
    if (!cur) { cur = { header: c, rows: [] }; out.push(cur); } else cur.rows.push(c);
  }
  return out;
}

// --- 06 §6: правила ---------------------------------------------------------

function parseRules(br) {
  const sec = section(br, /^## 6\.\s/);
  if (!sec) fail('в 06-business-rules.md не найден раздел «## 6.»');
  const t = tables(sec).find((x) => x.header.some((h) => /rule_reference/.test(h)));
  if (!t) fail('в 06 §6 не найдена таблица с колонкой rule_reference');
  return t.rows.map(([gateCell, condition, refCell]) => {
    const ref = (refCell.match(/`([^`]+)`/) || [])[1];
    const note = (refCell.match(/\*\((.*)\)\*/) || [])[1] || '';
    const gate = /registration/i.test(gateCell) ? 'REGISTRATION' : norm(gateCell);
    return {
      gate,
      ref: ref ? norm(ref) : norm(refCell),
      condition: norm(condition),
      notes: note ? [norm(note)] : [],
      citationUnconfirmed: /not (yet )?fully confirmed/i.test(note),
    };
  });
}

// --- 07: переназначение гейтов (07 важнее 06) -------------------------------

function applyClarifications(rules, cl) {
  let item = '?';
  const firstWord = (s) => (norm(s).toLowerCase().match(/[a-z]{3,}/) || [''])[0];
  for (const line of cl.split('\n')) {
    const h = line.match(/^## (\d+)\./);
    if (h) item = h[1];
    for (const m of line.matchAll(/\*\*([^*]+?)\s*→\s*`([A-Z_]+)`/g)) {
      const [, cond, gate] = m;
      if (!GATES.includes(gate)) continue;
      const key = firstWord(cond);
      for (const r of rules) {
        if (r.gate !== 'REGISTRATION' && firstWord(r.condition) === key && r.gate !== gate) {
          r.notes.push(`gate по 07 п.${item}: ${gate} (в 06 §6 — ${r.gate})`);
          r.gate = gate;
        }
      }
    }
  }
}

// --- 06 §1: текст правила ---------------------------------------------------

function ruleText(br, rule) {
  const gate = rule.gate === 'REGISTRATION' ? 'AIRCRAFT' : rule.gate;
  const sub = section(br, new RegExp(`^### 1\\.\\d+ \`${gate}\``));
  if (!sub) return null;
  const where = `06 ${sub.match(/^### (1\.\d+)/)[1].replace(/^/, '§')}`;
  const re = refRe(rule.ref);
  const condWords = rule.condition.toLowerCase().match(/[a-z]{5,}/g) || [];
  const ts = tables(sub);
  const col = (t, name) => t.header.findIndex((h) => h.toLowerCase() === name);

  let byCond = null;
  const scope = [];
  for (const t of ts) {
    const iRule = col(t, 'rule');
    const iSrc = col(t, 'source');
    if (iSrc === -1) continue;
    for (const row of t.rows) {
      const src = norm(row[iSrc] || '');
      if (iRule !== -1) {
        if (re.test(src)) return { where, text: norm(row[iRule]), source: src };
        const cond = norm(row[0]).toLowerCase();
        if (!byCond && condWords.some((w) => cond.includes(w))) {
          byCond = { where, text: norm(row[iRule]), source: src, byCondition: true };
        }
      } else if (re.test(src)) {
        scope.push(row.slice(0, 2).map(norm).join(' '));
      }
    }
  }
  if (byCond) return { ...byCond, scope };
  return { where, text: null, scope };
}

// --- реестр OQ --------------------------------------------------------------

function openQuestions(reg, ref) {
  const re = refRe(ref);
  const out = [];
  for (const line of reg.split('\n')) {
    if (!/^\|\s*OQ-\d+/.test(line)) continue;
    const c = cells(line);
    const status = norm(c[4] || '');
    if (/^закрыт/i.test(status)) continue;
    if (re.test(norm(c.slice(1, 4).join(' ')))) out.push(`${c[0]} (${status})`);
  }
  return out;
}

// --- покрытие ---------------------------------------------------------------

function caseFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return caseFiles(p);
    return name.endsWith('.md') ? [p] : [];
  });
}

function expectedResults(files) {
  return files.map((f) => {
    const body = section(readFileSync(f, 'utf8'), /^## Expected result\s*$/);
    return { file: f, text: norm(body.replace(/["«»“”]/g, ' ')) };
  });
}

function isCovered(rule, expected) {
  const refR = new RegExp(`rule_reference\\s*[:=]?\\s*${refRe(rule.ref).source}`);
  const gateR = new RegExp(`failing_gate\\s*[:=]?\\s*${rule.gate}\\b`);
  return expected.some(
    (e) => refR.test(e.text) && (rule.gate === 'REGISTRATION' || gateR.test(e.text)),
  );
}

// --- main -------------------------------------------------------------------

const { max, gate } = parseArgs(process.argv.slice(2));
const br = read(join(DOCS, '06-business-rules.md'));
const cl = read(join(DOCS, '07-clarifications.md'));
const reg = read(join(ROOT, 'test-plans', 'open-questions.md'));

const rules = parseRules(br);
applyClarifications(rules, cl);
const inScope = rules
  .filter((r) => !gate || r.gate === gate)
  .sort((a, b) => GATES.indexOf(a.gate) - GATES.indexOf(b.gate));

const expected = expectedResults(caseFiles(join(ROOT, 'test-cases')));
const gaps = inScope.filter((r) => !isCovered(r, expected));
const shown = gaps.slice(0, max);

const maxLabel = max === Infinity ? 'all' : String(max);
console.log(
  `rules_checked: ${inScope.length} · covered: ${inScope.length - gaps.length} · gaps_found: ${gaps.length} · ` +
    `показано: ${shown.length} (max-rules=${maxLabel}, gate=${gate || 'все'})`,
);
if (!shown.length) process.exit(0);

let lastGate = null;
for (const r of shown) {
  if (r.gate !== lastGate) {
    console.log(`\n## ${r.gate}`);
    lastGate = r.gate;
  }
  console.log(`- \`${r.ref}\` — ${r.condition}`);
  const t = ruleText(br, r);
  if (t?.text) {
    const how = t.byCondition ? `, по условию; Source: ${t.source}` : '';
    console.log(`  правило (${t.where}${how}): ${t.text}`);
  } else {
    console.log(`  правило: не найдено в таблицах ${t?.where || '06 §1'} — читай этот раздел`);
  }
  if (t?.scope?.length) console.log(`  применимо к: ${t.scope.join('; ')}`);
  const oq = openQuestions(reg, r.ref);
  const flags = [...r.notes];
  if (r.citationUnconfirmed) flags.push('цитата не подтверждена (05)');
  console.log(`  открытые вопросы: ${oq.length ? oq.join(', ') : '—'} | note: ${flags.length ? flags.join('; ') : '—'}`);
}
