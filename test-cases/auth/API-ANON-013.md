# API-ANON-013: Вход с незарегистрированным email

- **ID:** API-ANON-013
- **Doc ref:** `03-api-contract.md` §Authentication & authorisation, §Error semantics; OQ-19
- **Role(s):** Аноним (входящий)

## Preconditions
- Оператора с `email` из Test data не существует.
- У клиента нет session cookie.

## Steps
1. `POST /api/v1/auth/login` с телом из Test data.

## Expected result
Не определено — OQ-19: ответ на неуспешный вход не задан, как и то, должен ли он совпадать с ответом на неверный пароль (API-ANON-011).

## Rationale
Отдельный класс от неверного пароля: учётной записи нет вовсе. Совпадение ответов важно, чтобы по ним нельзя было перебирать зарегистрированные email, но требования об этом в документации нет. Код, не документация: `app/api/v1/auth/login/route.ts` — тот же `401` «Invalid email or password.». Тест-план: `skypermit-test-plan.md` S1.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| `email` | `qa.login.absent.<RUN>@example.com` | Уникален в прогоне — гарантированно не зарегистрирован |
| `password` | `Qa-Passw0rd-2026` | Валидный по форме пароль — отказ может прийти только из-за email |
| `<RUN>` | UTC-время запуска, `yyyyMMddHHmmss` | Уникальный суффикс прогона |

## Status
Blocked — OQ-19
