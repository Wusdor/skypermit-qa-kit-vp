#!/usr/bin/env node
// PreToolUse-хук субагента tc-writer (Write|Edit): разрешает запись только туда,
// куда tc-writer пишет по задаче. permissionMode: acceptEdits снимает запросы
// разрешений на всю рабочую директорию — хук сужает это обратно.
// stdin: { tool_name, tool_input: { file_path }, cwd, ... }
// Разрешено:
// - Write нового файла test-cases/<module>/<ID>.md (существующий не перезаписывать);
// - Edit кейса в test-cases/, который не отслеживается git (только что созданный);
// - Edit test-plans/open-questions.md (новый вопрос в реестр).
// Иначе — exit 2: вызов блокируется, stderr уходит субагенту.
// Любая ошибка (битый stdin, сбой git) — тоже exit 2: fail-closed. Exit 1
// неблокирующий, и вызов прошёл бы.

import { readFileSync, existsSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';
import { execFileSync } from 'node:child_process';

function deny(message) {
  process.stderr.write(`tc-writer-guard: ${message}\n`);
  process.exit(2);
}

// git ls-files --error-unmatch завершается с ошибкой, если файл не в индексе.
function isTracked(root, file) {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', '--', file], { cwd: root, stdio: 'ignore' });
    return true;
  } catch (err) {
    if (err.status === 1) return false;
    throw err; // git не запустился или упал иначе — не считаем файл новым
  }
}

try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const root = process.env.CLAUDE_PROJECT_DIR ?? input.cwd;
  const filePath = input.tool_input?.file_path;
  if (!root || !filePath) throw new Error('нет cwd/CLAUDE_PROJECT_DIR или tool_input.file_path');
  const file = resolve(input.cwd ?? root, filePath);
  const rel = relative(root, file).split(sep).join('/');

  const isCase = /^test-cases\/[a-z-]+\/[A-Z]+-[A-Z]+-\d{3}\.md$/.test(rel);
  const allowed =
    (input.tool_name === 'Write' && isCase && !existsSync(file)) ||
    (input.tool_name === 'Edit' && isCase && existsSync(file) && !isTracked(root, file)) ||
    (input.tool_name === 'Edit' && rel === 'test-plans/open-questions.md');

  if (!allowed) {
    deny(
      `${input.tool_name} ${rel} запрещён. Можно: Write нового test-cases/<module>/<ID>.md, ` +
        'Edit неотслеживаемого кейса или test-plans/open-questions.md.',
    );
  }
} catch (err) {
  deny(`ошибка, вызов заблокирован: ${err.message}`);
}
