# E2E-OPR-010: При провале AIRCRAFT гейт PILOT (R_ADVANCED, зона CONTROLLED) показан как пройденный

- **ID:** E2E-OPR-010
- **Jira:** SKY-3
- **Doc ref:** «06 — Business Rules» §1.1, §2, §4, «Evaluation order»; «03 — API Contract» §Gate pipeline (порядок `PILOT → AIRCRAFT → …`), #13; «04 — Frontend Spec» §Operator portal («Check before submitting», per-gate pass/fail); «05 — Open Questions» (SUSPENDED, №4 — только предусловие)
- **Role(s):** Оператор (владелец заявки, работает в портале)
- **Техника:** EP — допустимый класс для `PILOT`: рейтинг `R_ADVANCED` × зона `CONTROLLED` при действующей сертификации

## Preconditions
- Те же, что в E2E-OPR-009: оператор не `SUSPENDED` (OQ-01), `authorisation_level = L2` («06» §4, `OH-1 §4`; прямая запись в БД); пилот `R_ADVANCED`, `certified_on = T − 30 дн` («06» §1.1: `R_ADVANCED` → `OPEN`, `CONTROLLED`; §2: 18 мес.); aircraft `mtom_grams = 12001` → `C3` («06» §3); зона `KBP-CTR-3` — `CONTROLLED`, C0–C2 («06» §4).
- Время: `T` — момент шага 1; `D` = дата `T + 2 дн`.

## Steps
1. В шапке нажать ссылку «New Request» (`operator-nav-new-request` — components/AppHeader.tsx:12, :83).
2. На форме `flight-request-create-form` (app/operator/requests/new/page.tsx:95) заполнить: `flight-request-zone-select` (:107) = `KBP-CTR-3`; `flight-request-pilot-select` (:118) = пилот `R_ADVANCED`; `flight-request-aircraft-select` (:130) = опция с подписью `<manufacturer> <model> (<serial_number>)` борта `mtom_grams = 12001` (вес в подписи не показан); `flight-request-window-start-input` (:144) = `D 12:00`; `flight-request-window-end-input` (:152) = `D 13:00`; `flight-request-altitude-input` (:163) = `100`; `flight-request-purpose-textarea` (:175) = `Аэрофотосъёмка`.
3. Нажать `flight-request-create-submit-button` (:191); дождаться `flight-request-detail` (components/FlightRequestPanel.tsx:88).
4. Нажать `flight-request-validate-button` (components/FlightRequestPanel.tsx:112); дождаться результатов в `flight-request-validate-result` (components/GateResultsPanel.tsx:30).

## Expected result
Карточка `flight-request-gate-result-PILOT` (components/GateResultsPanel.tsx:34, :39) имеет `data-gate-status="PASS"` («04» §Operator portal: per-gate pass/fail; «06» §1.1: `R_ADVANCED` покрывает `CONTROLLED`, сертификация текущая; §«Evaluation order»: `PILOT` идёт первым и предшествует провалу `AIRCRAFT`).

## Rationale
Критерий SKY-3 №3, первая часть: пилот проходит. Условия `PILOT` выполнены («06» §1.1) и от других гейтов не зависят, порядок `PILOT → AIRCRAFT` фиксирован («06» Evaluation order), поэтому `PILOT` предшествует провалу `AIRCRAFT` при обеих трактовках OQ-13 (только первый провал или все четыре) — результат «пройден» определён, кейс `Untested`. Пояс ввода окна (OQ-22, кандидат реестра QA) на `PILOT` не влияет: сдвиг до ±14 ч при запасе более 16 мес. Форма ответа `validate` при провале `AIRCRAFT` (`422` или `200` с результатами по гейтам — OQ-23, кандидат реестра QA) на ожидание не влияет: `PILOT` не упал при любом механизме. Отображение гейтов после первого провала (`ZONE`, `TIME_WINDOW`) — E2E-OPR-011. Сам провал `AIRCRAFT` — E2E-OPR-009.

По коду, требует подтверждения: статус `PASS` для гейтов до упавшего панель выводит по порядку гейтов, а не получает от API (components/GateResultsPanel.tsx:13-21, `rowStatus`). Пилот проходит `PILOT` для `CONTROLLED` и текущей сертификации (lib/gates/pilot-gate.ts:8, :23-31, по коду). `data-testid` и `data-gate-status` — из кода по правилу проекта.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| Пилот: `rating` | `R_ADVANCED` | Допускает `OPEN`, `CONTROLLED`; `KBP-CTR-3` — `CONTROLLED` («06» §1.1, §4) |
| Пилот: `certified_on` | `T − 30 дн` | Меньше 18 мес. на `window_start` («06» §2) |
| `zone_code` | `KBP-CTR-3` | Зона из сценария SKY-3 |
| Aircraft: `mtom_grams` | `12001` | `C3` — провал `AIRCRAFT` после прохода `PILOT` |
| `window_start` / `window_end` | `D 12:00` / `D 13:00` | Валидное окно; `PILOT` проверяет currency на `window_start` (`T + 2 дн`): к полёту сертификату 32 дня при пределе 18 мес., запас более 16 мес. |

## Status
Untested
