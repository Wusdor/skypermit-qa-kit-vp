#!/usr/bin/env node
// PreToolUse-хук для mcp__testomatio__.*: деструктивные команды Testomat — только
// с подтверждением человека.
// stdin: { tool_name, tool_input: { command, id, ... }, ... }
// - command = delete | attachments_delete | unshare → permissionDecision "ask";
// - любая другая команда → exit 0 без вывода;
// - stdin не JSON или command не определить → permissionDecision "deny" (fail-closed).
// Хук не ходит в сеть и ничего не пишет на диск.

import { readFileSync } from 'node:fs';

const DESTRUCTIVE = new Set(['delete', 'attachments_delete', 'unshare']);

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
  if (typeof command !== 'string' || !command) throw new Error('не удалось определить tool_input.command');

  if (DESTRUCTIVE.has(command)) {
    const id = input.tool_input.id ?? 'без id';
    decide('ask', `Testomat: ${command} для ${id} — удаление только с подтверждения человека`);
  }
} catch (err) {
  decide('deny', `testomat-guard: ошибка, вызов заблокирован: ${err.message}`);
}
