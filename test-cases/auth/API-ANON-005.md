# API-ANON-005: Регистрация с уже занятым national_id

- **ID:** API-ANON-005
- **Doc ref:** `01-data-model.md` §Operator (`national_id` unique); `03-api-contract.md` §Error semantics; OQ-15
- **Role(s):** Аноним (регистрирующийся); Оператор A (зарегистрирован в предусловиях)

## Preconditions
- Оператор A зарегистрирован через `POST /api/v1/operators` с `national_id = QA-REG-<RUN>`, `email = qa.reg.<RUN>.a@example.com`.
- У клиента нет session cookie.

## Steps
1. `POST /api/v1/operators` с телом из Test data: тот же `national_id`, что у A, другой `email`.

## Expected result
Не определено — OQ-15: код и тело ответа на нарушение уникальности не заданы.

## Rationale
Граница уникальности `national_id` — отдельно от `email`, потому что `email` дублируется и в Supabase Auth, а `national_id` — только в профиле: отказ может прийти на разных этапах. Код, не документация: `app/api/v1/operators/route.ts` (`400`, удаление созданного auth-пользователя). Тест-план: `skypermit-test-plan.md` S2.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| `legal_name` | `ТОВ «QA Дубль»` | Валидное значение |
| `national_id` | `QA-REG-<RUN>` | Совпадает с A |
| `email` | `qa.reg.<RUN>.b@example.com` | Отличается от A — проверяется только `national_id` |
| `password` | `Qa-Passw0rd-2026` | См. API-ANON-001 |

## Status
Blocked — OQ-15
