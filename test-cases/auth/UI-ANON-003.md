# UI-ANON-003: После входа через /login в шапке отображается сессия оператора

- **ID:** UI-ANON-003
- **Doc ref:** `04-frontend-spec.md` §Operator portal, §Two contracts to hold exactly
- **Role(s):** Аноним → Оператор

## Preconditions
- Оператор зарегистрирован через `POST /api/v1/operators` с `email = qa.login.<RUN>@example.com`, `password = Qa-Passw0rd-2026` (остальные поля — как в API-ANON-001).
- Шаги выполняются новым клиентом без cookie: регистрация сама открывает сессию (`03-api-contract.md` §Authentication), поэтому клиент регистрации не используется.
- В браузере нет сессии; в шапке виден `operator-login-link`.

## Steps
1. На `/login` ввести `email` и `password` из Test data и отправить форму.

## Expected result
В шапке отображается элемент `data-testid="operator-session-info"`.

## Rationale
`04`: страница «Login (`/login`)»; `operator-session-info` / `operator-logout-button` — «shown when logged in». Проверяет вход через UI и контракт `data-testid`. Тест-план: `skypermit-test-plan.md` S8, R8.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| `email` | `qa.login.<RUN>@example.com` | Email зарегистрированного в предусловиях оператора |
| `password` | `Qa-Passw0rd-2026` | Пароль, заданный при регистрации |
| `<RUN>` | UTC-время запуска, `yyyyMMddHHmmss` | Уникальный суффикс прогона |

## Status
Untested
