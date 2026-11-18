#!/usr/bin/env node
// PreToolUse-хук для mcp__testomatio__.*: деструктивные команды Testomat — только
// с подтверждением человека.
// stdin: { tool_name, tool_input: { command, test_id, suite_id, ... }, ... }
// - command = delete | attachments_delete | unshare → permissionDecision "ask";
// - любая другая команда → exit 0 без вывода;
// - инструменты без параметра command (system_ping, tql_help, project_info) — только
//   чтение: нет command → exit 0 без вывода;
// - stdin не JSON или command не определить у остальных инструментов → "deny" (fail-closed).
// Хук не ходит в сеть и ничего не пишет на диск.

import { readFileSync } from 'node:fs';

const DESTRUCTIVE = new Set(['delete', 'attachments_delete', 'unshare']);
const READ_ONLY_NO_COMMAND = ['system_ping', 'tql_help', 'project_info'];

function decide(decision, reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: decision,
        permissionDecisionReason: reason,
      },
    }) + '\n',
  );
  process.exit(0);
}

try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const command = input?.tool_input?.command;
  if (typeof command !== 'string' || !command) {
    const toolName = String(input?.tool_name ?? '');
    if (READ_ONLY_NO_COMMAND.some((name) => toolName.endsWith(name))) process.exit(0);
    throw new Error('не удалось определить tool_input.command');
  }

  if (DESTRUCTIVE.has(command)) {
    const t = input.tool_input;
    const id = t.test_id ?? t.suite_id ?? t.run_id ?? t.testrun_id ?? t.attachment_id ?? t.plan_id;
    const target = id === undefined ? 'объект без указанного id' : `объект ${id}`;
    decide('ask', `Testomat: ${command}, ${target} — удаление только с подтверждения человека`);
  }
} catch (err) {
  decide('deny', `testomat-guard: ошибка, вызов заблокирован: ${err.message}`);
}
