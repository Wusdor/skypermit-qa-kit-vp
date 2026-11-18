# E2E-OPR-002: Окно 04:59–05:30 заходит в curfew KBP-CTR-3 на 1 минуту с конца — «Check before submitting» показывает провал TIME_WINDOW по A-7 §1

- **ID:** E2E-OPR-002
- **Jira:** SKY-1
- **Doc ref:** «06 — Business Rules» §1.4 (Curfew: «Curfews crossing midnight are one continuous period»; «Curfew values, per zone»), §4, §6; «03 — API Contract» §Error semantics, §The 422 body, #13 (`validate` прогоняет гейты «exactly as `submit` would»), §Gate pipeline; «04 — Frontend Spec» §Operator portal («Check before submitting», per-gate pass/fail); «01 — Data Model» §Time handling; «05 — Open Questions» (SUSPENDED, №4 — только предусловие); «08 — UML Diagrams» §Gate Pipeline; OQ-23
- **Role(s):** Оператор (владелец заявки, работает в портале)
- **Техника:** BV — сторона нарушения на выходе из curfew (05:00): окно начинается внутри на 1 мин и заканчивается вне; плюс проверка curfew через полночь как одного периода

## Preconditions
- Те же, что в E2E-OPR-001: оператор не `SUSPENDED` (OQ-01), `authorisation_level = L2` (прямая запись в БД; «06» §4, `OH-1 §4`); пилот `R_ADVANCED`, `certified_on = T − 30 дн` («06» §1.1, §2); aircraft `mtom_grams = 900` → `C0` («06» §3, §1.2); зона `KBP-CTR-3` активна («06» §4); других заявок на aircraft нет.
- Время: `T` — момент шага 1; дата окна `D` = дата `T + 2 дн` (lead time ≥ 6 ч и ≤ 60 дней, «06» §1.4), не день перехода на летнее/зимнее время.
- Зависимость подготовки данных (OQ-11, OQ-22): перед прогоном подтвердить, в каком поясе форма принимает время; по коду зона = `Europe/Kyiv` (lib/curfew.ts:7), форма принимает пояс браузера (app/operator/requests/new/page.tsx:48-49). Ввод `D 04:59` / `D 05:30` должен означать 04:59 / 05:30 в местном времени зоны.
- Открыты DevTools (вкладка Network) для чтения ответа на `POST /api/v1/flight-requests/{id}/validate`.

## Steps
1. В шапке нажать ссылку «New Request» (`operator-nav-new-request` — components/AppHeader.tsx:12, :83).
2. На форме `flight-request-create-form` (app/operator/requests/new/page.tsx:95) заполнить: `flight-request-zone-select` (:107) = `KBP-CTR-3`; `flight-request-pilot-select` (:118) = пилот; `flight-request-aircraft-select` (:130) = aircraft; `flight-request-window-start-input` (:144) = `D 04:59`; `flight-request-window-end-input` (:152) = `D 05:30`; `flight-request-altitude-input` (:163) = `100`; `flight-request-purpose-textarea` (:175) = `Аэрофотосъёмка`.
3. Нажать `flight-request-create-submit-button` (:191); дождаться `flight-request-detail` (components/FlightRequestPanel.tsx:88).
4. Нажать `flight-request-validate-button` (components/FlightRequestPanel.tsx:112) и в Network прочитать ответ на `POST /api/v1/flight-requests/{id}/validate` (у сетевого вызова `data-testid` нет).

## Expected result
Не определено — OQ-23: код и тело ответа `POST /api/v1/flight-requests/{id}/validate` при провале гейта. Спорная сторона: `422` с `failing_gate: TIME_WINDOW` и `rule_reference: "A-7 §1"` («03» §Error semantics, §The 422 body) либо `200` с результатами по гейтам без смены состояния («08» §Gate Pipeline).

Определено для UI: карточка `flight-request-gate-result-TIME_WINDOW` (components/GateResultsPanel.tsx:34, :39) показывает провал (`data-gate-status="FAIL"`) со ссылкой `A-7 §1`, а не `ZC-2026.1 §3` («04» §Operator portal: per-gate pass/fail; «06» §1.4, §6).

## Rationale
Критерии SKY-1 №1 и №2, вторая сторона curfew: начало окна внутри curfew (04:59 < 05:00), конец вне. Минута `04:59` внутри 23:00–05:00: окно перекрывает curfew ровно на 1 мин, граница `05:00` концом окна (05:30) не затрагивается — включительность (OQ-12) не нужна. Парный к E2E-OPR-001 кейс: защита от реализации, проверяющей только `window_end`. Curfew 23:00–05:00 пересекает полночь и считается одним непрерывным периодом («06» §1.4, `TSD-4` §4). Код и тело ответа `validate` при провале гейта — OQ-23, как в E2E-OPR-001, поэтому кейс `Blocked`. По коду, требует подтверждения: `422 {failing_gate: TIME_WINDOW, rule_reference: A-7 §1, message}` — app/api/v1/flight-requests/[id]/validate/route.ts:42 (`gateFailure`). Pass/fail гейтов в UI определён «04»; показ `A-7 §1` в карточке строится из тела ответа `validate` — по коду, требует подтверждения (OQ-23).

Если пояс ввода формы и пояс зоны не совпадают, окно в curfew не попадёт — это ошибка подготовки данных (см. Preconditions), а не вариант ожидаемого результата.

Остальные гейты заведомо проходят (см. E2E-OPR-001). Длительность 31 мин ∈ 15–240. Селекторы — из кода по правилу проекта; у цитаты в панели собственного `data-testid` нет (components/GateResultsPanel.tsx:50-51), поэтому она проверяется по сетевому ответу.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| `zone_code` | `KBP-CTR-3` | Curfew 23:00–05:00 по `A-7` §1 («06» §4) |
| `window_start` | `D 04:59` (местное время зоны) | На минуту внутри curfew (до 05:00) |
| `window_end` | `D 05:30` | Вне curfew; длительность 31 мин ∈ 15–240 («06» §1.4) |
| `requested_altitude_metres` | `100` | ≤ потолка 120 м |
| `flight_purpose` | `Аэрофотосъёмка` | Валидный текст |
| Оператор / пилот / aircraft | `L2` / `R_ADVANCED`, `T − 30 дн` / `900 г` (`C0`) | Остальные гейты проходят, как в E2E-OPR-001 |

## Status
Blocked — OQ-23
