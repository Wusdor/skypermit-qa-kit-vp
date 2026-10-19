# Реестр открытых вопросов QA

Сквозные ID для тест-планов и тест-кейсов: ссылаться как `OQ-NN`. ID не переиспользуются и не перенумеровываются; закрытый вопрос остаётся в таблице со статусом «Закрыт» и ссылкой на решение.

Статус по документации ведёт только `../skypermit/docs/05-open-questions.md`. Здесь он отражается так:
- **Open (№N)** — вопрос открыт в `05` под номером N;
- **Кандидат** — пробел или противоречие, найденное QA и отсутствующее в `05`. Обе стороны приведены, правильная не выбрана.

Код (`../skypermit`) упоминается только как oracle — это не требование.

Источники: `../skypermit/docs` версии `78407f1 2026-09-25`. Пути документов ниже — относительно `../skypermit/docs/`.

| ID | Вопрос | Сторона A | Сторона B / пробел | Статус | Планы |
|---|---|---|---|---|---|
| OQ-01 | Код и тело ответа для `Operator.status = SUSPENDED` на create / submit / approve | `05` §1: «status code and response body … undefined», не `422` | `03` §Error semantics относит его к `403`. Действует `05`: ответ не определён. Код: `403` как placeholder (`app/api/v1/flight-requests/[id]/submit/route.ts`) | Open (№4) | SM, Master |
| OQ-02 | Цитата `ZC-2026.1 §4` для неактивной зоны в `rule_reference` | `06` §6 | `05` §2: «citation not fully confirmed» | Open (№5) | SM, Master |
| OQ-03 | Эндпоинт для `complete` (`APPROVED → COMPLETED`) | `02` таблица: «Maintenance endpoint only» | `03`: среди эндпоинтов 1–16 и auth такого нет | Кандидат | SM, Master |
| OQ-04 | Как воспроизвести `SUBMITTED → cancel` и какой результат ждать при гонке с `submit` | `02` таблица: «only reachable in the narrow window before gates resolve it automatically» | `02` таблица: «caller never observes `SUBMITTED` at rest» — воспроизвести можно только с контролем тайминга (параллельный cancel во время submit). Код: `SUBMITTED` не пишется в БД (`.../submit/route.ts`), `canCancel` его не включает (`lib/state-machine.ts:6`) | Кандидат | SM |
| OQ-05 | Отмена `APPROVED` ровно за 2 ч до `window_start` разрешена? | `06` §5: «up to 2 hours before `window_start`» | Включительность границы не указана. Код разрешает (`lib/state-machine.ts:27`) | Кандидат | SM |
| OQ-06 | Пересечение окон по одному aircraft: `409` или `422 TIME_WINDOW` | `03` §Error semantics: `409` — «a scheduling conflict between requests» | `06` §1.4, §6: условие гейта `TIME_WINDOW`, `rule_reference` `TSD-4 §5` | Кандидат | SM, Master |
| OQ-07 | Ответ `submit` при провале гейта; код успешного `submit` | `03` §422: провал гейта → `422` | `08` §Gate Pipeline: «200/201 with new state» | Кандидат | SM, Master |
| OQ-08 | `failing_gate` у `REJECTED` после отказа ревьюера | `02` §States: у `REJECTED` «`failing_gate` and `rejection_reason` are populated» | `01` §FlightRequest: `failing_gate` «populated only on gate-failure rejection» | Кандидат | SM |
| OQ-09 | Нет `X-Reviewer-Id` на approve / reject: `400` или `401` | `03` §Reviewer: «Return `400` if `X-Reviewer-Id` is missing» | `03` §Error semantics: `401` — «no operator session and no `X-Reviewer-Id`» | Кандидат | SM, Master |
| OQ-10 | `AuditLog` для `submit`: одна строка или две (через `SUBMITTED`); значение `actor` | `02` §Implementation note: логируется «every state change» | Число строк и `actor` не определены. Код: одна строка, `actor = coalesce(decided_by, 'system')` (`supabase/migrations/0001_init.sql`) | Кандидат | SM |
| OQ-11 | Часовой пояс зоны для curfew | `06` §1.4, `01` §Time handling: curfew в «zone-local time» | `01` §Zone: поля часового пояса нет. Код: `Europe/Kyiv` для всех зон (`lib/curfew.ts:7`) | Кандидат | Master |
| OQ-12 | Включительность границ curfew: окно заканчивается ровно в начале curfew или начинается ровно в его конце | `06` §1.4: «No part of the window may fall inside the zone's curfew» | Включительность границ не указана | Кандидат | Master |
| OQ-13 | `validate`: только первый провал или результаты всех четырёх гейтов | `03` #13, §Gate pipeline: «exactly as `submit` would», «stopping at the first failure» | `04` §Reviewer queue: «all four gate results»; §Operator portal: «per-gate pass/fail result» | Кандидат | Master |
| OQ-14 | Тело `422` при регистрации aircraft с `mtom_grams` > 30 000 г | `06` §1.2, §6: `422`, гейт неприменим, `rule_reference` `OH-1 §3` | `03` §422: `failing_gate` обязателен и принимает только одно из четырёх значений | Кандидат | Master |
| OQ-15 | Код ответа на дубль `email` / `national_id` / `serial_number` | `01` §Entities: поля unique | `03` §Error semantics: подходящего кода нет (`409` — только состояния и расписание) | Кандидат | Master; TC `auth` |
| OQ-16 | Исправление `mtom_grams` / `certified_on` | `01` §Derived: «Correcting a registered mass recalculates the band immediately» | `03` §Registry: эндпоинтов изменения нет | Кандидат | Master |
| OQ-17 | Обязательные поля регистрации и правила валидации `email` / `password` | `03` §Authentication: `POST /operators` создаёт auth-пользователя и профиль; `04` §Operator portal: форма — «auth credentials (email, password)» плюс поля профиля | Какие поля обязательны, формат `email`, требования к паролю и ответ на нарушение не заданы. Код: обязательны `legal_name`, `national_id`, `email` (с `@`), `password` ≥ 8 символов, иначе `400` (`app/api/v1/operators/route.ts`) | Кандидат | TC `auth` |
| OQ-18 | Код и тело успешного ответа `POST /operators`; начальные `status` и `registered_on` | `03` §Authentication: «creates the Supabase Auth user *and* the Operator profile … then signs the caller in» | Код ответа, состав тела и начальные `status` / `registered_on` не заданы. Код: `201` с профилем (`app/api/v1/operators/route.ts`); `ACTIVE` и `current_date` — DEFAULT в `supabase/migrations/0001_init.sql` | Кандидат | TC `auth` |

Планы: SM — `state-machine-test-plan.md`, Master — `skypermit-test-plan.md`; TC `<модуль>` — тест-кейсы в `test-cases/<модуль>/`.
