# API-ANON-007: Регистрация без email

- **ID:** API-ANON-007
- **Doc ref:** `03-api-contract.md` §Authentication & authorisation; `04-frontend-spec.md` §Operator portal; OQ-17
- **Role(s):** Аноним

## Preconditions
- У клиента нет session cookie.

## Steps
1. `POST /api/v1/operators` с телом из Test data без поля `email`.

## Expected result
Не определено — OQ-17: обязательные поля регистрации и ответ на их отсутствие в документации не заданы.

## Rationale
`email` — логин оператора (`POST /auth/login` — «email + password»), но обязательность поля при регистрации явно не описана. Код, не документация: `app/api/v1/operators/route.ts` — `400` «email is required». Тест-план: `skypermit-test-plan.md` S2.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| `legal_name` | `ТОВ «QA Реєстрація»` | Валидное значение |
| `national_id` | `QA-REG-<RUN>` | Уникален в прогоне |
| `email` | (поле отсутствует) | Проверяемое отсутствие |
| `password` | `Qa-Passw0rd-2026` | Валидное значение |

## Status
Blocked — OQ-17
