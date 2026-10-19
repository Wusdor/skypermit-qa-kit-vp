# API-ANON-003: authorisation_level в теле регистрации не повышает уровень

- **ID:** API-ANON-003
- **Doc ref:** `03-api-contract.md` §Authentication & authorisation; `04-frontend-spec.md` §Operator portal
- **Role(s):** Аноним (регистрирующийся)

## Preconditions
- У клиента нет session cookie.
- Оператора с `email` и `national_id` из Test data не существует.

## Steps
1. `POST /api/v1/operators` с телом из Test data, включая `"authorisation_level": "L3"`.
2. Если шаг 1 завершился успешно — тем же клиентом `GET /api/v1/auth/me`.

## Expected result
Оператор с уровнем выше `L1` не создан: если регистрация прошла, в профиле `authorisation_level = "L1"`. Реакция на лишнее поле (игнорировать или отклонить запрос) в документации не задана и в этом кейсе не проверяется.

## Rationale
Попытка самостоятельно выдать себе привилегию. `03`: «Registration always creates an operator at `L1`; raising it is an out-of-band admin action, not a registration-form field»; `04`: «`authorisation_level` is not a field on this form». Значение `L3` — максимальный уровень, самый опасный случай. Тест-план: `skypermit-test-plan.md` R5.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| `legal_name` | `ТОВ «QA Реєстрація»` | Непустое имя — класс валидных значений |
| `national_id` | `QA-REG-<RUN>` | Уникален в каждом прогоне (`national_id` unique — `01-data-model.md` §Operator) |
| `email` | `qa.reg.<RUN>@example.com` | Уникален в каждом прогоне (`email` unique) |
| `password` | `Qa-Passw0rd-2026` | 16 символов; правила пароля в документации не заданы (OQ-17), значение выбрано заведомо «сильным» |
| `phone`, `address_line`, `city`, `postal_code` | `+380441234567`, `вул. Тестова, 1`, `Київ`, `01001` | Заполнены, чтобы не зависеть от их обязательности (OQ-17) |
| `<RUN>` | UTC-время запуска, `yyyyMMddHHmmss` | Уникальный суффикс прогона |
| `authorisation_level` | `L3` | Максимальный уровень (`01-data-model.md` §Enumerations) |

## Status
Untested
