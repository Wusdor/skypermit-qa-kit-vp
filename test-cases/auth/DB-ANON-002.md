# DB-ANON-002: id оператора совпадает с id пользователя Supabase Auth

- **ID:** DB-ANON-002
- **Doc ref:** `01-data-model.md` §Operator (`id`)
- **Role(s):** Аноним (регистрирующийся)

## Preconditions
- Есть доступ на чтение к `operators` и `auth.users`.
- Оператора с `email` и `national_id` из Test data не существует.

## Steps
1. `POST /api/v1/operators` с телом из Test data.
2. `SELECT o.id, u.id FROM operators o JOIN auth.users u ON u.email = o.email WHERE o.email = 'qa.reg.<RUN>@example.com'`.

## Expected result
Одна строка, `operators.id = auth.users.id`.

## Rationale
«Set at registration to the Supabase Auth user's own id — the operator row *is* keyed by its auth identity». Регрессия перехода `0003` → `0004` (раньше был отдельный `user_id`): от этой связи зависит scoping по сессии во всех operator-scoped эндпоинтах. Тест-план: `skypermit-test-plan.md` S2, R5.

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
