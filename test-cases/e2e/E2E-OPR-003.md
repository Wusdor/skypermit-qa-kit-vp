# E2E-OPR-003: Окно 22:00–22:45 вне поправленного curfew KBP-CTR-3 — «Check before submitting» не возвращает 422, TIME_WINDOW проходит

- **ID:** E2E-OPR-003
- **Jira:** SKY-1
- **Doc ref:** «06 — Business Rules» §1.4 (Curfew; «Curfew values, per zone»), §4; «03 — API Contract» §Flight requests (#13, абзац «Endpoint 13 (`validate`) is important to get right»: «exactly as `submit` would»), §Error semantics, §Gate pipeline; «08 — UML Diagrams» §Gate Pipeline (`validate`: «200 with per-gate results»); «04 — Frontend Spec» §Operator portal («Check before submitting», per-gate pass/fail); «01 — Data Model» §Time handling; «05 — Open Questions» (SUSPENDED, №4 — только предусловие)
- **Role(s):** Оператор (владелец заявки, работает в портале)
- **Техника:** EP — допустимый класс (окно целиком вне curfew `A-7` 23:00–05:00) на стороне, где базовое значение `ZC-2026.1` (22:00–06:00) дало бы отказ

## Preconditions
- Те же, что в E2E-OPR-001: оператор не `SUSPENDED` (OQ-01), `authorisation_level = L2` (прямая запись в БД; «06» §4, `OH-1 §4`); пилот `R_ADVANCED`, `certified_on = T − 30 дн` («06» §1.1, §2); aircraft `mtom_grams = 900` → `C0` («06» §3, §1.2); зона `KBP-CTR-3` активна («06» §4); других заявок на aircraft нет.
- Время: `T` — момент шага 1; дата окна `D` = дата `T + 2 дн` (lead time ≥ 6 ч и ≤ 60 дней), не день перехода на летнее/зимнее время.
- Зависимость подготовки данных (OQ-11, OQ-22): перед прогоном подтвердить, в каком поясе форма принимает время; по коду зона = `Europe/Kyiv` (lib/curfew.ts:7), форма принимает пояс браузера (app/operator/requests/new/page.tsx:48-49). Ввод `D 22:00` / `D 22:45` должен означать 22:00 / 22:45 в местном времени зоны.
- Открыты DevTools (вкладка Network) для чтения ответа на `POST /api/v1/flight-requests/{id}/validate`.

## Steps
1. В шапке нажать ссылку «New Request» (`operator-nav-new-request` — components/AppHeader.tsx:12, :83).
2. На форме `flight-request-create-form` (app/operator/requests/new/page.tsx:95) заполнить: `flight-request-zone-select` (:107) = `KBP-CTR-3`; `flight-request-pilot-select` (:118) = пилот; `flight-request-aircraft-select` (:130) = aircraft; `flight-request-window-start-input` (:144) = `D 22:00`; `flight-request-window-end-input` (:152) = `D 22:45`; `flight-request-altitude-input` (:163) = `100`; `flight-request-purpose-textarea` (:175) = `Аэрофотосъёмка`.
3. Нажать `flight-request-create-submit-button` (:191); дождаться `flight-request-detail` (components/FlightRequestPanel.tsx:88).
4. Нажать `flight-request-validate-button` (components/FlightRequestPanel.tsx:112) и в Network прочитать ответ на `POST /api/v1/flight-requests/{id}/validate` (у сетевого вызова `data-testid` нет).

## Expected result
Ответа `422` нет, `TIME_WINDOW` = PASS: ответ на `POST /api/v1/flight-requests/{id}/validate` — не `422` («03» §Error semantics: `422` — отказ по бизнес-правилу; окно вне curfew гейт `TIME_WINDOW` не проваливает — «06» §1.4); `failing_gate` и `rule_reference` в ответе нет. В UI карточка `flight-request-gate-result-TIME_WINDOW` (components/GateResultsPanel.tsx:34, :39) имеет `data-gate-status="PASS"` («04» §Operator portal: per-gate pass/fail).
## Rationale
Критерий SKY-1 №5: 22:00–22:45 — вне поправленной комендантской часы 23:00–05:00 (`A-7` §1), хотя внутри базовой 22:00–06:00 (`ZC-2026.1` §3). Кейс проверяет, что действует значение поправки, а не каталога («06» §1.4: `A-7` §4 — поправка главнее; «Always check the amendment register»). Конец окна 22:45 на 15 мин раньше начала curfew — граница (OQ-12) не затронута. Остальные условия `TIME_WINDOW` выполнены (lead time, 45 мин ∈ 15–240, overlap нет), остальные гейты проходят.

Успех `validate` — `200` по «08» §Gate Pipeline; «03» #13 код успеха не называет, а `422` по «03» §Error semantics — только отказ по бизнес-правилу. Поэтому проверка «не `422`» верна и по «03», и по «08».

Если пояс ввода формы и пояс зоны не совпадают, окно может попасть в curfew — это ошибка подготовки данных (см. Preconditions), а не вариант ожидаемого результата. Селекторы — из кода по правилу проекта.

Статус `Untested` — решение QA на гейте: ожидание задано «06» §1.4 для местного времени зоны; OQ-11/OQ-22 влияют на подготовку данных. tc-verifier считает, что нужен `Blocked` — расхождение зафиксировано.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| `zone_code` | `KBP-CTR-3` | Curfew 23:00–05:00 по `A-7` §1; общее значение каталога 22:00–06:00 здесь не действует («06» §4) |
| `window_start` | `D 22:00` (местное время зоны) | Внутри базового curfew, вне `A-7` |
| `window_end` | `D 22:45` | Вне `A-7`-curfew (до 23:00); длительность 45 мин ∈ 15–240 |
| `requested_altitude_metres` | `100` | ≤ потолка 120 м |
| `flight_purpose` | `Аэрофотосъёмка` | Валидный текст |
| Оператор / пилот / aircraft | `L2` / `R_ADVANCED`, `T − 30 дн` / `900 г` (`C0`) | Все остальные условия валидны (критерий №5) |

## Status
Untested
