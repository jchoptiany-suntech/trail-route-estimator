# Personalized Estimation Result — Plan Brief

> Full plan: `context/changes/personalized-estimation-result/plan.md`

## What & Why

Budujemy S-03: personalizowaną estymację czasu i trudności trasy na podstawie ostatnio wgranego GPX oraz profilu sportowego użytkownika. To jest kluczowy kawałek wartości produktu, bo dopiero tutaj użytkownik dostaje konkretną odpowiedź „ile i jak trudno” dla swojej trasy.

Plan celowo nie obejmuje historii estymacji (to S-04), ale utrwala pojedynczy latest wynik per user, żeby rezultat był spójny po odświeżeniu i mógł być odświeżany po zmianach danych wejściowych.

## Starting Point

Mamy gotowe fundamenty z S-01 i S-02: auth + complete profile gate, upload GPX, snapshot trasy i dashboard z mapą/metrykami bazowymi. Brakuje całej warstwy estymacji: modelu domenowego, obliczeń, persystencji wyniku i jego prezentacji.

## Desired End State

Po wdrożeniu użytkownik z kompletnym profilem i trasą GPX widzi na dashboardzie przewidywany czas ukończenia oraz etykietę trudności (easy/medium/hard), wraz z podstawą analizy. Wynik przelicza się hybrydowo: po uploadzie trasy i po aktualizacji profilu, a awaria estymacji nie psuje działającego kontekstu trasy.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Zakres S-03 | Bez historii estymacji | Domykamy FR-005/FR-006 bez rozszerzania scope na FR-004/FR-008. |
| Trigger obliczeń | Hybryda: upload + update profilu | Wynik pozostaje aktualny względem obu źródeł danych wejściowych. |
| Persystencja wyniku | Osobna tabela `route_estimations` (latest-per-user) | Czysty rozdział między danymi trasy i wynikiem estymacji. |
| Model trudności | Deterministyczne progi (distance/elevation/slope/profile) | Transparentne reguły są łatwe do testowania i strojenia. |
| Obsługa błędów | Graceful degradation | Awaria estymacji nie może blokować działających funkcji S-02. |
| Testowanie | Unit engine + integration flow | Chronimy logikę domenową i punkty integracji o największym ryzyku regresji. |

## Scope

**In scope:**
- nowy kontrakt danych `route_estimations` z RLS owner-only,
- silnik estymacji czasu i klasyfikacji trudności,
- integracja recompute w API uploadu i API profilu,
- prezentacja wyniku estymacji na dashboardzie.

**Out of scope:**
- historia wielu estymacji i widok historii (S-04),
- kolejki/background jobs dla obliczeń,
- modele ML lub zewnętrzne serwisy predykcji.

## Architecture / Approach

Architektura pozostaje server-first: API routes wywołują serwis orkiestrujący obliczenie + upsert latest wyniku, a dashboard SSR pobiera snapshot trasy i estymację do renderu. Logika matematyczna jest wydzielona do czystego modułu domenowego, a mapowanie błędów pozostaje jawne i kompatybilne z obecnym mechanizmem redirect + query messages.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Persistence + contracts | `route_estimations` + typy domenowe | Błędny kontrakt utrudni późniejsze rozszerzenia |
| 2. Estimation engine | Deterministyczne wyliczenia czasu i trudności | Źle dobrane progi dadzą mało wiarygodne wyniki |
| 3. Hybrid API integration | Recompute po uploadzie i update profilu | Regresje w istniejących flow API |
| 4. Dashboard + verification | Widoczny wynik i pełna walidacja E2E | Niespójne stany UI przy partial failure |

**Prerequisites:** S-01 i S-02 muszą być zakończone (są gotowe), działające Supabase migrations i profile complete gating.
**Estimated effort:** ~2-3 sesje implementacyjne w 4 fazach.

## Open Risks & Assumptions

- Reguły progów trudności mogą wymagać szybkiego dostrojenia po pierwszych testach manualnych.
- Obliczenia synchroniczne zakładają, że limit wejściowy GPX (5 MB) utrzyma akceptowalny czas odpowiedzi.
- Hybrydowe recompute wymaga spójnej obsługi błędów, żeby nie degradować UX przy częściowych awariach.

## Success Criteria (Summary)

- Użytkownik widzi na dashboardzie personalizowany czas i poziom trudności dla latest trasy.
- Wynik odświeża się zarówno po uploadzie trasy, jak i po zmianie profilu.
- Błąd estymacji nie psuje uploadu/profilu ani podglądu trasy — jest jawnie komunikowany.
