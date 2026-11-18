# E2E-OPR-008: Форма заявки не блокирует выбор борта C3 и зоны KBP-CTR-3 — заявка создаётся в DRAFT

- **ID:** E2E-OPR-008
- **Jira:** SKY-3
- **Doc ref:** «04 — Frontend Spec» §Operator portal (форма заявки), §Two contracts to hold exactly («The form does not pre-filter»); «03 — API Contract» §Flight requests (#9: «Create a request in `DRAFT`»); «02 — State Machine» §States (`DRAFT`: «No gates have run»); «06 — Business Rules» §1.2, §3, §4
- **Role(s):** Оператор (владелец заявки, работает в портале)
- **Техника:** EP — недопустимый класс сочетания «весовая категория `C3` × зона с `permitted_bands` C0–C2» на этапе заполнения формы: форма его принимает

## Preconditions
- Оператор зарегистрирован (`POST /api/v1/operators`) и залогинен в портале (session cookie), `status` не `SUSPENDED` (поведение для `SUSPENDED` не определено — «05» №4 / OQ-01). `authorisation_level = L2`: регистрация создаёт `L1` («04» §Operator portal), а `KBP-CTR-3` требует `L2` («06» §4, `OH-1 §4`); эндпоинта повышения нет — прямая запись в БД.
- Пилот оператора (`POST /api/v1/pilots`): `rating = R_ADVANCED` допускает `CONTROLLED` («06» §1.1), `certified_on = T − 30 дн` — сертификация текущая («06» §2).
- Aircraft оператора (`POST /api/v1/aircraft`): `mtom_grams = 12001` → `C3` («06» §3: `C3` — выше 12 000 г до 30 000 г); `C3` не входит в `permitted_bands` `KBP-CTR-3` (C0–C2, «06» §4). 12 001 ≤ 30 000 г — регистрация не отклоняется («06» §1.2, `OH-1 §3`).
- Зона `KBP-CTR-3` активна («06» §4).
- Время: `T` — момент шага 1; дата окна `D` = дата `T + 2 дн` (lead time ≥ 6 ч и ≤ 60 дней, «06» §1.4).

## Steps
1. В шапке нажать ссылку «New Request» (`operator-nav-new-request` — components/AppHeader.tsx:12, рендер `data-testid={n.testid}` :83).
2. На форме `flight-request-create-form` (app/operator/requests/new/page.tsx:95) выбрать: `flight-request-zone-select` (:107) = `KBP-CTR-3`; `flight-request-pilot-select` (:118) = пилот из предусловий; `flight-request-aircraft-select` (:130) = опция с подписью `<manufacturer> <model> (<serial_number>)` борта `mtom_grams = 12001` (вес в подписи не показан).
3. Заполнить: `flight-request-window-start-input` (:144) = `D 12:00`; `flight-request-window-end-input` (:152) = `D 13:00`; `flight-request-altitude-input` (:163) = `100`; `flight-request-purpose-textarea` (:175) = `Аэрофотосъёмка`.
4. Нажать `flight-request-create-submit-button` (:191).

## Expected result
Заявка создана в `DRAFT`: бейдж `flight-request-detail-state` (components/FlightRequestPanel.tsx:133) показывает `DRAFT`; элемент `flight-request-create-error` (app/operator/requests/new/page.tsx:187) отсутствует («04» §Two contracts: «an operator can select a combination that cannot possibly pass», правила применяются «only at `validate` and `submit`»; «03» #9: создание в `DRAFT`; «02» §States: у `DRAFT` гейты не запускались).

## Rationale
Критерий SKY-3 №1. Пикеры намеренно не фильтруют комбинации («04» §Two contracts to hold exactly): невалидная пара `C3` × `KBP-CTR-3` обязана выбираться и сохраняться, иначе оператор не увидит отказ гейта на `validate`. Кейс ловит регрессию «умного» пре-фильтра пикеров, который «04» прямо запрещает. Единственный результат — заявка создана в `DRAFT`; проверка отказа гейта — E2E-OPR-009.

Код, не документация (подтверждает селекторы): списки зон и бортов строятся без фильтрации (app/operator/requests/new/page.tsx:111, :135); `handleCreate` не проверяет сочетание борта и зоны на клиенте (:43-67). После создания рендерится `flight-request-detail` (components/FlightRequestPanel.tsx:88), `flight-request-detail-zone` (:137) показывает `KBP-CTR-3` — по коду; документация состав экрана не задаёт.

## Test data
| Параметр | Значение | Почему это значение |
|---|---|---|
| `zone_code` | `KBP-CTR-3` | `CONTROLLED`, permitted bands C0–C2, `L2` («06» §4) |
| Aircraft: `mtom_grams` | `12001` | Минимальный вес категории `C3` — на единицу выше границы `C2` (12 000 г, «06» §3) |
| Пилот: `rating` / `certified_on` | `R_ADVANCED` / `T − 30 дн` | Допуск к `CONTROLLED`; сертификация текущая |
| Оператор: `authorisation_level` | `L2` | Равен требуемому для `KBP-CTR-3` |
| `window_start` / `window_end` | `D 12:00` / `D 13:00` | Длительность 60 мин ∈ 15–240; на кейс не влияет |
| `requested_altitude_metres` | `100` | ≤ потолка 120 м |
| `flight_purpose` | `Аэрофотосъёмка` | Валидный текст |

## Status
Untested
