# UI-ANON-002: После регистрации в шапке отображается сессия оператора

- **ID:** UI-ANON-002
- **Doc ref:** `04-frontend-spec.md` §Operator portal, §Two contracts to hold exactly
- **Role(s):** Аноним → Оператор

## Preconditions
- Пользователь не залогинен; в шапке видны `operator-login-link` и `operator-register-link`.
- Оператора с `email` и `national_id` из Test data не существует.

## Steps
1. На `/register` заполнить форму значениями из Test data и отправить.

## Expected result
В шапке отображается элемент `data-testid="operator-session-info"`.

## Rationale
`04`: регистрация «creating both together and logging the operator in immediately»; `operator-session-info` / `operator-logout-button` — «shown when logged in». Проверяет и вход после регистрации, и контракт `data-testid`. Тест-план: `skypermit-test-plan.md` S8, R8.

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
