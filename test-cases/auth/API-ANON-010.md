# API-ANON-010: Успешный вход открывает сессию оператора

- **ID:** API-ANON-010
- **Doc ref:** `03-api-contract.md` §Authentication & authorisation (`POST /auth/login`, `GET /auth/me`)
- **Role(s):** Аноним (входящий) → Оператор

## Preconditions
- Оператор зарегистрирован через `POST /api/v1/operators` с `email = qa.login.<RUN>@example.com`, `password = Qa-Passw0rd-2026` (остальные поля — как в API-ANON-001).
- Шаги выполняются новым клиентом без cookie: регистрация сама открывает сессию (`03-api-contract.md` §Authentication), поэтому клиент регистрации не используется.

## Steps
1. `POST /api/v1/auth/login` с телом из Test data.
2. Тем же клиентом (с полученными cookie) — `GET /api/v1/auth/me`.

## Expected result
`GET /auth/me` возвращает профиль оператора (не `401`), `email` в профиле равен `email` из Test data.

## Rationale
`POST /auth/login` — «Log in with email + password; sets the session cookie»; `GET /auth/me` — «The logged-in operator's profile, or 401». Позитивный класс эквивалентности: верная пара email + password. Код ответа самого `login` в документации не задан (OQ-19), поэтому результат наблюдается через `/auth/me`. Тест-план: `skypermit-test-plan.md` S1.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| `email` | `qa.login.<RUN>@example.com` | Email зарегистрированного в предусловиях оператора |
| `password` | `Qa-Passw0rd-2026` | Пароль, заданный при регистрации |
| `<RUN>` | UTC-время запуска, `yyyyMMddHHmmss` | Уникальный суффикс прогона |

## Status
Untested
