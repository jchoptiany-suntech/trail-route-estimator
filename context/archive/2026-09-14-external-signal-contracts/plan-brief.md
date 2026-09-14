# External Signal Contracts — Plan Brief

> Full plan: `context/changes/external-signal-contracts/plan.md`

## What & Why

Budujemy fundament F-01 pod sygnały zewnętrzne dla estymacji trasy: Open-Meteo (pogoda) i ITRA (indeks biegacza). Celem jest zwiększenie jakości estymaty bez utraty niezawodności obecnego flow: estymacja ma działać także wtedy, gdy danych zewnętrznych brakuje.

## Starting Point

Obecny pipeline estymacji działa przez API `upload/profile` -> `recomputeLatestEstimation` -> `computeRouteEstimation` -> atomowy zapis RPC. Nie istnieje jeszcze formalny kontrakt sygnałów external ani jawna semantyka fallbacków dla ITRA/pogody.

## Desired End State

Silnik przyjmuje jednoznaczny kontrakt z resolved sygnałami i neutralnymi defaultami. ITRA działa jako globalny mnożnik czasu z granicami **0.95-1.05**, a pogoda jest opcjonalna i pomijana, jeśli użytkownik nie poda daty biegu. Persistencja zapisuje pełny snapshot zastosowanych faktorów i statusów w `derived_metrics`.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Weather provider | Open-Meteo | Darmowy i wystarczający dla lekkiego sygnału temperatury/dnia. | Plan |
| Runner index scope | ITRA only | Najprostsza interpretacja MVP i najmniejsze ryzyko rozmycia modelu. | Plan |
| ITRA influence shape | Global time multiplier | Minimalnie inwazyjne wobec obecnego silnika i łatwe do testowania. | Plan |
| ITRA bounds | 0.95-1.05 | Chroni przed przesterowaniem wyniku i utrzymuje stabilność estymaty. | Plan |
| Missing ITRA behavior | Neutral (1.0) + warning | Utrzymuje ciągłość obliczeń i transparentność dla użytkownika. | Plan |
| Weather optionality | Brak daty biegu => pogoda `not_applicable` | Usuwa niejednoznaczność semantyczną i eliminuje pseudo-dopasowanie „pogoda na teraz”. | Plan |
| F-01 scope boundary | Contracts + runtime, bez UI enrichment | Zachowuje granicę foundation vs user-facing S-05 i ogranicza scope creep. | Plan |
| Persistence strategy | Full resolved snapshot in `derived_metrics` | Zapewnia odtwarzalność, debugowalność i spójność historii bez nowej migracji kolumn. | Plan |

## Scope

**In scope:** kontrakty typów sygnałów, fallback policy, resolve w orkiestracji, bounded wpływ w silniku, persistencja snapshotu, testy regresji kontraktów.

**Out of scope:** nowy UI enriched result, nowe obowiązkowe kolumny DB, semantyka freeze/rehydrate dla S-06.

## Architecture / Approach

Podejście kontrakty-first: sygnały są rozwiązywane w orkiestracji, a silnik pozostaje funkcją obliczeniową na jawnych wejściach. Wynik i sygnały trafiają do istniejącego atomowego RPC przez rozszerzone `derived_metrics`, a warningi idą istniejącą ścieżką `recompute-feedback`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Contract Definition | Typy i semantyka fallback dla ITRA/pogody | Niejednoznaczne kontrakty utrudnią późniejsze wdrożenia |
| 2. Runtime Wiring | Resolve sygnałów + bounded wpływ + persistencja snapshotu | Regresja w recompute lub niespójność payload-RPC |
| 3. Regression Safety Net | Testy kontraktowe i fallbackowe | Fałszywe poczucie bezpieczeństwa przy niepełnym pokryciu edge case'ów |

**Prerequisites:** zakończone S-03 i S-04, dostępny obecny pipeline RPC/history.
**Estimated effort:** ~2-3 sesje w 3 fazach.

## Open Risks & Assumptions

- Zakładamy brak obowiązkowej migracji DB kolumn (wszystko mieści się w `derived_metrics`).
- Zakładamy, że źródło ITRA dla użytkownika jest dostępne lub może legalnie wracać `missing` bez blokady flow.
- Potencjalne opóźnienia providerowe muszą zawsze degradować do neutral, nie do hard-fail.

## Success Criteria (Summary)

- Estymacja działa poprawnie przy: dostępnych sygnałach, braku ITRA oraz braku daty biegu (pogoda pominięta).
- Zastosowane wpływy i statusy są zapisane w `derived_metrics` latest+history.
- Testy regresji potwierdzają brak naruszenia istniejących kontraktów recompute/history.
