# API-ANON-002: Новый оператор создаётся с authorisation_level = L1

- **ID:** API-ANON-002
- **Doc ref:** `03-api-contract.md` §Authentication & authorisation («`authorisation_level` is no longer self-service»)
- **Role(s):** Аноним (регистрирующийся) → Оператор

## Preconditions
- У клиента нет session cookie.
- Оператора с `email` и `national_id` из Test data не существует.

## Steps
1. `POST /api/v1/operators` с телом из Test data (поле `authorisation_level` не передаётся).
2. Тем же клиентом — `GET /api/v1/auth/me`.

## Expected result
В профиле `authorisation_level = "L1"`.

## Rationale
«Registration always creates an operator at `L1` (least privilege)». Минимальный уровень влияет на гейт `ZONE` (`06-business-rules.md` §1.3), поэтому ошибка здесь сразу меняет исходы заявок. Тест-план: `skypermit-test-plan.md` S1, R5.

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
