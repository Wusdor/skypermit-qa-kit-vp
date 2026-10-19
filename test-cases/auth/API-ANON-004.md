# API-ANON-004: Регистрация с уже занятым email

- **ID:** API-ANON-004
- **Doc ref:** `01-data-model.md` §Operator (`email` unique); `03-api-contract.md` §Error semantics; OQ-15
- **Role(s):** Аноним (регистрирующийся); Оператор A (зарегистрирован в предусловиях)

## Preconditions
- Оператор A зарегистрирован через `POST /api/v1/operators` с `email = qa.reg.<RUN>@example.com`, `national_id = QA-REG-<RUN>-A`.
- У клиента нет session cookie.

## Steps
1. `POST /api/v1/operators` с телом из Test data: тот же `email`, что у A, другой `national_id`.

## Expected result
Не определено — OQ-15: код и тело ответа на нарушение уникальности не заданы (`409` в `03` описан только для переходов состояний и конфликтов расписания).

## Rationale
Граница уникальности `email`. Отказ по существу следует из `01` (unique), но ожидаемый ответ API не определён. Код, не документация: `app/api/v1/operators/route.ts` возвращает `400`. Тест-план: `skypermit-test-plan.md` S2.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| `legal_name` | `ТОВ «QA Дубль»` | Валидное значение |
| `national_id` | `QA-REG-<RUN>-B` | Отличается от A — проверяется только `email` |
| `email` | `qa.reg.<RUN>@example.com` | Совпадает с A |
| `password` | `Qa-Passw0rd-2026` | См. API-ANON-001 |

## Status
Blocked — OQ-15
