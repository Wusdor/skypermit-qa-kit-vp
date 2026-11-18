# E2E-OPR-007: Окно 05:00–05:30 начинается ровно в конце curfew KBP-CTR-3 — результат «Check before submitting» не определён

- **ID:** E2E-OPR-007
- **Jira:** SKY-1
- **Doc ref:** «06 — Business Rules» §1.4 (Curfew), §4, §6; «03 — API Contract» §The 422 body, #13; «04 — Frontend Spec» §Operator portal («Check before submitting»); «01 — Data Model» §Time handling; «05 — Open Questions» (SUSPENDED, №4 — только предусловие); OQ-12
- **Role(s):** Оператор (владелец заявки, работает в портале)
- **Техника:** BV — граница curfew ровно на конце 05:00: `window_start` = конец curfew

## Preconditions
- Те же, что в E2E-OPR-001: оператор не `SUSPENDED` (OQ-01), `authorisation_level = L2` (прямая запись в БД; «06» §4, `OH-1 §4`); пилот `R_ADVANCED`, `certified_on = T − 30 дн` («06» §1.1, §2); aircraft `mtom_grams = 900` → `C0` («06» §3, §1.2); зона `KBP-CTR-3` активна («06» §4); других заявок на aircraft нет.
- Время: `T` — момент шага 1; дата окна `D` = дата `T + 2 дн`, не день перехода на летнее/зимнее время.
- Зависимость подготовки данных (OQ-11, OQ-22): перед прогоном подтвердить, в каком поясе форма принимает время; по коду зона = `Europe/Kyiv` (lib/curfew.ts:7), форма принимает пояс браузера (app/operator/requests/new/page.tsx:48-49). Ввод `D 05:00` / `D 05:30` должен означать 05:00 / 05:30 в местном времени зоны.
- Открыты DevTools (вкладка Network) для чтения ответа на `POST /api/v1/flight-requests/{id}/validate`.

## Steps
1. В шапке нажать ссылку «New Request» (`operator-nav-new-request` — components/AppHeader.tsx:12, :83).
2. На форме `flight-request-create-form` (app/operator/requests/new/page.tsx:95) заполнить: `flight-request-zone-select` (:107) = `KBP-CTR-3`; `flight-request-pilot-select` (:118) = пилот; `flight-request-aircraft-select` (:130) = aircraft; `flight-request-window-start-input` (:144) = `D 05:00`; `flight-request-window-end-input` (:152) = `D 05:30`; `flight-request-altitude-input` (:163) = `100`; `flight-request-purpose-textarea` (:175) = `Аэрофотосъёмка`.
3. Нажать `flight-request-create-submit-button` (:191); дождаться `flight-request-detail` (components/FlightRequestPanel.tsx:88).
4. Нажать `flight-request-validate-button` (components/FlightRequestPanel.tsx:112) и в Network прочитать ответ на `POST /api/v1/flight-requests/{id}/validate`.

## Expected result
Не определено — OQ-12: входит ли момент 05:00 (начало окна = конец curfew) в curfew. Спорная сторона: либо `TIME_WINDOW` проходит (окно начинается там, где curfew заканчивается), либо `failing_gate: TIME_WINDOW` и `rule_reference: "A-7 §1"` (05:00 принадлежит curfew). «06» §1.4: «No part of the window may fall inside the zone's curfew» — включительность границ не указана.

## Rationale
Критерий SKY-1 №1, граница на конце curfew. Документация не отвечает, считается ли мгновение 05:00 «частью окна внутри curfew» — OQ-12 (Кандидат). Парный к E2E-OPR-006 кейс.

По коду, требует подтверждения: 05:00–05:30 → PASS (конец curfew `< 05:00`, то есть минута 05:00 в curfew не входит; lib/curfew.ts:14–21, 55–63). Это поведение кода, не требование. После решения OQ-12 Expected result фиксируется одним исходом.

Остальные гейты и условия `TIME_WINDOW` выполнены (длительность 30 мин ∈ 15–240, lead time, overlap). Селекторы — из кода по правилу проекта.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| `zone_code` | `KBP-CTR-3` | Curfew 23:00–05:00 по `A-7` §1 («06» §4) |
| `window_start` | `D 05:00` (местное время зоны) | Ровно конец curfew — граница включительности (OQ-12) |
| `window_end` | `D 05:30` | Вне curfew; длительность 30 мин ∈ 15–240 |
| `requested_altitude_metres` | `100` | ≤ потолка 120 м |
| `flight_purpose` | `Аэрофотосъёмка` | Валидный текст |
| Оператор / пилот / aircraft | `L2` / `R_ADVANCED`, `T − 30 дн` / `900 г` (`C0`) | Остальные гейты проходят |

## Status
Blocked — OQ-12
