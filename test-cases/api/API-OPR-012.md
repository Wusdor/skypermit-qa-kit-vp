# API-OPR-012: Повторный submit заявки, отклонённой по TIME_WINDOW, возвращает 409

- **ID:** API-OPR-012
- **Doc ref:** `02-state-machine.md` таблица переходов (`REJECTED` → любое действие нелегально → `409`), §States (`REJECTED` — терминальное); `03-api-contract.md` #9, #10, §Error semantics (`409`); `06-business-rules.md` §1.4 (Minimum lead time); OQ-07
- **Technique:** ST — `submit` из `REJECTED` (нелегальный переход)
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
2. `POST /api/v1/flight-requests/{{request_id}}/submit`. Auth: operator session. Шаг подготовки: переводит заявку в `REJECTED`; ответ не проверяется (OQ-07).
3. `GET /api/v1/flight-requests/{{request_id}}`. Auth: operator session. Предохранитель предусловия: `state = REJECTED`; если нет — кейс не выполнять дальше (результат шага 4 не считать).
4. `POST /api/v1/flight-requests/{{request_id}}/submit`. Auth: operator session.

## Expected result
Ответ шага 4: `409`. Тело ответа не проверяется. Если проверка шага 3 (предохранитель) не выполнена, кейс не пройден: предусловие перехода не выполнено.

## Rationale
Критерий SKY-2 AC4: повторный `submit` отклонённой заявки → `409`. `02`: «Any transition not shown below is invalid and must return `409`»; пара (`REJECTED`, submit) в таблице переходов отсутствует, а «`REJECTED`→anything … is illegal and returns `409`». `03` §Error semantics: `409` — «Invalid state transition». Повторный `submit` не запускает гейты заново — состояние `REJECTED` терминальное (`02` §States).

Шаг 2 приводит заявку в `REJECTED` по `TIME_WINDOW` (проверяется отдельно: API-OPR-010, API-OPR-011); его код и тело не определены однозначно — OQ-07.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| `T` | планируемый момент шага 2, UTC, точность до минуты | Опорная точка для относительных значений |
| `window_start` | `T + 3 ч` (UTC), задаётся при создании `DRAFT` | Представитель класса lead time < 6 ч — первый `submit` гарантированно отклоняет заявку |
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
