# API-OPR-011: После submit с lead time 3 ч заявка REJECTED, failing_gate и rejection_reason заполнены

- **ID:** API-OPR-011
- **Doc ref:** `06-business-rules.md` §1.4 (Minimum lead time), §6; `02-state-machine.md` таблица переходов (`SUBMITTED` gates fail → `REJECTED`), §States (`REJECTED`); `01-data-model.md` §FlightRequest (`rejection_reason`, `failing_gate`); `03-api-contract.md` #9, #10, #11; OQ-07
- **Technique:** ST — `submit` → `GET`: `DRAFT` → `REJECTED` при провале `TIME_WINDOW`
- **Role(s):** Оператор (владелец заявки)

## Preconditions
- Оператор зарегистрирован (`POST /api/v1/operators`), клиент держит его session cookie; `authorisation_level = L1` (`03` §Authentication: регистрация всегда создаёт `L1`).
- Под этим оператором через API созданы пилот (`POST /api/v1/pilots`) и aircraft (`POST /api/v1/aircraft`) с данными из Test data; зона `DNI-OPN-1` (`GET /api/v1/zones/DNI-OPN-1`) — `OPEN`, без curfew, `L1`.
- У этого aircraft нет других заявок (условие overlap не может сработать).
- Заранее выбран момент `T` — планируемое время шага 2 (UTC, точность до минуты). Шаг 1 выполняется в интервале [`T − 30 с`, `T`].
- Ранние гейты и остальные условия `TIME_WINDOW` заведомо проходят; нарушено только условие минимального lead time (3 ч — далеко от порога, OQ-20 на результат не влияет).

## Steps
1. `POST /api/v1/flight-requests`. Auth: operator session.
   Body: `pilot_id`, `aircraft_id` из Preconditions; `zone_code`, `window_start`, `window_end`, `requested_altitude_metres`, `flight_purpose` — из Test data.
   Save `id` как {{request_id}}.
2. `POST /api/v1/flight-requests/{{request_id}}/submit`. Auth: operator session.
3. `GET /api/v1/flight-requests/{{request_id}}`. Auth: operator session.

## Expected result
`GET` (шаг 3) возвращает заявку с `state = REJECTED`, `failing_gate = TIME_WINDOW` и непустым `rejection_reason`.

Ответ самого `submit` (шаг 2) кейс не проверяет — это API-OPR-010 (код и тело при провале гейта — OQ-07).

## Rationale
Критерий SKY-2 AC3: после `submit` заявка `REJECTED`, `failing_gate` и `rejection_reason` заполнены. `02` таблица переходов: «`SUBMITTED` (gates fail, automatic) → `REJECTED` — `failing_gate`/`rejection_reason` populated»; §States: `REJECTED` — «`failing_gate` and `rejection_reason` are populated»; `01` §FlightRequest: `failing_gate` «populated only on gate-failure rejection». Текст `rejection_reason` в документации не задан — проверяется только, что значение непустое.

API-OPR-001 проверяет `state`, `failing_gate` и `rule_reference` для значения 5 ч 59 мин; этот кейс отдельно закрывает `rejection_reason` из критерия.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| `T` | планируемый момент шага 2, UTC, точность до минуты | Опорная точка для относительных значений |
| `window_start` | `T + 3 ч` (UTC), задаётся при создании `DRAFT` | Представитель класса lead time < 6 ч |
| `window_end` | `window_start + 60 мин` | Длительность внутри 15–240 мин (`06` §1.4, `TSD-4` §3) |
| `zone_code` | `DNI-OPN-1` | `OPEN`, curfew нет, бэнды C0–C3, потолок 120 м, `L1` (`06` §4) |
| `requested_altitude_metres` | `100` | Ниже потолка 120 м — гейт `ZONE` проходит |
| `flight_purpose` | `Аэрофотосъёмка` | Валидный текст < 2 000 символов (`01` §Time handling) |
| Пилот: `rating` | `R_BASIC` | Допускает `OPEN` (`06` §1.1) |
| Пилот: `certified_on` | `T − 30 дней` (дата) | Сертификация текущая на `window_start` (18 мес., `06` §2) |
| Пилот: `full_name`, `national_id` | непустое имя; `national_id`, уникальный в прогоне | `national_id` unique (`01` §Pilot) |
| Aircraft: `mtom_grams` | `900` | Бэнд `C0` (`06` §3), разрешён в `DNI-OPN-1` |
| Aircraft: `manufacturer`, `model`, `serial_number` | непустые значения; `serial_number`, уникальный в прогоне | `serial_number` unique (`01` §Aircraft) |

## Status
Untested
