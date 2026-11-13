# API-OPR-002: Заявка за 61 день до window_start — submit отклоняется гейтом TIME_WINDOW по TSD-4 §2.2

- **ID:** API-OPR-002
- **Doc ref:** `06-business-rules.md` §1.4 (Maximum advance booking), §6; `02-state-machine.md` таблица переходов (`SUBMITTED` → `REJECTED`); `01-data-model.md` §FlightRequest (`failing_gate`, `rule_reference`); `03-api-contract.md` #10, #11; OQ-07
- **Role(s):** Оператор (владелец заявки)

## Preconditions
- Оператор зарегистрирован (`POST /api/v1/operators`), клиент держит его session cookie; `authorisation_level = L1` (`03` §Authentication); `status` не `SUSPENDED` — проверить через `GET /api/v1/operators/{id}` (начальный `status` в документации не задан — OQ-18; поведение для `SUSPENDED` не определено — OQ-01).
- Под этим оператором через API созданы пилот (`POST /api/v1/pilots`) и aircraft (`POST /api/v1/aircraft`) с данными из Test data.
- У этого aircraft нет других заявок (условие overlap не может сработать).
- Через `POST /api/v1/flight-requests` создана заявка в `DRAFT` с данными из Test data; `window_start` фиксируется при создании `DRAFT` и вычисляется от расчётного момента `T` шага 1 (запас почти сутки).

## Steps
1. В момент `T` — `POST /api/v1/flight-requests/{id}/submit`.
2. `GET /api/v1/flight-requests/{id}`.

## Expected result
`GET` возвращает заявку с `state = REJECTED`, `failing_gate: TIME_WINDOW` и `rule_reference: "TSD-4 §2.2"`.

Ответ самого `submit` (шаг 1) кейс не проверяет: код и тело при провале гейта не определены — OQ-07 (`422` по `03` §422 или «200/201 with new state» по `08` §Gate Pipeline).

## Rationale
Правило `06` §1.4: «≤ 60 days before `window_start`», `TSD-4` §2.2 (restated `OH-1` §5); цитата из `06` §6: `TIME_WINDOW` / Booked too far in advance → `TSD-4 §2.2`. Провал гейта при `submit` переводит заявку в `REJECTED` (`02` таблица переходов: «`failing_gate`/`rejection_reason` populated»), а `rule_reference` сохраняется в заявке «alongside `failing_gate`» (`01` §FlightRequest) — поэтому результат наблюдается однозначно через `GET`, в обход OQ-07.

Граничные значения: сторона нарушения, на шаг (1 день) выше порога 60 дней. Единица правила — день; точность внутри дня (60 дней + N минут, календарные сутки или 24 ч) в `06` не задана, поэтому взят целый лишний день: нарушение при любом прочтении. Риск R1 (`skypermit-test-plan.md`: «60 дней»). Остальные гейты заведомо проходят (зона `OPEN` без curfew, рейтинг и бэнд подходят, `L1` = требуемый уровень, сертификация текущая на `window_start`), поэтому первым провалом может быть только `TIME_WINDOW`; прочие условия `TIME_WINDOW` (lead time ≥ 6 ч, длительность, curfew, overlap) выполнены.

Задержка шага 1 после `T` на минуты не выводит кейс из нарушения (запас — почти сутки).

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| `T` | момент отправки шага 1, UTC | Точка отсчёта для 60 дней в `06` §1.4 не задана; окно на 61 день после `T` нарушает правило при любой точке отсчёта не позже `T` (включая создание `DRAFT`) |
| `window_start` | `T + 61 дн` (UTC, то же время суток) | На 1 день выше порога 60 дней — нарушение у границы; lead time ≥ 6 ч выполнен |
| `window_end` | `window_start + 60 мин` | Длительность внутри 15–240 мин (`06` §1.4, `TSD-4` §3) |
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
