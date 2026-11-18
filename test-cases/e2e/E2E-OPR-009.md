# E2E-OPR-009: Борт 12 001 г (C3) в KBP-CTR-3 — «Check before submitting» показывает провал AIRCRAFT по ZC-2026.1 §2

- **ID:** E2E-OPR-009
- **Jira:** SKY-3
- **Doc ref:** «06 — Business Rules» §1.2, §3, §4, §6; «07 — Clarifications» §1 (отказ принадлежит `AIRCRAFT`, не `ZONE`); «03 — API Contract» §Error semantics, §The 422 body, #13; «04 — Frontend Spec» §Operator portal («Check before submitting», per-gate pass/fail); «05 — Open Questions» (SUSPENDED, №4 — только предусловие); OQ-23 (кандидат реестра QA, `test-plans/open-questions.md`; не вопрос «05»)
- **Role(s):** Оператор (владелец заявки, работает в портале)
- **Техника:** BV — вес на единицу выше границы `C2`/`C3` (12 000 г): минимальное значение категории `C3`, не входящей в permitted bands зоны

## Preconditions
- Те же, что в E2E-OPR-008: оператор не `SUSPENDED` (OQ-01), `authorisation_level = L2` (прямая запись в БД; «06» §4, `OH-1 §4`); пилот `R_ADVANCED`, `certified_on = T − 30 дн` («06» §1.1, §2); aircraft `mtom_grams = 12001` → `C3` («06» §3); зона `KBP-CTR-3` активна, permitted bands C0–C2 («06» §4); других заявок на этот aircraft нет.
- Время: `T` — момент шага 1; дата окна `D` = дата `T + 2 дн`.
- Заявка в `DRAFT` создана в шагах 1–4 (форма не блокирует выбор — E2E-OPR-008).
- Открыты DevTools (вкладка Network) для чтения ответа на `POST /api/v1/flight-requests/{id}/validate`.

## Steps
1. В шапке нажать ссылку «New Request» (`operator-nav-new-request` — components/AppHeader.tsx:12, :83).
2. На форме `flight-request-create-form` (app/operator/requests/new/page.tsx:95) заполнить: `flight-request-zone-select` (:107) = `KBP-CTR-3`; `flight-request-pilot-select` (:118) = пилот; `flight-request-aircraft-select` (:130) = опция с подписью `<manufacturer> <model> (<serial_number>)` борта `mtom_grams = 12001` (вес в подписи не показан); `flight-request-window-start-input` (:144) = `D 12:00`; `flight-request-window-end-input` (:152) = `D 13:00`; `flight-request-altitude-input` (:163) = `100`; `flight-request-purpose-textarea` (:175) = `Аэрофотосъёмка`.
3. Нажать `flight-request-create-submit-button` (:191); дождаться `flight-request-detail` (components/FlightRequestPanel.tsx:88).
4. Нажать `flight-request-validate-button` (components/FlightRequestPanel.tsx:112) и в Network прочитать ответ на `POST /api/v1/flight-requests/{id}/validate` (у сетевого вызова `data-testid` нет — это проверка сети, не элемента).

## Expected result
Не определено — OQ-23: код и тело ответа `POST /api/v1/flight-requests/{id}/validate` при провале гейта. Спорная сторона: `422` с `failing_gate: AIRCRAFT` и `rule_reference: "ZC-2026.1 §2"` («03» §Error semantics, §The 422 body) либо `200` с результатами по гейтам без смены состояния («08» §Gate Pipeline).

Определено для UI: карточка `flight-request-gate-result-AIRCRAFT` (components/GateResultsPanel.tsx:34, :39) показывает провал (`data-gate-status="FAIL"`), а не `ZONE` («04» §Operator portal: per-gate pass/fail; «06» §1.2, §6; «07» §1). Показ ссылки `ZC-2026.1 §2` в карточке строится из тела ответа `validate` — зависит от OQ-23.

## Rationale
Критерий SKY-3 №2. Вес 12 001 г → `C3` («06» §3), `C3` ∉ C0–C2 `KBP-CTR-3` («06» §4) → провал `AIRCRAFT`, `rule_reference: "ZC-2026.1 §2"` («06» §1.2, §6). Буквальный текст `ZC-2026.1` §2 относит провал к зоне, но это ошибка корпуса: «07» §1 переносит отказ в `AIRCRAFT`, «07» главнее «06». Цитата `ZC-2026.1 §2` общая с проверкой высоты в `ZONE` («06» §1.2): различает их `failing_gate`, поэтому кейс проверяет именно карточку `AIRCRAFT`, а не только ссылку. Остальные условия выполнены (`PILOT` проходит, окно 60 мин) — первый провал только `AIRCRAFT`.

Код и тело ответа `validate` при провале гейта документы задают по-разному («03» §Error semantics — `422 {failing_gate, rule_reference, message}`; «08» §Gate Pipeline — «200 with per-gate results (no state change)») — OQ-23, поэтому кейс `Blocked`. По коду, требует подтверждения: `422` через `gateFailure` — app/api/v1/flight-requests/[id]/validate/route.ts:42; провал `AIRCRAFT` для `C3` вне `permitted_bands` с `fail('AIRCRAFT', 'ZC-2026.1 §2', …)` — lib/gates/aircraft-gate.ts:12-18; ссылка в карточке — components/GateResultsPanel.tsx:50-51 (у `<span class="sp-gate__rule">` собственного `data-testid` нет — проверяется текстом внутри `flight-request-gate-result-AIRCRAFT` и по сетевому ответу).

Статус `FAIL` в карточке и порядок гейтов определены документацией, `data-gate-status` и `data-testid` — из кода по правилу проекта; их отсутствие в «04» не пробел документации.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| `zone_code` | `KBP-CTR-3` | `CONTROLLED`, permitted bands C0–C2 («06» §4) |
| Aircraft: `mtom_grams` | `12001` | На единицу выше границы `C2` (12 000 г) → `C3` («06» §3) |
| Пилот: `rating` / `certified_on` | `R_ADVANCED` / `T − 30 дн` | `PILOT` проходит, первым падает `AIRCRAFT` |
| Оператор: `authorisation_level` | `L2` | Равен требуемому для `KBP-CTR-3` |
| `window_start` / `window_end` | `D 12:00` / `D 13:00` | Валидное окно; `AIRCRAFT` идёт раньше `TIME_WINDOW` и от окна не зависит |
| `requested_altitude_metres` | `100` | ≤ потолка 120 м |
| `flight_purpose` | `Аэрофотосъёмка` | Валидный текст |

## Status
Blocked — OQ-23
