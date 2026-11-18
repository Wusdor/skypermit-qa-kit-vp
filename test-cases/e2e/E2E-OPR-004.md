# E2E-OPR-004: После «Check before submitting» гейты PILOT, AIRCRAFT и ZONE показаны как пройденные

- **ID:** E2E-OPR-004
- **Jira:** SKY-1
- **Doc ref:** «04 — Frontend Spec» §Operator portal («Check before submitting», per-gate pass/fail); «06 — Business Rules» §1.1, §1.2, §1.3, §4; «03 — API Contract» #13, §Gate pipeline; «05 — Open Questions» (SUSPENDED, №4 — только предусловие); OQ-13
- **Role(s):** Оператор (владелец заявки, работает в портале)
- **Техника:** EP — допустимый класс для каждого из трёх гейтов (рейтинг, весовая категория, зона/уровень допуска)

## Preconditions
- Оператор зарегистрирован и залогинен, не `SUSPENDED` (поведение для `SUSPENDED` не определено — OQ-01); `authorisation_level = L2` (регистрация даёт `L1`; эндпоинта повышения нет — прямая запись в БД; «06» §4, `OH-1 §4`).
- Пилот: `rating = R_ADVANCED` допускает `CONTROLLED` («06» §1.1), `certified_on = T − 30 дн` — сертификация текущая («06» §2).
- Aircraft: `mtom_grams = 900` → `C0` («06» §3) ∈ `permitted_bands` `KBP-CTR-3` («06» §1.2, §4).
- Зона `KBP-CTR-3` активна; `requested_altitude_metres = 100` ≤ потолка 120 м; `L2` ≥ требуемого `L2` («06» §1.3, §4).
- Время: `T` — момент шага 1; окно `D 22:00–23:01` на дате `D` = `T + 2 дн` (lead time ≥ 6 ч и ≤ 60 дней). Состояние `TIME_WINDOW` кейс не проверяет (зависит от OQ-11/OQ-22, см. E2E-OPR-001); три проверяемых гейта от окна не зависят — порядок `PILOT → AIRCRAFT → ZONE → TIME_WINDOW` («06» Evaluation order).

## Steps
1. В шапке нажать ссылку «New Request» (`operator-nav-new-request` — components/AppHeader.tsx:12, :83).
2. На форме `flight-request-create-form` (app/operator/requests/new/page.tsx:95) заполнить: `flight-request-zone-select` (:107) = `KBP-CTR-3`; `flight-request-pilot-select` (:118) = пилот; `flight-request-aircraft-select` (:130) = aircraft; `flight-request-window-start-input` (:144) = `D 22:00`; `flight-request-window-end-input` (:152) = `D 23:01`; `flight-request-altitude-input` (:163) = `100`; `flight-request-purpose-textarea` (:175) = `Аэрофотосъёмка`.
3. Нажать `flight-request-create-submit-button` (:191); дождаться `flight-request-detail` (components/FlightRequestPanel.tsx:88).
4. Нажать `flight-request-validate-button` (components/FlightRequestPanel.tsx:112).

## Expected result
В панели `flight-request-validate-result` (components/GateResultsPanel.tsx:30) карточки `flight-request-gate-result-PILOT`, `flight-request-gate-result-AIRCRAFT` и `flight-request-gate-result-ZONE` (:34, :39) имеют `data-gate-status="PASS"` («04» §Operator portal: per-gate pass/fail result; условия гейтов выполнены — «06» §1.1, §1.2, §1.3).

## Rationale
Критерий SKY-1 №3. Три гейта предшествуют `TIME_WINDOW` («06» Evaluation order; «03» §Gate pipeline), тестовые данные удовлетворяют каждому условию («06» §1.1–§1.3). От окна зависит только проверка `PILOT` currency: сертификация проверяется на `window_start`, а не на моменте подачи («06» §1.1, §2); при `certified_on = T − 30 дн` и пороге 18 мес. результат не меняется при любом окне из кейса. Кейс одинаково определён при любом результате `TIME_WINDOW` и поэтому не блокируется OQ-11. Окно 22:00–23:01 выбрано намеренно: это сценарий критерия SKY-1 №3 — `TIME_WINDOW` = FAIL, предыдущие гейты (`PILOT`, `AIRCRAFT`, `ZONE`) показаны пройденными. OQ-13 (`validate` показывает только первый провал или все четыре): для гейтов до провалившегося обе трактовки дают «пройден», поэтому на этот кейс вопрос не влияет; он влияет на отображение `TIME_WINDOW` и гейтов после первого провала, их кейс не проверяет.

По коду, требует подтверждения: статус `PASS` для гейтов, предшествующих провалу, выводится панелью по порядку гейтов, а не получается от API (components/GateResultsPanel.tsx:13–21, `rowStatus`). Поведение («per-gate pass/fail») определено «04» §Operator portal и «06» §1.1–§1.3; `data-testid` (`flight-request-gate-result-*`) и атрибут `data-gate-status` берутся из кода по правилу проекта — их отсутствие в «04» не пробел документации.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| `zone_code` | `KBP-CTR-3` | `CONTROLLED`, `C0`–`C2`, 120 м, `L2` («06» §4) |
| `requested_altitude_metres` | `100` | ≤ 120 м — `ZONE` проходит |
| Оператор: `authorisation_level` | `L2` | ≥ требуемого для зоны — `ZONE` проходит |
| Пилот: `rating` / `certified_on` | `R_ADVANCED` / `T − 30 дн` | Допуск к `CONTROLLED`; < 18 мес. — `PILOT` проходит |
| Aircraft: `mtom_grams` | `900` | `C0` ∈ C0–C2 — `AIRCRAFT` проходит |
| `window_start` / `window_end` | `D 22:00` / `D 23:01` | Окно из сценария SKY-1; для проверяемых гейтов значения не важны |

## Status
Untested
