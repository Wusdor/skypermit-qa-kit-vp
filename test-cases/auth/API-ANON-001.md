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
| `legal_name` | `ТОВ «QA Реєстрація»` | Непустое имя — класс валидных значений |
| `national_id` | `QA-REG-<RUN>` | Уникален в каждом прогоне (`national_id` unique — `01-data-model.md` §Operator) |
| `email` | `qa.reg.<RUN>@example.com` | Уникален в каждом прогоне (`email` unique) |
| `password` | `Qa-Passw0rd-2026` | 16 символов; правила пароля в документации не заданы (OQ-17), значение выбрано заведомо «сильным» |
| `phone`, `address_line`, `city`, `postal_code` | `+380441234567`, `вул. Тестова, 1`, `Київ`, `01001` | Заполнены, чтобы не зависеть от их обязательности (OQ-17) |
| `<RUN>` | UTC-время запуска, `yyyyMMddHHmmss` | Уникальный суффикс прогона |

## Status
Untested
