# API-OPR-006: Lead time 6 ч 01 мин — submit проходит TIME_WINDOW по lead time, заявка в UNDER_REVIEW

- **ID:** API-OPR-006
- **Doc ref:** `06-business-rules.md` §1.4 (Minimum lead time), §6; `02-state-machine.md` таблица переходов (`DRAFT` submit → `SUBMITTED` → `UNDER_REVIEW`), §States (`UNDER_REVIEW`); `03-api-contract.md` #9, #10, #11; OQ-07; OQ-20; OQ-23
- **Technique:** BV — сторона прохода, на шаг (1 мин) выше порога 6 ч
- **Role(s):** Оператор (владелец заявки)

## Preconditions
- Оператор зарегистрирован (`POST /api/v1/operators`), клиент держит его session cookie; `authorisation_level = L1` (`03` §Authentication: регистрация всегда создаёт `L1`); `status` не `SUSPENDED` — проверить через `GET /api/v1/operators/{id}` (начальный `status` в документации не задан — OQ-18; поведение для `SUSPENDED` не определено — OQ-01).
- Под этим оператором через API созданы пилот (`POST /api/v1/pilots`) и aircraft (`POST /api/v1/aircraft`) с данными из Test data; зона `DNI-OPN-1` (`GET /api/v1/zones/DNI-OPN-1`) — `OPEN`, без curfew, `L1`.
- У этого aircraft нет других заявок (условие overlap не может сработать).
- Заранее выбран момент `T` — планируемое время шага 2 (UTC, точность до минуты). Шаг 1 выполняется в интервале [`T − 30 с`, `T`], шаг 2 — в интервале [`T`, `T + 30 с`].
- Ранние гейты (`PILOT`, `AIRCRAFT`, `ZONE`) и остальные условия `TIME_WINDOW` (60 дней, длительность, curfew, overlap) заведомо проходят; проверяется только нижний порог lead time. От какого момента считается lead time — от создания `DRAFT` или от `submit` — не определено (OQ-20). При таком тайминге от обоих моментов до `window_start` не меньше 6 ч, поэтому ожидаемый результат от OQ-20 не зависит.

## Steps
1. `POST /api/v1/flight-requests`. Auth: operator session.
   Body: `pilot_id`, `aircraft_id` из Preconditions; `zone_code`, `window_start`, `window_end`, `requested_altitude_metres`, `flight_purpose` — из Test data.
   Save `id` как {{request_id}}.
2. `POST /api/v1/flight-requests/{{request_id}}/submit`. Auth: operator session.
3. `GET /api/v1/flight-requests/{{request_id}}`. Auth: operator session.

## Expected result
`GET` (шаг 3) возвращает заявку с `state = UNDER_REVIEW`.

Ответ самого `submit` (шаг 2) кейс не проверяет: код и тело при успехе не определены — OQ-07 (`03` #10 «move to `UNDER_REVIEW`», `08` §Gate Pipeline: «200/201 with new state»).

## Rationale
Правило `06` §1.4: «≥ 6 hours between submission and `window_start`», `TSD-4` §2.1. BV: на шаг (1 мин) выше порога — 6 ч 01 мин; сторона прохода. Сама граница 6 ч 00 мин через API не проверяется детерминированно (между созданием `DRAFT` и `submit` проходят секунды, точка отсчёта не определена — OQ-20), поэтому берётся значение не ближе минуты к ней.

Почему `submit` → `GET`, а не `validate`: `validate` — dry-run, после него заявка всегда `DRAFT` (`03` #13: «never changes state»), различить проход и провал по `GET` нельзя; код успешного `validate` в `03` не задан. Состояние после `submit` при пройденных гейтах — `UNDER_REVIEW` (`02` таблица переходов: «`SUBMITTED` (gates pass, automatic) → `UNDER_REVIEW`»; §States: «All gates passed. Awaiting a reviewer decision»). Заявка после кейса остаётся в очереди ревьюера (`UNDER_REVIEW`) — это ожидаемо.

Критерий SKY-2 AC5 даёт отдельное значение 6 ч 30 мин — см. API-OPR-008. Сторона нарушения (5 ч 59 мин) покрыта API-OPR-001.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| `T` | планируемый момент шага 2, UTC, точность до минуты | Lead time отсчитывается от подачи (`06` §1.4) |
| `window_start` | `T + 6 ч 01 мин` (UTC), задаётся при создании `DRAFT` | На 1 мин выше порога 6 ч; при любой точке отсчёта (OQ-20) и задержке шагов до 30 с lead time ≥ 6 ч |
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
