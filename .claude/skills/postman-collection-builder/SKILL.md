---
name: postman-collection-builder
description: Строит ОДНУ Postman-коллекцию и её environment из файлов API-кейсов (test-cases/api, test-cases/gates) через Postman MCP, останавливается на ревью. Не запускает коллекцию, не правит и не удаляет существующие коллекции, не пишет и не проверяет кейсы.
argument-hint: '{"key": "SKY-2", "title": "...", "files": ["test-cases/gates/API-OPR-001.md"], "collection_name": "SKY-2 · API", "base_url": "https://skypermit.vercel.app/api/v1", "workspace_id": "46c12c46-c3bf-4357-939c-a90e69d5df34"}'
model: sonnet
context: fork
agent: general-purpose
allowed-tools:
  - Read(test-cases/api/**)
  - Read(test-cases/gates/**)
  - Read(../skypermit/public/openapi.yaml)
  - Grep(test-cases/**)
  - mcp__postman__getCollections
  - mcp__postman__getEnvironments
  - mcp__postman__createCollection
  - mcp__postman__createEnvironment
  - mcp__postman__getCollection
  - mcp__postman__getEnvironment
---

# Сборка Postman-коллекции из API-кейсов

Вход:

$ARGUMENTS

JSON-объект. Обязательные: `key` (ключ Jira), `files`. Значения по умолчанию:
`collection_name` = `<key> · API`, `base_url` = `https://skypermit.vercel.app/api/v1`,
`workspace_id` = `46c12c46-c3bf-4357-939c-a90e69d5df34` (workspace «SkyPermit»).
Если `key` или `files` нет — ничего не делать и вернуть
`{"status": "error", "reason": "<чего не хватает>"}`.

## Жёсткие правила

- **Строим, не запускаем.** Не слать запросы в приложение, не вызывать Postman CLI.
  Создание коллекции и environment — единственная запись.
- **Только инструменты из `allowed-tools`.** Существующие коллекции и environment
  не обновлять, не заменять, не удалять. Если коллекция с именем `collection_name`
  в workspace уже есть — ничего не создавать и вернуть
  `{"status": "exists", "collection_id": "<uid>", "collection_name": "<имя>"}`.
- **Кейсы — это спецификация.** Каждый запрос и ассерт прослеживается до кейса и до
  `openapi.yaml`. Не добавлять кейсы, не выкидывать проверки, которые кейс называет,
  не выдумывать эндпоинты, поля и коды ответа. Если в «Expected result» написано
  «Не определено — OQ-NN», или кейс называет эндпоинт/поле, которых нет в `openapi.yaml`,
  кейс **пропускается** с причиной (со ссылкой на OQ-NN, если дело в нём). Обходных
  путей не искать и код ответа по аналогии с другими эндпоинтами не брать.
- **Секреты только в environment.** Пароли, токены, ключи API и всё из
  `OperatorSession`/`ReviewerHeader` — переменные environment с `type: "secret"` и
  пустым значением. В JSON коллекции (тела, заголовки, скрипты) и в collection variables
  их нет. Одноразовый сгенерированный секрет сохраняется через `pm.environment.set`,
  не через `pm.collectionVariables.set`.

## Что прочитать

1. `../skypermit/public/openapi.yaml`: пути, схемы запросов (обязательные поля),
   коды ответов, `GateFailure`, схемы безопасности. Это источник эндпоинтов; префикс
   `/api/v1` в кейсах соответствует `{{baseUrl}}`.
2. Каждый файл из `files` — **один кейс на файл**. Первая строка: `# <ID>: <заголовок>`
   (ID вида `API-OPR-NNN`). Дальше список полей (`ID`, `Doc ref`, `Role(s)`) и разделы
   `## Preconditions`, `## Steps`, `## Expected result`, `## Rationale`, `## Test data`,
   `## Status`. Если первой строки в таком формате нет — кейс пропускается.

Откуда что брать:

| Что нужно | Раздел |
|---|---|
| запросы (метод + путь) | `Steps` — нумерованные шаги; запросы предусловий — из `Preconditions` |
| значения полей тела | `Test data` (таблица), времена заданы относительно `T` |
| ожидаемый статус, поля ответа, состояние после | `Expected result` |
| ссылки OQ-NN | `Expected result`, `Preconditions`, `Rationale` |

`Rationale` объясняет тайминг и границы, но ассертов не добавляет. Что именно проверять,
определяет только `Expected result`.

## Факты о SkyPermit, которые запросы обязаны соблюдать

- Вызовы оператора опираются на session cookie, которую ставят `POST /operators`
  (регистрация) или `POST /auth/login`; cookie jar прогона переносит её дальше.
  `X-Reviewer-Id` в них не шлётся.
- Вызовы ревьюера шлют `X-Reviewer-Id: {{reviewerId}}` и больше ничего для авторизации.
  `reviewerId` — переменная environment.
- `operator_id` не отправляется — его выводит сервер.
- Новый оператор всегда `L1`. Данные, которые должны пройти ранние гейты
  (`PILOT → AIRCRAFT → ZONE → TIME_WINDOW`), обязаны подходить под `L1`. Если
  предусловия кейса через API выполнить нельзя — пропустить кейс с причиной.
- Время — UTC ISO-строки, считаются в pre-request скрипте относительно `Date.now()`,
  жёстких дат нет. Если кейс требует «`submit` не раньше `T`» или «DRAFT менее чем за
  минуту до `T`» (как `API-OPR-001…003`), DRAFT создаётся в самом кейсе непосредственно
  перед `submit`, а `window_start` считается от `Date.now()` в pre-request запроса
  создания DRAFT. Так `submit` всегда идёт не раньше момента создания.
- Уникальные поля (`email`, `national_id`, `serial_number`) генерируются на каждый
  прогон: `Date.now()` плюс случайный суффикс.

## Структура

- Environment `<collection_name> env`: `baseUrl` = `base_url` (`default`) и каждый
  секрет, на который ссылаются запросы (`secret`, пустое значение, если его не
  генерирует скрипт). `reviewerId` (`default`, значение `qa-reviewer`) — только если
  какой-то запрос его использует.
- Коллекция `collection_name`. В описании: `key`, `title`, исходные файлы,
  `openapi.yaml` и предупреждение, что прогон против развёрнутого URL оставляет
  постоянные данные (API удаления нет).
- Папка `00 Setup`: общие предусловия (регистрация оператора, пилот, aircraft…).
  Имена запросов начинаются с `SETUP: `. Каждый запрос всё равно проверяет свой статус
  и сохраняет ID, нужные кейсам.
- Дальше **по одной папке на файл кейса** с именем `<ID>: <заголовок>` (как первая
  строка файла), в порядке `files`. Внутри — запросы этого кейса, включая те, что
  делают его предусловия на лету (например, создание DRAFT). **Каждый запрос кейса
  называется `<ID>: <короткое действие>`.** По этому префиксу `postman-cli-run`
  сопоставляет результаты с кейсами: не опускать его и не ставить два ID в одно имя.
- Все URL — `{{baseUrl}}/<path>`. ID между запросами передаются через collection
  variables (только несекретные).

## Тесты в каждом запросе

В каждом запросе есть событие `test`. Что в нём — определяется кейсом:

- **Expected result задаёт код ответа** — точный ассерт:

```js
pm.test('Status <код>', () => pm.response.to.have.status(<код>));
```

- **Код не определён** (как OQ-07 в `API-OPR-001…003`: код и тело `submit` при провале
  гейта не заданы) — только проверка «не 5xx» с комментарием, а результат кейс
  проверяет по тому запросу, который указан в `Expected result` (например, по `GET`):

```js
// код не определён — OQ-07
pm.test('Не 5xx (код не определён — OQ-07)', () => pm.expect(pm.response.code).to.be.below(500));
```

  Конкретный код (200/201/422) в таком запросе не ассертить и по аналогии не брать.
- **Запрос ожидает `422`** — к статусу добавляются все три проверки тела со значениями
  из кейса:

```js
const b = pm.response.json();
pm.test('failing_gate = <GATE>', () => pm.expect(b.failing_gate).to.eql('<GATE>'));
pm.test('rule_reference = <ref>', () => pm.expect(b.rule_reference).to.eql('<ref>'));
pm.test('message — непустая строка', () => {
  pm.expect(b.message).to.be.a('string');
  pm.expect(b.message.trim()).to.not.be.empty;
});
```

- **Кейс проверяет состояние по `GET`** (как `API-OPR-001…003`): ассерт статуса `GET`,
  затем по одному `pm.test` на каждое поле из `Expected result` (`state`,
  `failing_gate`, `rule_reference`…), с точными значениями из кейса. `message` в
  `GET` заявки нет — его не проверять.

Любую другую проверку, которую называет `Expected result` (поля ответа, состояние
после вызова), добавлять отдельным `pm.test`, названным по тому, что проверяется.
Текст `message` не проверять: он для людей и может меняться.

## Создание

1. `getCollections` и `getEnvironments` для workspace. Применить правило «exists».
2. `createEnvironment`, затем `createCollection` со всем деревом item за один вызов.
3. **Обязательно `getCollection`** по новому uid и сверить: число папок и запросов
   совпадает с построенным; у **каждого** запроса непустой `url.raw`, начинающийся с
   `{{baseUrl}}`; у каждого есть событие `test`. (В предыдущем прогоне
   `createCollection` потерял все URL — это нужно ловить здесь.) Любое расхождение
   записать в `errors` и не называть сборку успешной.

## Вернуть и остановиться

Один блок `json` и ничего больше:

```json
{
  "status": "created",
  "collection": {"id": "<uid>", "name": "<collection_name>"},
  "environment": {"id": "<uid>", "name": "<имя env>", "variables": [{"key": "baseUrl", "type": "default"}]},
  "requests": [
    {"folder": "00 Setup", "name": "SETUP: Регистрация оператора", "method": "POST", "path": "/operators", "case_id": null,
     "assertions": ["Status 201"]},
    {"folder": "API-OPR-001: <заголовок>", "name": "API-OPR-001: Submit", "method": "POST", "path": "/flight-requests/{{fr_id}}/submit", "case_id": "API-OPR-001",
     "assertions": ["Не 5xx (код не определён — OQ-07)"]},
    {"folder": "API-OPR-001: <заголовок>", "name": "API-OPR-001: Получить заявку", "method": "GET", "path": "/flight-requests/{{fr_id}}", "case_id": "API-OPR-001",
     "assertions": ["Status 200", "state = REJECTED", "failing_gate = TIME_WINDOW", "rule_reference = TSD-4 §2.1"]}
  ],
  "skipped": [{"case_id": "API-OPR-004", "reason": "ожидаемый результат не определён — OQ-11"}],
  "run_hint": "postman collection run <collection uid> -e <environment uid>",
  "errors": []
}
```

Это для ревью. Не предлагать запуск и не запускать.
