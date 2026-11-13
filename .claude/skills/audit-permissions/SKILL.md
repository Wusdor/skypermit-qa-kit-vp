---
name: audit-permissions
description: Аудит прав Claude Code по settings всех уровней и frontmatter скилов и агентов; таблица рисков, без исправлений.
disable-model-invocation: true
context: fork
agent: permissions-auditor
allowed-tools: Read, Glob, Grep
---

# Аудит прав Claude Code

Прочитай конфигурацию, оцени каждое правило по каталогу ниже и верни отчёт
по форме из шага 4. Ничего не изменяй.

Права выдают не только settings: `allowed-tools` скила заранее одобряет
инструменты, пока скил активен; `tools` и `permissionMode` агента задают его
права; `hooks` в frontmatter запускают команды. Поэтому frontmatter
проверяется наравне с settings.

## Шаг 1. Источники

Домашний каталог определи по рабочей директории: `/Users/<user>` (macOS)
или `/home/<user>` (Linux). Read и Glob работают с абсолютными путями —
`~` не раскрывается. Если домашний каталог определить не удалось, уровень
user попадает в «Не удалось проверить».

| Уровень | Что читать |
|---|---|
| managed | macOS: `/Library/Application Support/ClaudeCode/managed-settings.json` и `…/managed-settings.d/*.json`; Linux/WSL: `/etc/claude-code/managed-settings.json` и `managed-settings.d/*.json`; Windows: `C:\Program Files\ClaudeCode\managed-settings.json`. Читай только для своей ОС. |
| user | `<home>/.claude/settings.json`; `<home>/.claude/skills/*/SKILL.md`; `<home>/.claude/agents/*.md`; `<home>/.claude.json` — только имена в `mcpServers` и `projects.*.mcpServers` |
| project | `.claude/settings.json`; `.claude/skills/*/SKILL.md`; `.claude/agents/*.md`; `.mcp.json` — только имена серверов |
| local | `.claude/settings.local.json` |
| hook | каждый скрипт, на который ссылается `command` хука из любого источника выше (`$CLAUDE_PROJECT_DIR` = корень репозитория) |

Если Glob недоступен, читай известные пути через Read, а невозможность
перечислить каталог (`skills/*`, `agents/*`, `managed-settings.d/*`) запиши
в «Не удалось проверить». Отсутствующий файл — не находка, его отметь в
итоговой строке.

Что выписывать:
- из settings: `permissions.allow`, `permissions.ask`, `permissions.deny`,
  `permissions.defaultMode` (и устаревший корневой `defaultMode`),
  `permissions.additionalDirectories`, `permissions.disableBypassPermissionsMode`,
  `permissions.disableAutoMode`, `hooks`, `enableAllProjectMcpServers`,
  `enabledMcpjsonServers`;
- из SKILL.md: `allowed-tools`, `disable-model-invocation`, `context`,
  `agent`, `hooks`, а также строки `` !`…` `` в теле (они выполняются в shell
  при вызове скила);
- из агентов: `tools` (отсутствие = наследует все инструменты),
  `disallowedTools`, `permissionMode`, `hooks`, `mcpServers`, `skills`.

Git-трекинг `.claude/settings.local.json` через Bash не проверить. Прочитай
`.gitignore`: если файл там не исключён — это находка; если исключён —
запиши в «Не удалось проверить», что `git ls-files` надо выполнить вручную.

### Семантика правил (без неё аудит будет ложным)

- Порядок: deny → ask → allow, первое совпадение решает. Более точный allow
  НЕ перебивает более широкий deny. Deny с любого уровня блокует allow с
  любого другого.
- Bash: `*` совпадает с любым текстом, включая пробелы; до первой `*` —
  буквально. `:*` равно ` *` только в конце. Составные команды (`&&`, `||`,
  `;`, `|`) проверяются по частям.
- Пути Read/Edit — синтаксис gitignore: `*` в пределах одной папки, `**` на
  любую глубину. `//` — корень диска, `~/` — домашний каталог, один `/` в
  начале — от папки файла настроек (в user settings это `~/.claude/`),
  `./` или без префикса — текущая папка.
- allow `Edit(путь)` даёт и чтение; deny `Read(путь)` блокирует и Edit/Write.
- Deny на `Read(...)` не действует на Bash: `cat`, `head`, `less` читают
  тот же файл в обход.
- Хук: exit 0 — успех; exit 2 — блокировка (для PreToolUse инструмент не
  выполняется); любой другой ненулевой код — неблокирующая ошибка, вызов
  продолжается (fail-open).

## Шаг 2. Обязательные проверки

Каждая проверка выполняется на всех уровнях и во всех frontmatter.

1. **Опасный режим.** `defaultMode` или `permissionMode` равен `auto` или
   `bypassPermissions` — critical. Отдельной строкой: в managed нет
   `disableBypassPermissionsMode: "disable"` (или managed-файла нет вовсе) —
   low для личной машины, medium, если в репозитории есть общий
   `.claude/settings.json`.
2. **allow на `git push`.** Любая форма, которая пропускает `git push` без
   вопроса: `Bash`, `Bash(*)`, `Bash(git *)`, `Bash(git:*)`,
   `Bash(git push*)`, `Bash(git push:*)`, и то же в `allowed-tools` скила
   или `tools` агента — high. Поясни, что push публикует наружу и
   необратим (force-push переписывает историю у всех).
3. **Обход deny на веб (W1).** Есть deny на `WebFetch` и/или `WebSearch`, но
   нет deny на MCP-инструменты с выходом в сеть — high. Кандидаты: серверы и
   инструменты, в имени которых `fetch`, `browser`, `chrome`, `playwright`,
   `puppeteer`, `http`, `search`, `web`, а также серверы с запуском процессов
   (`desktop-commander`: `start_process` → `curl`). Список серверов бери из
   шага 1 и из уже встречавшихся в правилах `mcp__<server>…`. Сервер с
   неизвестными возможностями — «потребует проверки». Так же оцени allow на
   `Bash(curl *)`, `Bash(wget *)` при наличии deny на WebFetch — это тот же
   обход.
4. **`permissionMode: acceptEdits` без guard-хука.** У агента (или в
   settings через `defaultMode`) стоит `acceptEdits`, и ни в его frontmatter,
   ни в settings нет хука `PreToolUse` с matcher, покрывающим `Write` и
   `Edit` — high. Хук есть, но matcher покрывает не все пишущие инструменты
   (`Write`, `Edit`, `MultiEdit`, `NotebookEdit`) или хук не прошёл
   проверку 5 — medium.
5. **Fail-open хуки.** Прочитай скрипт каждого хука. Находка, если запрет
   выражен кодом, отличным от 2, или скрипт может упасть до `exit 2`:
   `process.exit(1)`, `exit 1`, `sys.exit(1)`; необработанное исключение
   (node и python завершаются с кодом 1); `JSON.parse` / `json.load` stdin
   без try/catch; обращение к полю без проверки на `undefined`;
   интерпретатор, которого может не быть (exit 127); сетевой вызов или долгая
   операция, упирающиеся в таймаут. Для хука-guard (PreToolUse, PermissionRequest
   и другие, которые должны запрещать) — high, для информационного (логи,
   отчёты, Stop/SessionEnd) — low. Если скрипт не найден по пути из
   `command`, хук всегда fail-open — high для guard. Укажи строку скрипта.

## Шаг 3. Каталог рисков

### critical — агент может сделать что угодно или слить данные
- allow `Bash` или `Bash(*)`.
- allow интерпретаторов и раннеров: `Bash(python *)`, `Bash(python3 *)`,
  `Bash(node *)`, `Bash(npx *)`, `Bash(bash *)`, `Bash(sh *)`, `Bash(zsh *)`,
  `Bash(eval *)`, `Bash(docker run *)`, `Bash(docker exec *)`. Точечный
  allow конкретного скрипта (`Bash(node scripts/x.mjs:*)`) — не critical,
  но проверь, что скрипт в репозитории и что `:*` не даёт подставить
  `-e`/`--eval`.
- allow сетевых утилит: `Bash(curl *)`, `Bash(wget *)`, `Bash(nc *)`,
  `Bash(ssh *)`, `Bash(scp *)`, `Bash(rsync *)`.
- allow `Bash(sudo *)`, `Bash(su *)`.
- allow Edit/Read на весь диск или домашний каталог: `Edit(//**)`,
  `Edit(~/**)`, `Read(//**)`, `Read(~/**)`.
- `additionalDirectories`, содержащий `/`, `~` или домашний каталог.
- Агент без `tools` (наследует всё) с `permissionMode` `bypassPermissions`
  или `auto`.

### high — разрушительные, необратимые или читающие всё
- allow `Bash(rm *)`, `Bash(git push *)` (см. проверку 2),
  `Bash(git reset *)`, `Bash(git clean *)`, `Bash(git checkout *)`,
  `Bash(chmod *)`, `Bash(chown *)`, `Bash(kubectl *)`, `Bash(terraform *)`,
  `Bash(aws *)`, `Bash(gcloud *)`, `Bash(az *)`, `Bash(npm publish *)`.
- allow утилит чтения файлов: `Bash(cat *)`, `Bash(head *)`,
  `Bash(tail *)`, `Bash(less *)`, `Bash(more *)`, `Bash(strings *)`,
  `Bash(xxd *)`, `Bash(base64 *)` — читают любой файл без вопроса в обход
  deny на `Read(...)`. Это относится и к `allowed-tools` скилов.
- allow с `*` перед подкомандой или голой программой: `Bash(git *)`,
  `Bash(npm *)`, `Bash(docker *)`.
- allow `WebFetch` (голое имя) или `WebFetch(domain:*)`.
- allow всего MCP-сервера с инструментами записи или выхода в сеть:
  `mcp__<server>`, `mcp__<server>__*`.
- Нет deny на секреты: `.env`, `.env.*`, `secrets/**`, `~/.ssh/**`,
  `~/.aws/**`, `~/.config/gcloud/**`, `*.pem`, `*.key`.
- Комбинация «чтение секретов разрешено + любой сетевой выход разрешён».
- Скил без `disable-model-invocation: true` с широкими `allowed-tools`
  (Bash с `*`, Edit без пути, MCP-сервер целиком): модель может вызвать его
  сама, и права выдаются без участия человека. Если такой скил ещё и
  полагается на `context: fork` / `agent:` для ограничения инструментов —
  отметь, что при вызове моделью через Skill tool fork и `agent:` могут
  игнорироваться (anthropics/claude-code#17283), и ограничение не действует.
- `.claude/settings.local.json` не исключён в `.gitignore`.

### medium — правило не делает того, что кажется
- Путь с одним `/`, похожий на абсолютный: `Read(/Users/...)`,
  `Read(/etc/...)` — это не корень диска, нужно `//`.
- `/`-правило в user settings вида `Read(/secrets/**)` — защищает
  `~/.claude/secrets`, а не папку проекта.
- Path-правила для `Write(...)`, `Glob(...)`, `NotebookEdit(...)`,
  `MultiEdit(...)` — не применяются, нужны `Edit(...)` / `Read(...)`.
- `Bash(command:...)`; `:*` не в конце (`Bash(git:* push)`) — правило мёртвое.
- Неякорные allow-глобы `*`, `B*`, `mcp__*` — игнорируются.
- `Bash(ls*)`, `Bash(cat*)` без пробела — шире, чем кажется (`lsof`, `catdoc`).
- Deny на Bash как «стена»: `deny Bash(git push *)` не останавливает
  `git -C . push`, `/usr/bin/git push`, `sh -c '…'`. Если sandbox не включён
  (`sandbox.enabled` не `true`) — medium, иначе low.
- allow-исключение, которое «перебивает» deny (deny `Bash(aws *)` + allow
  `Bash(aws s3 ls)`) — allow никогда не сработает.
- Строки `` !`…` `` в теле скила, которые выполняют команды, не покрытые
  его `allowed-tools`.

### low — гигиена
- Много точечных правил в `.claude/settings.local.json` от «don't ask again».
- Дубликаты между уровнями.
- `allowed-tools` скила шире, чем нужно по его телу.
- Информационные хуки, которые fail-open (проверка 5).

## Шаг 4. Отчёт

Первая строка — одно предложение: сколько файлов прочитано (и сколько
отсутствует), сколько находок по рискам.

Затем одна таблица, отсортированная critical → high → medium → low:

| Уровень | Путь | Правило | Риск | Почему | Как исправить |
|---|---|---|---|---|---|

- **Уровень** — managed / user / project / local / skill / agent / hook.
- **Путь** — файл и, где есть, ключ или строка (`.claude/settings.json` →
  `permissions.allow`, `.claude/hooks/x.mjs:12`).
- **Правило** — дословно, как в файле.
- **Почему** — одно предложение с конкретной командой или путём, который
  правило пропустит (или не остановит).
- **Как исправить** — готовое правило или фрагмент frontmatter/кода.

После таблицы:
- **Чего не хватает** — рекомендуемые deny-правила и хуки, которых нет,
  одним JSON-фрагментом для `permissions`.
- **Не удалось проверить** — отсутствующие каталоги, пути без Glob,
  git-трекинг, неизвестные MCP-серверы.
- **Что в порядке** — одно-два предложения.

Ничего не исправляй и не предлагай выполнить исправления сейчас — только
отчёт.
