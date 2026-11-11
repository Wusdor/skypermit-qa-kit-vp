# API-ANON-001: Успешная регистрация сразу открывает сессию оператора

- **ID:** API-ANON-001
- **Doc ref:** `03-api-contract.md` §Authentication & authorisation (`POST /operators`, `GET /auth/me`)
- **Role(s):** Аноним (регистрирующийся, без сессии) → Оператор

## Preconditions
- У клиента нет session cookie и не передаётся `X-Reviewer-Id`.
- Оператора с `email` и `national_id` из Test data не существует.

## Steps
1. `POST /api/v1/operators` с телом из Test data.
2. Тем же клиентом (с полученными cookie) — `GET /api/v1/auth/me`.

## Expected result
`GET /auth/me` возвращает профиль оператора (не `401`), `email` в профиле равен `email` из Test data.

## Rationale
`POST /operators` «creates the Supabase Auth user and the Operator profile in one request, then signs the caller in (session cookie)»; `GET /auth/me` — «the logged-in operator's profile, or 401». Проверяется, что регистрация и вход — одно действие. Позитивный класс эквивалентности. Тест-план: `skypermit-test-plan.md` S1.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| `legal_name` | `<непустое юридическое имя>` | Класс валидных значений |
| `national_id` | `<national_id, уникальный в прогоне>` | `national_id` unique — `01-data-model.md` §Operator |
| `email` | `<email валидного формата, уникальный в прогоне>` | `email` unique |
| `password` | `<пароль, заведомо удовлетворяющий любым разумным правилам>` | Правила пароля в документации не заданы (OQ-17) — отказ не должен прийти из-за пароля |
| `phone`, `address_line`, `city`, `postal_code` | `<валидные непустые значения>` | Заполнены, чтобы не зависеть от их обязательности (OQ-17) |
## Status
Untested
