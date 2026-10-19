# Тест-план: машина состояний FlightRequest

| | |
|---|---|
| Объект | Жизненный цикл `FlightRequest`: 7 состояний, легальные/нелегальные переходы, связанные правила (дедлайн отмены, overlap), побочные эффекты переходов |
| Источники | `02-state-machine.md` (основной); `05-open-questions.md`, `07-clarifications.md`; для сверки — `01-data-model.md`, `03-api-contract.md`, `06-business-rules.md` §1.4, §5, `08-uml-diagrams.md` (версия: `78407f1 2026-09-25`) |
| Не являются источниками | `CR-1` (непринятое предложение), `OH-1` v1.4 (superseded) — `06-business-rules.md` вводная часть; код `../skypermit` — только oracle |
| Автор / дата | Wusdor / 2026-10-19 |

## 1. Скоуп
**In:**
- Легальные переходы `submit`, `approve`, `reject`, `cancel` и их результирующие состояния — `02-state-machine.md` таблица переходов
- Все нелегальные пары `(from, action)` → `409`, включая терминальные `REJECTED`/`CANCELLED`/`COMPLETED` и повторный `submit` — `02-state-machine.md` вводная часть, таблица
- `SUBMITTED` транзиентен, не наблюдается at rest — `02-state-machine.md` §States
- `SUBMITTED → cancel` — по `02` «reachable in the narrow window»: трудно воспроизвести, нужен контроль тайминга; ожидаемый исход гонки не описан (OQ-04) — `02-state-machine.md` таблица
- Дедлайн отмены `APPROVED` (2 ч до `window_start`, `409`) — `02-state-machine.md` §Rules…; `06-business-rules.md` §5
- Overlap учитывает только `APPROVED`/`UNDER_REVIEW`; освобождение слота при уходе в другие состояния — `02-state-machine.md` §Rules…; `06-business-rules.md` §1.4
- Побочные эффекты: `failing_gate`/`rejection_reason`/`rule_reference`, `ReviewAction`, `decided_*`, `submitted_at`, `AuditLog` — `02-state-machine.md` таблица, §Implementation note; `01-data-model.md`
- `validate` не меняет состояние — `03-api-contract.md` #13
- `COMPLETED` никогда не выставляется по истечении времени — `02-state-machine.md` §States

**Out:**
- Логика гейтов по отдельности (пороги, зоны, curfew) — отдельный план по `06-business-rules.md` §1–§4; здесь только факт перехода в `UNDER_REVIEW`/`REJECTED`
- Переход `APPROVED → COMPLETED` — заблокировано: эндпоинт не описан (OQ-03)
- Поведение для `SUSPENDED`-оператора на `submit`/`approve` — заблокировано вопросом №4 (OQ-01)

## 2. Риски
| # | Риск | В/В | Митигация | Источник |
|---|---|---|---|---|
| R1 | Пропущенная нелегальная пара возвращает не `409` или меняет состояние (особенно из терминальных) | С/В | S1 — полная матрица 7×5 | `02-state-machine.md` таблица |
| R2 | Off-by-one на дедлайне 2 ч; зависимость от часов сервера | В/С | S2 — граничные значения с управлением временем | `06-business-rules.md` §5 |
| R3 | Гонки: параллельные `submit`/`approve`/`cancel` дают двойной переход или две записи `ReviewAction` | С/В | S5 — параллельные вызовы + exploratory | `02-state-machine.md` §Implementation note |
| R4 | `AuditLog` пропускает или дублирует переход (запись из приложения + DB-триггер) | С/С | S4 — проверка БД после каждого перехода | `02-state-machine.md` §Implementation note; `01-data-model.md` §AuditLog |
| R5 | Неконсистентные поля после перехода (`failing_gate` при отказе ревьюера, `rule_reference` не сохранён) | С/С | S3 | `01-data-model.md` §FlightRequest |
| R6 | Overlap считает не те состояния; `CANCELLED`/`REJECTED` продолжают блокировать слот | С/В | S6 — таблица решений по состоянию «соседа» | `06-business-rules.md` §1.4 (`TSD-4 §5`) |
| R7 | Фоновая логика переводит `APPROVED` в `COMPLETED` по времени | Н/В | S2 — запрос с прошедшим окном остаётся `APPROVED` | `02-state-machine.md` §States |
| R8 | `validate` меняет состояние или поля | Н/В | S1, S3 — сравнение до/после | `03-api-contract.md` #13 |

## 3. Стратегия
| Область | Уровень | Manual / Auto | Техники | Почему так |
|---|---|---|---|---|
| S1 Матрица переходов (легальные + все запрещённые пары, действия `submit`/`approve`/`reject`/`cancel`/`validate`) | API | Auto | state transition testing, N-1 switch coverage | Комбинаторно, детерминированно, основа регрессии |
| S2 Дедлайн отмены и «время не завершает» | API | Auto | граничные значения (2 ч ± 1 мин, ровно 2 ч — см. OQ-05) | Требует управления временем, дёшево перебирать |
| S3 Поля и `ReviewAction` после перехода | API + DB | Auto | таблица решений (тип отказа × поле) | Точное сравнение значений |
| S4 `AuditLog` | DB | Auto | проверка числа и содержимого строк на переход | Видно только в БД |
| S5 Конкурентность, в т.ч. `cancel` во время `submit` (OQ-04) | API | Auto + Manual | параллельные запросы с контролем тайминга; exploratory-сессия | Недетерминизм: auto ловит регрессию, manual — новые сценарии |
| S6 Overlap × состояние соседнего запроса | API | Auto | таблица решений (6 состояний соседа), сценарий «validate ок → approve соседа → submit падает» | Детерминированно |
| S7 Права на действие (owner / reviewer / чужой оператор) | API | Auto | эквивалентные классы | Контракт `401`/`403`; коды частично не определены (OQ-01, OQ-09) |
| S8 Отображение состояний, фильтр «My requests», очередь `UNDER_REVIEW`, reject с note | UI | Manual + Auto (smoke по `data-testid`) | сценарии | Только то, что видно лишь в UI — `04-frontend-spec.md` |
| S9 Заблокированные области (OQ-01, OQ-03) | — | Manual после решения | — | Ожидаемое поведение не определено |

Порядок: S1 → S3/S4 → S2/S6 → S7 → S5/S8. S1–S4, S6 входят в регрессию на каждое изменение.

## 4. Тестовые данные и окружение
- Зоны — из `supabase/seed.sql` (`06-business-rules.md` §4); оператор `L3`, пилот `R_BVLOS` с текущей сертификацией, aircraft `C0` — набор, гарантированно проходящий гейты в `DNI-OPN-1` (вне curfew)
- Фикстуры в каждом состоянии создаются только через API (кроме `COMPLETED`, см. OQ-03); значения `CR-1`/`OH-1` v1.4 в фикстурах недопустимы
- Время: `window_start` относительно текущих часов сервера (UTC); для дедлайна нужна возможность задать «сейчас» или запас ≥ 1 мин на границах
- Роли: два оператора (свой/чужой ресурс), ревьюер (`X-Reviewer-Id`), без сессии; оператор `SUSPENDED` — только для OQ-01
- Доступ к БД на чтение `audit_log`, `review_actions`, `flight_requests`

## 5. Критерии
**Вход:** окружение с seed-данными; доступ к БД на чтение; решён способ управлять временем для S2.
**Выход:** 100% легальных переходов и 100% запрещённых пар из матрицы S1 пройдены; S2–S7 выполнены; нет открытых дефектов Critical/Major по R1–R8.
**DoD:** план выполнен по незаблокированным областям; вопросы из раздела 6 зафиксированы в `open-questions.md` с владельцем; тесты по ним помечены «не определено» со ссылкой на `OQ-NN` и не считаются пройденными.

## 6. Открытые вопросы и блокеры
Сквозные ID, полные формулировки и цитаты обеих сторон — в реестре `test-plans/open-questions.md`.

| # | Вопрос | Статус | Влияние на тестирование | Источник |
|---|---|---|---|---|
| OQ-01 | Код и тело ответа для `SUSPENDED`-оператора на `submit`/`approve` | Open (№4) | S9: ожидаемый ответ не определён | `05-open-questions.md` §1 |
| OQ-02 | Цитата `ZC-2026.1 §4` для неактивной зоны в `rule_reference` | Open (№5) | S3: значение `rule_reference` не проверяем как окончательное | `05-open-questions.md` §2 |
| OQ-03 | Эндпоинт для `complete` не описан | Кандидат | `APPROVED → COMPLETED` и переходы из `COMPLETED` не тестируемы | `02-state-machine.md` таблица vs `03-api-contract.md` |
| OQ-04 | `SUBMITTED → cancel` достижим только «in the narrow window»: как воспроизвести и какой исход гонки с `submit` ожидать | Кандидат | S1, S5: проверка требует контроля тайминга; ожидаемый исход не определён | `02-state-machine.md` таблица |
| OQ-05 | Отмена ровно за 2 ч до `window_start` — разрешена? | Кандидат | S2: граница не определена | `06-business-rules.md` §5 |
| OQ-06 | Пересечение окон при `submit`: `409` или `422 TIME_WINDOW` | Кандидат | S6: код ответа не определён | `03-api-contract.md` §Error semantics vs `06-business-rules.md` §1.4 |
| OQ-07 | `submit` с проваленным гейтом: `422` или «200/201 with new state» | Кандидат | S1, S3: код ответа не определён | `03-api-contract.md` §422 vs `08-uml-diagrams.md` §Gate Pipeline |
| OQ-08 | `failing_gate` у `REJECTED` после отказа ревьюера | Кандидат | S3 | `02-state-machine.md` §States vs `01-data-model.md` §FlightRequest |
| OQ-09 | Нет `X-Reviewer-Id`: `400` или `401` | Кандидат | S7 | `03-api-contract.md` §Reviewer vs §Error semantics |
| OQ-10 | `AuditLog` для `submit`: одна или две строки; значение `actor` | Кандидат | S4: число строк и `actor` не проверяем как требование | `02-state-machine.md` §Implementation note |
