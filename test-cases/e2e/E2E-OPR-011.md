# E2E-OPR-011: При провале AIRCRAFT гейты ZONE и TIME_WINDOW не проверяются — отображение в «Check before submitting» не определено

- **ID:** E2E-OPR-011
- **Jira:** SKY-3
- **Doc ref:** «06 — Business Rules» «Evaluation order» («evaluation stops at the first failure»); «03 — API Contract» §Gate pipeline («stopping at the first failure»), #13 («exactly as `submit` would»); «04 — Frontend Spec» §Operator portal («per-gate pass/fail result»), §Reviewer queue («all four gate results»); «03 — API Contract» #13 («so the reviewer detail view can show all four gate results without side effects»); «05 — Open Questions» (SUSPENDED, №4 — только предусловие); «08 — UML Diagrams» §Gate Pipeline (вторичная ссылка: для `validate` — «200 with per-gate results (no state change)»); OQ-13, OQ-23 (кандидаты реестра QA, `test-plans/open-questions.md`; не вопросы «05»)
- **Role(s):** Оператор (владелец заявки, работает в портале)
- **Техника:** State transition — переход по цепочке гейтов: остановка конвейера на втором гейте (`AIRCRAFT`) оставляет третий и четвёртый гейты не достигнутыми

## Preconditions
- Те же, что в E2E-OPR-009: оператор не `SUSPENDED` (OQ-01), `authorisation_level = L2` («06» §4, `OH-1 §4`; прямая запись в БД); пилот `R_ADVANCED`, `certified_on = T − 30 дн` («06» §1.1, §2); aircraft `mtom_grams = 12001` → `C3` («06» §3); зона `KBP-CTR-3` — C0–C2 («06» §4).
- Время: `T` — момент шага 1; `D` = дата `T + 2 дн`.
- Для различимости: окно и высота, которые прошли бы `ZONE` и `TIME_WINDOW`, — результат гейтов, которые не достигаются.

## Steps
1. В шапке нажать ссылку «New Request» (`operator-nav-new-request` — components/AppHeader.tsx:12, :83).
2. На форме `flight-request-create-form` (app/operator/requests/new/page.tsx:95) заполнить: `flight-request-zone-select` (:107) = `KBP-CTR-3`; `flight-request-pilot-select` (:118) = пилот `R_ADVANCED`; `flight-request-aircraft-select` (:130) = опция с подписью `<manufacturer> <model> (<serial_number>)` борта `mtom_grams = 12001` (вес в подписи не показан); `flight-request-window-start-input` (:144) = `D 12:00`; `flight-request-window-end-input` (:152) = `D 13:00`; `flight-request-altitude-input` (:163) = `100`; `flight-request-purpose-textarea` (:175) = `Аэрофотосъёмка`.
3. Нажать `flight-request-create-submit-button` (:191); дождаться `flight-request-detail` (components/FlightRequestPanel.tsx:88).
4. Нажать `flight-request-validate-button` (components/FlightRequestPanel.tsx:112); дождаться результатов в `flight-request-validate-result` (components/GateResultsPanel.tsx:30).

## Expected result
Не определено — OQ-13: показывает ли `validate` в UI только первый провал или результаты всех четырёх гейтов. Спорная сторона: конвейер останавливается на первом провале («06» «Evaluation order», «03» §Gate pipeline) — `ZONE` и `TIME_WINDOW` не проверены; либо «all four gate results» («04» §Reviewer queue; «03» #13: «the reviewer detail view can show all four gate results without side effects») / «per-gate pass/fail result» («04» §Operator portal) — результаты по всем гейтам. Как документация называет состояние непроверенного гейта в UI (например, «not evaluated»), не определено.

## Rationale
Критерий SKY-3 №3, вторая часть: `ZONE` и `TIME_WINDOW` не проверялись, потому что конвейер остановился на `AIRCRAFT`. «06» и «03» говорят об остановке на первом провале, а «04» требует «all four gate results» на детальном экране ревьюера и «per-gate pass/fail» у оператора — OQ-13 (кандидат реестра QA, в «05» не заведён). Ответ не берётся ни по аналогии, ни из кода, поэтому кейс `Blocked`. Форма ответа `validate` при провале (`422` с телом или `200` с результатами по гейтам) тоже не определена — OQ-23 (кандидат реестра QA), от неё зависит, из чего UI берёт результаты гейтов. `PILOT` как пройденный — E2E-OPR-010 (определён при любой трактовке).

По коду, требует подтверждения: гейты после упавшего получают `NOT_EVALUATED` и бейдж «not evaluated» (components/GateResultsPanel.tsx:13-21, :42-43); конвейер возвращается при первом провале, `ZONE` и `TIME_WINDOW` не вызываются (lib/gates/pipeline.ts:14-21). Это поведение кода, не требование документации.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| Aircraft: `mtom_grams` | `12001` | `C3` ∉ C0–C2 — провал на `AIRCRAFT` (второй гейт из четырёх) |
| `zone_code` | `KBP-CTR-3` | Зона сценария SKY-3 |
| `requested_altitude_metres` | `100` | ≤ 120 м: `ZONE` по высоте прошёл бы, если бы проверялся |
| `window_start` / `window_end` | `D 12:00` / `D 13:00` | Окно 60 мин: `TIME_WINDOW` прошёл бы, если бы проверялся |
| Пилот: `rating` / `certified_on` | `R_ADVANCED` / `T − 30 дн` | `PILOT` проходит — первым падает `AIRCRAFT` |

## Status
Blocked — OQ-13, OQ-23
