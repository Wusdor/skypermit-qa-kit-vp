# E2E-OPR-001: Окно 22:00–23:01 заходит в curfew KBP-CTR-3 на 1 минуту — «Check before submitting» показывает провал TIME_WINDOW по A-7 §1

- **ID:** E2E-OPR-001
- **Jira:** SKY-1
- **Doc ref:** «06 — Business Rules» §1.4 (Curfew; «Curfew values, per zone»), §4, §6; «03 — API Contract» §Error semantics, §The 422 body, #13 (`validate` прогоняет гейты «exactly as `submit` would»), §Gate pipeline; «04 — Frontend Spec» §Operator portal («Check before submitting», per-gate pass/fail); «01 — Data Model» §Time handling; «05 — Open Questions» (SUSPENDED, №4 — только предусловие); «08 — UML Diagrams» §Gate Pipeline; OQ-23
- **Role(s):** Оператор (владелец заявки, работает в портале)
- **Техника:** BV — сторона нарушения curfew на шаг (1 мин) за границей 23:00; окно начинается вне curfew, заканчивается внутри

## Preconditions
- Оператор зарегистрирован (`POST /api/v1/operators`) и залогинен в портале (session cookie), `status` не `SUSPENDED` (поведение для `SUSPENDED` не определено — «05» №4 / OQ-01). `authorisation_level = L2`: регистрация создаёт `L1` («04» §Operator portal), а `KBP-CTR-3` требует `L2` («06» §4, `OH-1 §4`); эндпоинта повышения нет («out-of-band admin action», «03» §Authentication) — прямая запись в БД.
- Пилот оператора (`POST /api/v1/pilots`): `rating = R_ADVANCED` допускает `CONTROLLED` («06» §1.1), `certified_on = T − 30 дн` — сертификация текущая на `window_start` («06» §2).
- Aircraft оператора (`POST /api/v1/aircraft`): `mtom_grams = 900` → `C0` («06» §3); `C0` входит в `permitted_bands` `KBP-CTR-3` («06» §4, §1.2).
- Зона `KBP-CTR-3` активна («06» §4). Других заявок на этот aircraft нет (overlap невозможен, «06» §1.4).
- Время: `T` — момент шага 1; дата окна `D` = дата `T + 2 дн` (lead time ≥ 6 ч и ≤ 60 дней, «06» §1.4), не день перехода на летнее/зимнее время.
- Зависимость подготовки данных (OQ-11, OQ-22): перед прогоном подтвердить, в каком поясе форма принимает время; по коду зона = `Europe/Kyiv` (lib/curfew.ts:7), форма принимает пояс браузера (app/operator/requests/new/page.tsx:48-49). Ввод `D 22:00` / `D 23:01` должен означать 22:00 / 23:01 в местном времени зоны — иначе окно не соответствует данным кейса.
- Открыты DevTools (вкладка Network) для чтения ответа на `POST /api/v1/flight-requests/{id}/validate`.

## Steps
1. В шапке нажать ссылку «New Request» (`operator-nav-new-request` — components/AppHeader.tsx:12, рендер `data-testid={n.testid}` :83).
2. На форме `flight-request-create-form` (app/operator/requests/new/page.tsx:95) заполнить: `flight-request-zone-select` (:107) = `KBP-CTR-3`; `flight-request-pilot-select` (:118) = пилот из предусловий; `flight-request-aircraft-select` (:130) = aircraft из предусловий; `flight-request-window-start-input` (:144) = `D 22:00`; `flight-request-window-end-input` (:152) = `D 23:01`; `flight-request-altitude-input` (:163) = `100`; `flight-request-purpose-textarea` (:175) = `Аэрофотосъёмка`.
3. Нажать `flight-request-create-submit-button` (:191); дождаться детали заявки `flight-request-detail` (components/FlightRequestPanel.tsx:88).
4. Нажать `flight-request-validate-button` (components/FlightRequestPanel.tsx:112) и в Network прочитать ответ на `POST /api/v1/flight-requests/{id}/validate` (у сетевого вызова `data-testid` нет — это проверка сети, не элемента).

## Expected result
Не определено — OQ-23: код и тело ответа `POST /api/v1/flight-requests/{id}/validate` при провале гейта. Спорная сторона: `422` с `failing_gate: TIME_WINDOW` и `rule_reference: "A-7 §1"` («03» §Error semantics, §The 422 body) либо `200` с результатами по гейтам без смены состояния («08» §Gate Pipeline).

Определено для UI: карточка `flight-request-gate-result-TIME_WINDOW` (components/GateResultsPanel.tsx:34, :39) показывает провал (`data-gate-status="FAIL"`) со ссылкой `A-7 §1`, а не `ZC-2026.1 §3` («04» §Operator portal: per-gate pass/fail; «06» §1.4, §6).

## Rationale
Критерии SKY-1 №1 и №2: любая часть окна в 23:00–05:00 → провал `TIME_WINDOW`, причина цитирует `A-7 §1`, а не `ZC-2026.1 §3` («06» §1.4: «No part of the window may fall inside the zone's curfew… minute-by-minute»; §6: curfew `KBP-CTR-3`/`ODS-CTR-5` → `A-7 §1`; `A-7` §4 — поправка главнее). Код и тело ответа `validate` при провале гейта документы задают по-разному («03» §Error semantics, §The 422 body — `422 {failing_gate, rule_reference, message}`; «08» §Gate Pipeline — «200 with per-gate results (no state change)») — OQ-23, поэтому кейс `Blocked`. По коду, требует подтверждения: `422 {failing_gate: TIME_WINDOW, rule_reference: A-7 §1, message}` — app/api/v1/flight-requests/[id]/validate/route.ts:42 (`gateFailure`). Pass/fail гейтов в UI определён «04»; показ `A-7 §1` в карточке строится из тела ответа `validate` — по коду, требует подтверждения (OQ-23).

Граница: конец окна 23:01 на минуту за началом curfew 23:00; окно не касается границы, поэтому включительность (OQ-12) не затрагивается. Старт 22:00 вне curfew — защита от реализации, проверяющей только концы окна. Кейс отличает значение `A-7` (23:00) от базового: окно 22:00–23:01 внутри базового curfew 22:00–06:00 тоже, различает кейс E2E-OPR-003 (22:00–22:45: при `A-7` проходит, при базовом — нет).

Если пояс ввода формы и пояс зоны не совпадают, окно в curfew не попадёт, и результат будет другим — это ошибка подготовки данных (см. Preconditions), а не вариант ожидаемого результата.

Остальные гейты заведомо проходят (`PILOT`, `AIRCRAFT`, `ZONE`), прочие условия `TIME_WINDOW` выполнены (lead time, длительность 61 мин ∈ 15–240, overlap нет) — первым провалом может быть только `TIME_WINDOW`. Дубль уровня API — API-OPR-004 (через `submit`); здесь — путь через форму и `validate`.

Селекторы: `data-testid` берутся из кода по правилу проекта; их отсутствие в «04» не пробел документации. У `<p>` с причиной и `<span class="sp-gate__rule">` с цитатой собственного `data-testid` нет (components/GateResultsPanel.tsx:50-51), поэтому цитата проверяется по сетевому ответу.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| `zone_code` | `KBP-CTR-3` | `CONTROLLED`, curfew 23:00–05:00 по `A-7` §1, `C0`–`C2`, потолок 120 м, `L2` («06» §4) |
| `window_start` | `D 22:00` (местное время зоны) | Вне curfew — проверка «не только концы окна» |
| `window_end` | `D 23:01` | Заходит в curfew на 1 мин; длительность 61 мин ∈ 15–240 («06» §1.4) |
| `requested_altitude_metres` | `100` | ≤ потолка 120 м — `ZONE` проходит |
| `flight_purpose` | `Аэрофотосъёмка` | Валидный текст < 2 000 символов («01» §Time handling) |
| Оператор: `authorisation_level` | `L2` | Равен требуемому для `KBP-CTR-3` («06» §4) |
| Пилот: `rating` / `certified_on` | `R_ADVANCED` / `T − 30 дн` | Допуск к `CONTROLLED`; сертификация текущая |
| Aircraft: `mtom_grams` | `900` | Верхняя граница `C0` («06» §3), разрешён в зоне |

## Status
Blocked — OQ-23
