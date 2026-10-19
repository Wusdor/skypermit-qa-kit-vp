# DB-ANON-001: Повторный email не создаёт второго оператора

- **ID:** DB-ANON-001
- **Doc ref:** `01-data-model.md` §Operator (`email` unique)
- **Role(s):** Аноним (регистрирующийся); Оператор A (зарегистрирован в предусловиях)

## Preconditions
- Оператор A зарегистрирован через `POST /api/v1/operators` с `email = qa.reg.<RUN>@example.com`, `national_id = QA-REG-<RUN>-A`; его `id` сохранён.
- Есть доступ на чтение к таблице `operators`.

## Steps
1. `POST /api/v1/operators` с тем же `email` и `national_id = QA-REG-<RUN>-B` (ответ не оценивается — см. API-ANON-004).
2. `SELECT id FROM operators WHERE email = 'qa.reg.<RUN>@example.com'`.

## Expected result
Ровно одна строка, `id` равен `id` оператора A.

## Rationale
Определённая часть API-ANON-004: независимо от кода ответа (OQ-15) уникальность `email` не нарушена и запись A не перезаписана. Тест-план: `skypermit-test-plan.md` S2.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| `email` | `qa.reg.<RUN>@example.com` | Совпадает у A и повторной попытки |
| `national_id` (A / попытка) | `QA-REG-<RUN>-A` / `QA-REG-<RUN>-B` | Разные — чтобы сработала только уникальность `email` |
| `password` | `Qa-Passw0rd-2026` | См. API-ANON-001 |

## Status
Untested
