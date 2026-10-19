# API-ANON-009: Код и тело успешного ответа регистрации

- **ID:** API-ANON-009
- **Doc ref:** `03-api-contract.md` §Authentication & authorisation, §Registry #1; OQ-18
- **Role(s):** Аноним (регистрирующийся)

## Preconditions
- У клиента нет session cookie.
- Оператора с `email` и `national_id` из Test data не существует.

## Steps
1. `POST /api/v1/operators` с телом из Test data.

## Expected result
Не определено — OQ-18: код успешного ответа, состав тела и начальные `status` / `registered_on` в документации не заданы.

## Rationale
Контракт ответа нужен клиентам (форма `/register`) и автотестам. Код, не документация: `app/api/v1/operators/route.ts` возвращает `201` с профилем; значения `status = ACTIVE` и `registered_on = current_date` — из DEFAULT в `supabase/migrations/0001_init.sql`. Тест-план: `skypermit-test-plan.md` S6.

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
Blocked — OQ-18
