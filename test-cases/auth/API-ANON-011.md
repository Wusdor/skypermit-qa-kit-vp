# API-ANON-011: Вход с неверным паролем

- **ID:** API-ANON-011
- **Doc ref:** `03-api-contract.md` §Authentication & authorisation, §Error semantics; OQ-19
- **Role(s):** Аноним (входящий); Оператор (зарегистрирован в предусловиях)

## Preconditions
- Оператор зарегистрирован через `POST /api/v1/operators` с `email = qa.login.<RUN>@example.com`, `password = Qa-Passw0rd-2026` (остальные поля — как в API-ANON-001).
- Шаги выполняются новым клиентом без cookie: регистрация сама открывает сессию (`03-api-contract.md` §Authentication), поэтому клиент регистрации не используется.

## Steps
1. `POST /api/v1/auth/login` с телом из Test data.

## Expected result
Не определено — OQ-19: ответ на неуспешный вход не задан (`401` в `03` §Error semantics описан как «no operator session and no `X-Reviewer-Id`», а не как отказ в проверке учётных данных).

## Rationale
Негативный класс: существующий email, неверный пароль. Код, не документация: `app/api/v1/auth/login/route.ts` возвращает `401` «Invalid email or password.» — как ожидаемый результат не используется. Определённая часть — сессия не открылась — вынесена в API-ANON-012 со статусом `Untested`. Тест-план: `skypermit-test-plan.md` S1, S6.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| `email` | `qa.login.<RUN>@example.com` | Существующий оператор — проверяется только пароль |
| `password` | `Qa-Passw0rd-2027` | Отличается от верного одним символом: близкая, но неверная строка |
| `<RUN>` | UTC-время запуска, `yyyyMMddHHmmss` | Уникальный суффикс прогона |

## Status
Blocked — OQ-19
