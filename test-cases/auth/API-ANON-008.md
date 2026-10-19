# API-ANON-008: Регистрация без password

- **ID:** API-ANON-008
- **Doc ref:** `03-api-contract.md` §Authentication & authorisation; `04-frontend-spec.md` §Operator portal; OQ-17
- **Role(s):** Аноним

## Preconditions
- У клиента нет session cookie.
- Оператора с `email` и `national_id` из Test data не существует.

## Steps
1. `POST /api/v1/operators` с телом из Test data без поля `password`.

## Expected result
Не определено — OQ-17: обязательные поля регистрации и ответ на их отсутствие в документации не заданы.

## Rationale
`04`: форма содержит «auth credentials (email, password)», но обязательность и правила пароля не описаны. Код, не документация: `app/api/v1/operators/route.ts` — `400`, минимум 8 символов. Тест-план: `skypermit-test-plan.md` S2.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| `legal_name` | `ТОВ «QA Реєстрація»` | Валидное значение |
| `national_id` | `QA-REG-<RUN>` | Уникален в прогоне |
| `email` | `qa.reg.<RUN>@example.com` | Уникален в прогоне |
| `password` | (поле отсутствует) | Проверяемое отсутствие |

## Status
Blocked — OQ-17
