# API-OPR-001: Lead time 5 ч 59 мин — submit отклоняется гейтом TIME_WINDOW по TSD-4 §2.1

- **ID:** API-OPR-001
- **Doc ref:** `06-business-rules.md` §1.4 (Minimum lead time), §6; `02-state-machine.md` таблица переходов (`SUBMITTED` → `REJECTED`); `01-data-model.md` §FlightRequest (`failing_gate`, `rule_reference`); `03-api-contract.md` #10, #11; OQ-07; OQ-20
- **Role(s):** Оператор (владелец заявки)

## Preconditions
- Оператор зарегистрирован (`POST /api/v1/operators`), клиент держит его session cookie; `authorisation_level = L1` (`03` §Authentication); `status` не `SUSPENDED` — проверить через `GET /api/v1/operators/{id}` (начальный `status` в документации не задан — OQ-18; поведение для `SUSPENDED` не определено — OQ-01).
- Под этим оператором через API созданы пилот (`POST /api/v1/pilots`) и aircraft (`POST /api/v1/aircraft`) с данными из Test data.
- У этого aircraft нет других заявок (условие overlap не может сработать).
- Заранее выбран момент `T` — планируемое время шага 1 (UTC, точность до минуты). Фактический `submit` выполняется в `T` или позже, но не раньше.
- Менее чем за 1 мин до `T` (в интервале (`T − 1 мин`, `T`]) через `POST /api/v1/flight-requests` создана заявка в `DRAFT` с данными из Test data, где `window_start = T + 5 ч 59 мин`. При создании гейты не запускаются (`02` §States, `DRAFT`: «No gates have run»; `03` #9). Гейты запускают `submit` (`03` #10) и `validate` (`03` #13), но `validate` — dry-run «without changing state», и в этом кейсе он не вызывается. От какого момента считается lead time — от создания `DRAFT` или от `submit`, — не определено (OQ-20). При таком тайминге от обоих моментов до `window_start` меньше 6 ч, поэтому ожидаемый результат от OQ-20 не зависит.

## Steps
1. Не раньше момента `T` (по возможности ровно в `T`) — `POST /api/v1/flight-requests/{id}/submit`.
2. `GET /api/v1/flight-requests/{id}`.

## Expected result
`GET` возвращает заявку с `state = REJECTED`, `failing_gate: TIME_WINDOW` и `rule_reference: "TSD-4 §2.1"`.

Ответ самого `submit` (шаг 1) кейс не проверяет: код и тело при провале гейта не определены — OQ-07 (`422` по `03` §422 или «200/201 with new state» по `08` §Gate Pipeline).

## Rationale
Правило `06` §1.4: «≥ 6 hours between submission and `window_start`», `TSD-4` §2.1; цитата из `06` §6: `TIME_WINDOW` / Lead time too short → `TSD-4 §2.1`. Провал гейта при `submit` переводит заявку в `REJECTED` (`02` таблица переходов: «`failing_gate`/`rejection_reason` populated»), а `rule_reference` сохраняется в заявке «alongside `failing_gate`» (`01` §FlightRequest) — поэтому результат наблюдается однозначно через `GET`, в обход OQ-07.

Граничные значения: сторона нарушения, на шаг (1 мин) ниже порога 6 ч. Риск R1 (`skypermit-test-plan.md`: «lead 6 ч»). Остальные гейты заведомо проходят (зона `OPEN` без curfew, рейтинг и бэнд подходят, `L1` = требуемый уровень), поэтому первым провалом может быть только `TIME_WINDOW`; прочие условия `TIME_WINDOW` (60 дней, длительность, curfew, overlap) выполнены.

Точка отсчёта «submission» в `06` §1.4 прямо не определена — OQ-20 (создание `DRAFT` или `submit`). Кейс от неё не зависит: `DRAFT` создаётся менее чем за 1 мин до `T`, `submit` — не раньше `T`, поэтому от любого из двух моментов до `window_start` меньше 6 ч. Если создать `DRAFT` за 1 мин до `T` или раньше, при отсчёте от создания lead time станет ≥ 6 ч; если выполнить `submit` за 1 мин до `T` или раньше — то же при отсчёте от `submit`. В обоих случаях гейт пройдёт, и кейс даст ложный результат. Задержка шага 1 после `T` только сокращает lead time, то есть кейс остаётся на стороне нарушения. Код, не документация: гейт берёт время вызова `submit` как «submission time» (`../skypermit/lib/gates/time-window-gate.ts:17-22`).

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| `T` | планируемый момент шага 1, UTC, точность до минуты; выбирается до создания `DRAFT` | Lead time отсчитывается от подачи (`06` §1.4) |
| `window_start` | `T + 5 ч 59 мин` (UTC), задаётся при создании `DRAFT` | При `submit` ровно в `T` lead time = 5 ч 59 мин — на 1 мин ниже порога 6 ч; при `submit` позже `T` — ещё меньше. От создания `DRAFT` (менее чем за 1 мин до `T`) — тоже меньше 6 ч, поэтому нарушение при любой точке отсчёта (OQ-20) |
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
