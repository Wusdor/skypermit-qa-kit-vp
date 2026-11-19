# API-OPR-009: После validate с lead time 3 ч заявка остаётся в DRAFT

- **ID:** API-OPR-009
- **Doc ref:** `06-business-rules.md` §1.4 (Minimum lead time), §6; `03-api-contract.md` #9, #11, #13; `02-state-machine.md` §States (`DRAFT`); `08` §Gate Pipeline; SKY-2 AC1; OQ-23
- **Technique:** ST — `validate` не меняет состояние `DRAFT` при провале `TIME_WINDOW`
- **Role(s):** Оператор (владелец заявки)

## Preconditions
- Оператор зарегистрирован (`POST /api/v1/operators`), клиент держит его session cookie; `authorisation_level = L1` (`03` §Authentication & authorisation: регистрация всегда создаёт `L1`).
- Под этим оператором через API созданы пилот (`POST /api/v1/pilots`) и aircraft (`POST /api/v1/aircraft`) с данными из Test data; зона `DNI-OPN-1` (`GET /api/v1/zones/DNI-OPN-1`) — `OPEN`, без curfew, `L1`.
- У этого aircraft нет других заявок (условие overlap не может сработать).
- Заранее выбран момент `T` — планируемое время шага 2 (UTC, точность до минуты). Шаг 1 выполняется в интервале [`T − 30 с`, `T`].
- Ранние гейты и остальные условия `TIME_WINDOW` заведомо проходят; нарушено только условие минимального lead time (3 ч — далеко от порога, OQ-20 на результат не влияет).

## Steps
1. `POST /api/v1/flight-requests`. Auth: operator session.
   Body: `pilot_id`, `aircraft_id` из Preconditions; `zone_code`, `window_start`, `window_end`, `requested_altitude_metres`, `flight_purpose` — из Test data.
   Save `id` как {{request_id}}.
2. `POST /api/v1/flight-requests/{{request_id}}/validate`. Auth: operator session.
   Проверка-предохранитель (SKY-2 AC1): статус `422`, в теле `failing_gate` = `TIME_WINDOW`, `rule_reference` = `TSD-4 §2.1` (отличает lead time от curfew), `message` — непустая строка. Без неё кейс зелёный и тогда, когда гейт прошёл.
3. `GET /api/v1/flight-requests/{{request_id}}`. Auth: operator session.

## Expected result
`GET` (шаг 3) возвращает заявку с `state = DRAFT`. Если проверка шага 2 (предохранитель) не выполнена, кейс не пройден: предусловие перехода не выполнено.

## Rationale
Критерий SKY-2 AC1: после `validate` с lead time < 6 ч «состояние остаётся DRAFT». `03` #13: `validate` — «dry-run all gates without changing state», «never changes state». Переход `DRAFT` → другое состояние в `02` возможен только действиями `submit` / `cancel`; `validate` в таблице переходов нет. Исход одного шага ST: `validate` → `GET`. Предохранитель на шаге 2 — по SKY-2 AC1 полностью: `422`, `failing_gate` = `TIME_WINDOW`, `rule_reference` = `TSD-4 §2.1`, `message` — непустая строка. Код `422` взят из критерия по правилу CLAUDE.md (критерии Jira при противоречии SPD): `03` и `08` расходятся (OQ-23: `422` по 03, `200` с результатами гейтов по 08).

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| `T` | планируемый момент шага 2, UTC, точность до минуты | Опорная точка для относительных значений |
| `window_start` | `T + 3 ч` (UTC), задаётся при создании `DRAFT` | Представитель класса lead time < 6 ч — `validate` вернёт провал `TIME_WINDOW` |
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
