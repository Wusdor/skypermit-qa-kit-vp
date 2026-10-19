# API-ANON-014: Тело входа — невалидный JSON

- **ID:** API-ANON-014
- **Doc ref:** `03-api-contract.md` §Error semantics (`400` — «Malformed request body»)
- **Role(s):** Аноним

## Preconditions
- У клиента нет session cookie.

## Steps
1. `POST /api/v1/auth/login` с заголовком `Content-Type: application/json` и телом из Test data.

## Expected result
`400`, в теле — описание ошибки валидации («validation detail»).

## Rationale
Синтаксически испорченное тело — однозначный случай «malformed request body» из таблицы ошибок, не зависящий от OQ-19. Тест-план: `skypermit-test-plan.md` S6.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| Тело запроса | `{"email": "qa.login.<RUN>@example.com", "password": "Qa-Passw0rd-2026"` | Нет закрывающей скобки — невалидный JSON |
| `<RUN>` | UTC-время запуска, `yyyyMMddHHmmss` | Уникальный суффикс прогона |

## Status
Untested
