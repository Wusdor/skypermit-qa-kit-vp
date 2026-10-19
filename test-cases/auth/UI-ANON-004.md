# UI-ANON-004: Без сессии в шапке отображается ссылка на вход

- **ID:** UI-ANON-004
- **Doc ref:** `04-frontend-spec.md` §Two contracts to hold exactly
- **Role(s):** Аноним

## Preconditions
- В браузере нет сессии оператора (cookie очищены).

## Steps
1. Открыть главную страницу приложения.

## Expected result
В шапке отображается элемент `data-testid="operator-login-link"`.

## Rationale
`04`: `operator-login-link`, `operator-register-link` — «shown when logged out». Точка входа в сценарий логина; элемент заменил удалённый `operator-id-input`, поэтому стабильность его `data-testid` — часть контракта. Тест-план: `skypermit-test-plan.md` S8, R8.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| — | Данные не вводятся | Проверяется состояние шапки без сессии |

## Status
Untested
