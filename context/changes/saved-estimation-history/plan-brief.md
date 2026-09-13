# Saved Estimation History — Plan Brief

> Full plan: `context/changes/saved-estimation-history/plan.md`

## What & Why

Implementujemy S-04, żeby użytkownik mógł wracać do zapisanych estymat i podstawowego kontekstu tras, zamiast widzieć wyłącznie latest wynik z S-03. To domyka MVP-owy ciąg wartości z FR-004 i FR-008: nie tylko policzyć estymację, ale też zachować ją do późniejszego użycia.

Plan utrzymuje niskie ryzyko: nie ruszamy stabilnych ścieżek latest-only, tylko dokładamy warstwę historii.

## Starting Point

Obecny system zapisuje po jednym rekordzie per user dla snapshotu trasy i estymacji (`upsert on user_id`), a dashboard renderuje tylko latest route context + latest estimation. Recompute działa już po uploadzie GPX i po zapisie profilu, więc mamy gotowe punkty integracji do dopięcia historii.

## Desired End State

Użytkownik widzi na dashboardzie historię zapisanych estymat i tras w kolejności od najnowszych, z prostym podsumowaniem każdego wpisu. System nie tworzy duplikatów dla identycznego wejścia (`route_hash + profile_signature`), a przy częściowej awarii zapisu historii zachowuje latest wynik i pokazuje czytelny warning.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Zakres S-04 | Estymaty + lekki widok historii tras | Domykamy FR-004 i FR-008 bez rozszerzania scope do pełnej biblioteki tras. |
| Architektura danych | Addytywne tabele historii + pozostawienie latest-only | Najmniejsze ryzyko regresji istniejącego S-03 i łatwiejszy rollback. |
| Deduplikacja | `route_hash + profile_signature` | To jedyna precyzyjna reguła „identycznego wejścia” bez kolizji nazw plików. |
| Sortowanie historii | `computed_at DESC`, tie-break `id DESC` | Zapewnia stabilny i przewidywalny porządek „co było liczone ostatnio”. |
| Partial failure | Zachowaj latest + pokaż warning historii | Użytkownik nie traci głównej funkcji estymacji, a degradacja jest jawna. |
| Zakres testów | Unit + integracyjne API + SSR | Pokrywa najwyższe ryzyka DB/API/UI przy rozsądnym koszcie. |
| Priorytet przy cięciu | Pewny zapis historii + prosta lista | Najpierw gwarantujemy poprawne dane i minimalny odczyt wartości dla użytkownika. |

## Scope

**In scope:**
- nowe migracje historii estymat i lekkiej historii tras z RLS owner-only,
- serwisy read/write historii z dedupe i stabilnym sortowaniem,
- integracja upload/profile flow z zapisem historii i warning path,
- sekcja historii na dashboardzie + dokumentacja semantyki.

**Out of scope:**
- pełna biblioteka tras (filtry zaawansowane, widoki szczegółowe),
- przebudowa latest-estimation modelu z S-03,
- kolejki/background jobs i event-sourcing.

## Architecture / Approach

Podejście: rozszerzenie pionowe bez rewolucji. Istniejące flow recompute pozostaje rdzeniem, a orchestration dostaje dedupe-aware zapis historii. Dashboard SSR pobiera latest dane jak dotąd, plus dodatkowo listę historii, renderowaną w osobnym komponencie. Dzięki temu wartość S-04 rośnie, a ryzyko regresji S-03 pozostaje niskie.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Schema + contracts | Tabele historii, indeksy, RLS, pola dedupe | Błędny kontrakt utrudni spójne dedupe i listowanie |
| 2. Services + dedupe | Operacje read/write historii i reguły deduplikacji | Niejednoznaczna semantyka „identycznego wejścia” |
| 3. API integration | Zapis historii w upload/profile + warning path | Częściowe awarie mogą dać niespójny UX bez jawnej obsługi |
| 4. Dashboard + verification | Widok historii i pełna walidacja scenariuszy | Regresja latest UX przy dołożeniu historii |

**Prerequisites:** S-03 wdrożone (jest), aktywne Supabase migrations, działające profile complete + upload GPX flow.
**Estimated effort:** ~2-3 sesje implementacyjne w 4 fazach.

## Open Risks & Assumptions

- Założenie: fingerprint `route_hash` da się policzyć stabilnie dla geometrii GPX bez nadmiernego narzutu.
- Jeśli historia urośnie szybciej niż zakładano, może być potrzebne paginowanie/limit stricte w pierwszym wydaniu UI.
- Przy błędach zapisu historii potrzebujemy spójnych komunikatów, żeby użytkownik rozumiał, że latest wynik nadal jest poprawny.

## Success Criteria (Summary)

- Użytkownik widzi i przegląda historię zapisanych estymat/tras w przewidywalnej kolejności.
- System nie tworzy duplikatów dla identycznego wejścia (trasa + sygnatura profilu).
- Częściowa awaria historii nie psuje latest estymacji i jest jasno komunikowana.
