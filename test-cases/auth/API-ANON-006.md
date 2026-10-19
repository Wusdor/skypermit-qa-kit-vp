# API-ANON-006: Тело регистрации — невалидный JSON

- **ID:** API-ANON-006
- **Doc ref:** `03-api-contract.md` §Error semantics (`400` — «Malformed request body»)
- **Role(s):** Аноним

## Preconditions
- У клиента нет session cookie.

## Steps
1. `POST /api/v1/operators` с заголовком `Content-Type: application/json` и телом из Test data.

## Expected result
`400`, в теле — описание ошибки валидации («validation detail»).

## Rationale
Синтаксически испорченное тело — однозначный случай «malformed request body» из таблицы ошибок; класс невалидных входных данных, не зависящий от OQ-17. Тест-план: `skypermit-test-plan.md` S6.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| Тело запроса | `{"legal_name": "ТОВ «QA»", "email": "qa.reg.<RUN>@example.com"` | Нет закрывающей скобки — невалидный JSON |

## Status
Untested
