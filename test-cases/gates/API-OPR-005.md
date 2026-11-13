# API-OPR-005: Окно заходит в curfew LVV-RST-2 на 1 минуту — submit отклоняется гейтом TIME_WINDOW по ZC-2026.1 §3

- **ID:** API-OPR-005
- **Doc ref:** `06-business-rules.md` §1.4 (Curfew; «On UTC vs. zone-local time»; «Curfew values, per zone»), §4, §6; `02-state-machine.md` таблица переходов (`SUBMITTED` → `REJECTED`); `01-data-model.md` §FlightRequest (`failing_gate`, `rule_reference`), §Time handling; `03-api-contract.md` #10, #11; OQ-07; OQ-11
- **Role(s):** Оператор (владелец заявки)

## Preconditions
- Оператор зарегистрирован (`POST /api/v1/operators`), клиент держит его session cookie. Регистрация создаёт оператора с `authorisation_level = L1` (`03` §Authentication), а `LVV-RST-2` требует `L3` (`06` §4), иначе первым провалится гейт `ZONE` (`OH-1` §4). Эндпоинта для повышения уровня нет («out-of-band admin action», `03` §Authentication): `authorisation_level` оператора переводится в `L3` прямой записью в БД. `status` не `SUSPENDED` — проверить через `GET /api/v1/operators/{id}` (начальный `status` не задан — OQ-18; поведение для `SUSPENDED` не определено — OQ-01).
- Под этим оператором через API созданы пилот (`POST /api/v1/pilots`) и aircraft (`POST /api/v1/aircraft`) с данными из Test data.
- У этого aircraft нет других заявок (условие overlap не может сработать).
- Через `POST /api/v1/flight-requests` создана заявка в `DRAFT` с данными из Test data. Окно задано так, что `window_start` не раньше чем через 6 ч после момента шага 1 и не позже чем через 60 дней.

## Steps
1. `POST /api/v1/flight-requests/{id}/submit`.
2. `GET /api/v1/flight-requests/{id}`.

## Expected result
Не определено — OQ-11: попадает ли окно в curfew, зависит от часового пояса зоны, которого в документации нет (`01` §Zone — поля нет; `06` §1.4 говорит лишь «zone-local time»). Спорная сторона: при пересчёте UTC → местное время, в котором окно 21:00–22:01 заходит в curfew 22:00–06:00 на 1 минуту, `GET` возвращает `state = REJECTED`, `failing_gate: TIME_WINDOW` и `rule_reference: "ZC-2026.1 §3"` (`06` §1.4, §6; `02` таблица переходов); при другом смещении окно может в curfew не попасть, и заявка пройдёт `TIME_WINDOW`.

Ответ самого `submit` (шаг 1) кейс не проверяет: код и тело при провале гейта не определены — OQ-07 (`422` по `03` §422 или «200/201 with new state» по `08` §Gate Pipeline).

## Rationale
Правило `06` §1.4: «No part of the window may fall inside the zone's curfew… Evaluated minute-by-minute across the whole window, not just the endpoints»; curfew `LVV-RST-2` — 22:00–06:00 по `ZC-2026.1` §3, без поправок (`06` §1.4, §4). Цитата из `06` §6: `TIME_WINDOW` / Falls within curfew — other zones → `ZC-2026.1 §3`. Провал гейта при `submit` переводит заявку в `REJECTED` (`02` таблица переходов), `rule_reference` сохраняется «alongside `failing_gate`» (`01` §FlightRequest) — результат наблюдается через `GET`, в обход OQ-07.

Граничное значение: сторона нарушения, на шаг (1 мин) за границей. Окно 21:00–22:01 местного времени заходит в curfew ровно на минуту `[22:00, 22:01)`; конец окна не совпадает с началом curfew, поэтому включительность границ (OQ-12) не затрагивается. Начало окна вне curfew защищает от реализации, проверяющей только концы окна. Риск R2 (`skypermit-test-plan.md`). Кейс дополняет API-OPR-004 (`KBP-CTR-3`, `A-7 §1`): здесь значение базового каталога `ZC-2026.1` §3 для зоны без поправок.

Кейс `Blocked`, потому что без часового пояса зоны нельзя назвать UTC-значения окна (OQ-11). Код использует `Europe/Kyiv` (`../skypermit/lib/curfew.ts:7`) — это не документация и не требование. Когда OQ-11 решат, Expected result фиксируется для выбранного пояса; дата окна не должна совпадать с переходом на летнее/зимнее время.

Остальные гейты заведомо проходят: `PILOT` (`R_BVLOS` допускает `RESTRICTED`, сертификация текущая), `AIRCRAFT` (`C0` ∈ C0–C1), `ZONE` (50 м ≤ 60 м, оператор `L3` = требуемый, зона активна). Прочие условия `TIME_WINDOW` выполнены: lead time ≥ 6 ч и ≤ 60 дней, длительность 61 мин (15–240), overlap нет.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| Местная дата окна | `T + 2 дн` (T — момент шага 1), не день перехода на летнее/зимнее время | Lead time и max advance не мешают; смещение однозначно |
| `window_start` | 21:00 по местному времени зоны на эту дату, в UTC по смещению зоны (OQ-11) | Начало до curfew 22:00 — проверка «не только концы окна» |
| `window_end` | 22:01 по местному времени зоны на ту же дату, в UTC по тому же смещению (OQ-11) | Заходит в curfew 22:00–06:00 на 1 мин; длительность 61 мин ∈ 15–240 |
| `zone_code` | `LVV-RST-2` | `RESTRICTED`, curfew 22:00–06:00 (`ZC-2026.1` §3), C0–C1, потолок 60 м, `L3` (`06` §4) |
| `requested_altitude_metres` | `50` | Ниже потолка 60 м — `ZONE` проходит |
| `flight_purpose` | `Инспекция инфраструктуры` | Валидный текст < 2 000 символов (`01` §Time handling) |
| Оператор: `authorisation_level` | `L3` (прямая запись в БД) | Равен требуемому для `LVV-RST-2` (`06` §4) |
| Пилот: `rating` | `R_BVLOS` | `RESTRICTED` требует `R_BVLOS` (`06` §4) |
| Пилот: `certified_on` | `T − 30 дней` (дата) | Сертификация текущая на `window_start` (18 мес., `06` §2) |
| Пилот: `full_name`, `national_id` | непустое имя; `national_id`, уникальный в прогоне | `national_id` unique (`01` §Pilot) |
| Aircraft: `mtom_grams` | `900` | Бэнд `C0` (`06` §3), разрешён в `LVV-RST-2` |
| Aircraft: `manufacturer`, `model`, `serial_number` | непустые значения; `serial_number`, уникальный в прогоне | `serial_number` unique (`01` §Aircraft) |

## Status
Blocked — OQ-11
