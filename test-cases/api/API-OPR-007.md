# API-OPR-007: Lead time 3 ч — validate возвращает 422 с failing_gate = TIME_WINDOW и rule_reference = TSD-4 §2.1

- **ID:** API-OPR-007
- **Doc ref:** `06-business-rules.md` §1.4 (Minimum lead time), §6; `03-api-contract.md` #9, #13, §Error semantics, §The 422 body; `08` §Gate Pipeline; SKY-2 AC1; OQ-23
- **Technique:** EP — недопустимый класс «lead time < 6 ч», представитель 3 ч
- **Role(s):** Оператор (владелец заявки)

## Preconditions
- Оператор зарегистрирован (`POST /api/v1/operators`), клиент держит его session cookie; `authorisation_level = L1` (`03` §Authentication & authorisation: регистрация всегда создаёт `L1`).
- Под этим оператором через API созданы пилот (`POST /api/v1/pilots`) и aircraft (`POST /api/v1/aircraft`) с данными из Test data; зона `DNI-OPN-1` (`GET /api/v1/zones/DNI-OPN-1`) — `OPEN`, без curfew, `L1`.
- У этого aircraft нет других заявок (условие overlap не может сработать).
- Заранее выбран момент `T` — планируемое время шага 2 (UTC, точность до минуты). Шаг 1 выполняется в интервале [`T − 30 с`, `T`].
- Ранние гейты (`PILOT`, `AIRCRAFT`, `ZONE`) и остальные условия `TIME_WINDOW` (60 дней, длительность, curfew, overlap) заведомо проходят; нарушено только условие минимального lead time. 3 ч — далеко от порога, поэтому точка отсчёта (OQ-20) на результат не влияет.

## Steps
1. `POST /api/v1/flight-requests`. Auth: operator session.
   Body: `pilot_id`, `aircraft_id` из Preconditions; `zone_code`, `window_start`, `window_end`, `requested_altitude_metres`, `flight_purpose` — из Test data.
   Save `id` как {{request_id}}.
2. `POST /api/v1/flight-requests/{{request_id}}/validate`. Auth: operator session.

## Expected result
Ответ шага 2: `422` с телом, где `failing_gate = TIME_WINDOW`, `rule_reference = "TSD-4 §2.1"`, `message` — непустая строка (текст не проверяется).

## Rationale
Правило `06` §1.4: «≥ 6 hours between submission and `window_start`»; `rule_reference` для «Lead time too short» — `TSD-4 §2.1` (`06` §6). Структура `422` — `03` §The 422 body: `failing_gate`, `rule_reference`, `message`.

Код `422` для `validate` задан критерием SKY-2 AC1 («validate … → 422 с failing_gate = TIME_WINDOW, rule_reference = TSD-4 §2.1, непустым message») и согласуется с `03` §Error semantics (`422` — нарушение бизнес-правила, «with the failing gate identified») и `03` #13 («exactly as `submit` would»). `03` #13 код ответа `validate` явно не называет, а `08` §Gate Pipeline для `validate` показывает «200 with per-gate results» — противоречие зафиксировано как OQ-23; кейс следует критерию.

EP: представитель недопустимого класса lead time < 6 ч (3 ч). Граничное значение 5 ч 59 мин покрыто API-OPR-001 (`test-cases/gates/API-OPR-001.md`); состояние заявки после `validate` — API-OPR-009.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| `T` | планируемый момент шага 2, UTC, точность до минуты | Опорная точка для относительных значений |
| `window_start` | `T + 3 ч` (UTC), задаётся при создании `DRAFT` | Представитель класса lead time < 6 ч; от создания и от `submit` меньше порога |
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
