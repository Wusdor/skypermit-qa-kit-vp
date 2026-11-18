# E2E-OPR-005: «Check before submitting» не меняет состояние заявки — она остаётся DRAFT

- **ID:** E2E-OPR-005
- **Jira:** SKY-1
- **Doc ref:** «04 — Frontend Spec» §Operator portal («Check before submitting» … «without changing state»); «03 — API Contract» #13 («never changes state»); «02 — State Machine» §States (`DRAFT`), таблица переходов; «05 — Open Questions» (SUSPENDED, №4)
- **Role(s):** Оператор (владелец заявки, работает в портале)
- **Техника:** State transition — действие `validate` не является переходом из таблицы «02»: состояние до и после совпадает (`DRAFT` → `DRAFT`)

## Preconditions
- Оператор зарегистрирован и залогинен, не `SUSPENDED` (OQ-01); `authorisation_level = L2` (прямая запись в БД; «06» §4, `OH-1 §4`).
- Пилот `R_ADVANCED`, `certified_on = T − 30 дн` («06» §1.1, §2); aircraft `mtom_grams = 900` → `C0` («06» §3); зона `KBP-CTR-3` («06» §4).
- Время: `T` — момент шага 1; окно `D 22:00–23:01` на дате `D` = `T + 2 дн`. Результат `validate` (провал или проход `TIME_WINDOW`, OQ-11/OQ-22) для кейса не важен: состояние не меняется при любом исходе.

## Steps
1. В шапке нажать ссылку «New Request» (`operator-nav-new-request` — components/AppHeader.tsx:12, :83).
2. На форме `flight-request-create-form` (app/operator/requests/new/page.tsx:95) заполнить: `flight-request-zone-select` (:107) = `KBP-CTR-3`; `flight-request-pilot-select` (:118) = пилот; `flight-request-aircraft-select` (:130) = aircraft; `flight-request-window-start-input` (:144) = `D 22:00`; `flight-request-window-end-input` (:152) = `D 23:01`; `flight-request-altitude-input` (:163) = `100`; `flight-request-purpose-textarea` (:175) = `Аэрофотосъёмка`.
3. Нажать `flight-request-create-submit-button` (:191); дождаться `flight-request-detail` (components/FlightRequestPanel.tsx:88); убедиться, что `flight-request-detail-state` (components/FlightRequestPanel.tsx:133) показывает `DRAFT`.
4. Нажать `flight-request-validate-button` (components/FlightRequestPanel.tsx:112); дождаться появления результатов в `flight-request-validate-result` (components/GateResultsPanel.tsx:30).

## Expected result
Бейдж `flight-request-detail-state` по-прежнему показывает `DRAFT` («04» §Operator portal: проверка выполняется «without changing state»; «02» §States: `DRAFT` — «Created, never submitted»; `validate` в таблице переходов нет).

## Rationale
Критерий SKY-1 №4. Состояние после `validate` — единственный наблюдаемый результат; кейс сознательно независим от исхода гейтов (OQ-11), поэтому определён и `Untested`. Проверяется именно бейдж в UI; остальное состояние (`state` в БД, `AuditLog`) — уровнем ниже (`API`/`DB`), в этот прогон не входит.

Расхождение с кодом/доком: `StateBadge` выводит `state` с заменой `_` на пробел (components/ui/StateBadge.tsx:17), для `DRAFT` текст не меняется. Блок кнопок «Check before submitting» / «Submit» рендерится только при `state === 'DRAFT'` (components/FlightRequestPanel.tsx:109–121, по коду) — их сохранение подтверждает то же, но как ожидаемый результат не используется.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| `zone_code` | `KBP-CTR-3` | Сценарий SKY-1 («06» §4) |
| `window_start` / `window_end` | `D 22:00` / `D 23:01` | Окно из сценария SKY-1; результат `validate` на кейс не влияет |
| `requested_altitude_metres` | `100` | ≤ потолка 120 м |
| `flight_purpose` | `Аэрофотосъёмка` | Валидный текст |
| Оператор / пилот / aircraft | `L2` / `R_ADVANCED`, `T − 30 дн` / `900 г` (`C0`) | Заявка создаётся и доходит до `validate` без ошибок валидации |

## Status
Untested
