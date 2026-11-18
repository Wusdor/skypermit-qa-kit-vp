# E2E-OPR-012: Борт ровно 12 000 г (C2) в KBP-CTR-3 — гейт AIRCRAFT показан как пройденный

- **ID:** E2E-OPR-012
- **Jira:** SKY-3
- **Doc ref:** «06 — Business Rules» §1.2, §3 («exactly 12,000 g is `C2`»), §4; «07 — Clarifications» §1; «04 — Frontend Spec» §Operator portal («Check before submitting», per-gate pass/fail); «03 — API Contract» #13, §Gate pipeline; «05 — Open Questions» (SUSPENDED, №4 — только предусловие)
- **Role(s):** Оператор (владелец заявки, работает в портале)
- **Техника:** BV — вес на самой границе `C2` (12 000 г, верхняя граница включена): допустимая сторона, парная к E2E-OPR-009 (12 001 г)

## Preconditions
- Оператор зарегистрирован и залогинен в портале, `status` не `SUSPENDED` (OQ-01); `authorisation_level = L2` (регистрация даёт `L1`; эндпоинта повышения нет — прямая запись в БД; «06» §4, `OH-1 v2.0 §4`).
- Пилот: `rating = R_ADVANCED` допускает `CONTROLLED` («06» §1.1), `certified_on = T − 30 дн` («06» §2).
- Aircraft: `mtom_grams = 12000` → `C2` («06» §3: верхняя граница `C2` включена); `C2` ∈ permitted bands `KBP-CTR-3` (C0–C2, «06» §4, §1.2). Запомнить подпись борта в списке: `<manufacturer> <model> (<serial_number>)` (вес в подписи опции не показан, app/operator/requests/new/page.tsx:135).
- Зона `KBP-CTR-3` активна («06» §4); других заявок на этот aircraft нет.
- Время: `T` — момент шага 1; `D` = дата `T + 2 дн`.

## Steps
1. В шапке нажать ссылку «New Request» (`operator-nav-new-request` — components/AppHeader.tsx:12, :83).
2. На форме `flight-request-create-form` (app/operator/requests/new/page.tsx:95) заполнить: `flight-request-zone-select` (:107) = `KBP-CTR-3`; `flight-request-pilot-select` (:118) = пилот `R_ADVANCED`; `flight-request-aircraft-select` (:130) = опция с подписью `<manufacturer> <model> (<serial_number>)` борта из предусловий (выбирать по label после загрузки списка бортов — он грузится асинхронно); `flight-request-window-start-input` (:144) = `D 12:00`; `flight-request-window-end-input` (:152) = `D 13:00`; `flight-request-altitude-input` (:163) = `100`; `flight-request-purpose-textarea` (:175) = `Аэрофотосъёмка`.
3. Нажать `flight-request-create-submit-button` (:191); дождаться `flight-request-detail` (components/FlightRequestPanel.tsx:88).
4. Нажать `flight-request-validate-button` (components/FlightRequestPanel.tsx:112); дождаться результатов в `flight-request-validate-result` (components/GateResultsPanel.tsx:30).

## Expected result
Карточка `flight-request-gate-result-AIRCRAFT` (components/GateResultsPanel.tsx:34, :39) имеет `data-gate-status="PASS"` («04» §Operator portal: per-gate pass/fail; «06» §3: 12 000 г — `C2`; «06» §1.2, §4: `C2` входит в permitted bands `KBP-CTR-3`).

## Rationale
Критерий SKY-3 №4. Граница `C2`/`C3`: 12 000 г включительно — `C2` («06» §3), `C2` разрешён в зоне («06» §4), значит `AIRCRAFT` проходит. Вместе с E2E-OPR-009 (12 001 г) кейс фиксирует обе стороны границы и ловит ошибку «строго меньше». Окно, высота и пилот выбраны так, что остальные гейты не влияют на статус `AIRCRAFT`: он определяется до `ZONE` и `TIME_WINDOW` («06» Evaluation order), поэтому при любом результате `TIME_WINDOW` (OQ-11, OQ-22) карточка `AIRCRAFT` остаётся `PASS`. Дубля E2E-OPR-004 нет: там `AIRCRAFT` проходит при 900 г (`C0`), здесь — на границе `C2`.

По коду, требует подтверждения: `computeWeightBand` — `mtom <= 12000` даёт `C2` (lib/derived.ts:28); `C2` ∈ permitted_bands → проверка `includes` (lib/gates/aircraft-gate.ts:12), `return pass()` (:20). `data-testid` и `data-gate-status` — из кода по правилу проекта.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| Aircraft: `mtom_grams` | `12000` | Верхняя граница `C2`, включена («06» §3) |
| `zone_code` | `KBP-CTR-3` | permitted bands C0–C2 («06» §4) |
| Пилот: `rating` / `certified_on` | `R_ADVANCED` / `T − 30 дн` | `PILOT` проходит, конвейер доходит до `AIRCRAFT` |
| Оператор: `authorisation_level` | `L2` | Равен требуемому для `KBP-CTR-3` |
| `window_start` / `window_end` | `D 12:00` / `D 13:00` | Валидное окно; на статус `AIRCRAFT` не влияет |
| `requested_altitude_metres` | `100` | ≤ потолка 120 м |
| `flight_purpose` | `Аэрофотосъёмка` | Валидный текст |

## Status
Untested
