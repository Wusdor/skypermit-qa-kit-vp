# API-OPR-003: Длительность окна 241 мин — submit отклоняется гейтом TIME_WINDOW по TSD-4 §3

- **ID:** API-OPR-003
- **Doc ref:** `06-business-rules.md` §1.4 (Duration), §6; `02-state-machine.md` таблица переходов (`SUBMITTED` → `REJECTED`); `01-data-model.md` §FlightRequest (`window_end`, `failing_gate`, `rule_reference`); `03-api-contract.md` #9, #10, #11; OQ-07
- **Role(s):** Оператор (владелец заявки)

## Preconditions
- Оператор зарегистрирован (`POST /api/v1/operators`), клиент держит его session cookie; `authorisation_level = L1` (`03` §Authentication); `status` не `SUSPENDED` — проверить через `GET /api/v1/operators/{id}` (начальный `status` в документации не задан — OQ-18; поведение для `SUSPENDED` не определено — OQ-01).
- Под этим оператором через API созданы пилот (`POST /api/v1/pilots`) и aircraft (`POST /api/v1/aircraft`) с данными из Test data.
- У этого aircraft нет других заявок (условие overlap не может сработать).
- Через `POST /api/v1/flight-requests` создана заявка в `DRAFT` с данными из Test data (`window_end` позже `window_start`, поэтому ограничение `01` §FlightRequest «must be after `window_start`» соблюдено).

## Steps
1. `POST /api/v1/flight-requests/{id}/submit` (момент отправки — `T`).
2. `GET /api/v1/flight-requests/{id}`.

## Expected result
`GET` возвращает заявку с `state = REJECTED`, `failing_gate: TIME_WINDOW` и `rule_reference: "TSD-4 §3"`.

Ответ самого `submit` (шаг 1) кейс не проверяет: код и тело при провале гейта не определены — OQ-07 (`422` по `03` §422 или «200/201 with new state» по `08` §Gate Pipeline).

## Rationale
Правило `06` §1.4: «15–240 minutes, inclusive at both ends», `TSD-4` §3; цитата из `06` §6: `TIME_WINDOW` / Duration out of range → `TSD-4 §3`. Провал гейта при `submit` переводит заявку в `REJECTED` (`02` таблица переходов: «`failing_gate`/`rejection_reason` populated»), а `rule_reference` сохраняется в заявке «alongside `failing_gate`» (`01` §FlightRequest) — поэтому результат наблюдается однозначно через `GET`, в обход OQ-07.

Граничные значения: сторона нарушения, на шаг (1 мин) выше включительной верхней границы 240 мин. Риск R1 (`skypermit-test-plan.md`: «длительность 15–240 мин»). Остальные гейты заведомо проходят (зона `OPEN` без curfew, рейтинг и бэнд подходят, `L1` = требуемый уровень, сертификация текущая на `window_start`), поэтому первым провалом может быть только `TIME_WINDOW`. Прочие условия `TIME_WINDOW` выполнены: lead time ~ 2 сут (≥ 6 ч и ≤ 60 дней), curfew нет, overlap нет. Длительность не зависит от `T`, поэтому точность тайминга не важна.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| `window_start` | дата `T + 2 дн`, `10:00:00Z` | Lead time ≥ 6 ч и ≤ 60 дней (`06` §1.4) — эти условия не мешают |
| `window_end` | та же дата, `14:01:00Z` | Длительность 241 мин — на 1 мин выше границы 240 мин |
| `zone_code` | `DNI-OPN-1` | `OPEN`, curfew нет, бэнды C0–C3, потолок 120 м, `L1` (`06` §4) — `PILOT`, `AIRCRAFT`, `ZONE` и curfew не мешают |
| `requested_altitude_metres` | `100` | Ниже потолка 120 м — гейт `ZONE` проходит |
| `flight_purpose` | `Аэрофотосъёмка` | Валидный текст < 2 000 символов (`01` §Time handling) |
| Пилот: `rating` | `R_BASIC` | Допускает `OPEN` (`06` §1.1) |
| Пилот: `certified_on` | `T − 30 дней` (дата) | Сертификация текущая на `window_start` (18 мес., `06` §2) |
| Пилот: `full_name`, `national_id` | непустое имя; `national_id`, уникальный в прогоне | `national_id` unique (`01` §Pilot) |
| Aircraft: `mtom_grams` | `900` | Бэнд `C0` (`06` §3), разрешён в `DNI-OPN-1` |
| Aircraft: `manufacturer`, `model`, `serial_number` | непустые значения; `serial_number`, уникальный в прогоне | `serial_number` unique (`01` §Aircraft) |

## Status
Untested
