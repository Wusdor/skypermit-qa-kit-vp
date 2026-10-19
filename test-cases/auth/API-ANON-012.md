# API-ANON-012: Вход с неверным паролем не открывает сессию

- **ID:** API-ANON-012
- **Doc ref:** `03-api-contract.md` §Authentication & authorisation (`POST /auth/login`, `GET /auth/me`)
- **Role(s):** Аноним (входящий); Оператор (зарегистрирован в предусловиях)

## Preconditions
- Оператор зарегистрирован через `POST /api/v1/operators` с `email = qa.login.<RUN>@example.com`, `password = Qa-Passw0rd-2026` (остальные поля — как в API-ANON-001).
- Шаги выполняются новым клиентом без cookie: регистрация сама открывает сессию (`03-api-contract.md` §Authentication), поэтому клиент регистрации не используется.

## Steps
1. `POST /api/v1/auth/login` с телом из Test data (ответ не оценивается — см. API-ANON-011).
2. Тем же клиентом — `GET /api/v1/auth/me`.

## Expected result
`GET /auth/me` возвращает `401`.

## Rationale
Определённая часть API-ANON-011: при любом ответе на неуспешный вход сессии быть не должно. `/auth/me` — «The logged-in operator's profile, or `401`»; сессию устанавливает только вход по email + password. Тест-план: `skypermit-test-plan.md` S1, R5.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| `email` | `qa.login.<RUN>@example.com` | Существующий оператор — проверяется только пароль |
| `password` | `Qa-Passw0rd-2027` | Отличается от верного одним символом |
| `<RUN>` | UTC-время запуска, `yyyyMMddHHmmss` | Уникальный суффикс прогона |

## Status
Untested
