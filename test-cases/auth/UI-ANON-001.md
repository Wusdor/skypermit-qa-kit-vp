# UI-ANON-001: В форме регистрации нет поля authorisation_level

- **ID:** UI-ANON-001
- **Doc ref:** `04-frontend-spec.md` §Operator portal
- **Role(s):** Аноним

## Preconditions
- Пользователь не залогинен.

## Steps
1. Открыть страницу `/register`.

## Expected result
На форме нет элемента для выбора или ввода `authorisation_level`.

## Rationale
«`authorisation_level` is not a field on this form — registration always starts an operator at `L1`». UI-часть R5; серверная часть — API-ANON-003. Тест-план: `skypermit-test-plan.md` S8.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| — | Данные не вводятся | Проверяется состав формы |

## Status
Untested
