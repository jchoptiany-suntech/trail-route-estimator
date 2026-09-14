# Delete Saved Estimation History Entry — Plan Brief

> Full plan: `context/changes/delete-estimation-history-entry/plan.md`

## What & Why

Dodajemy możliwość usuwania pojedynczego wpisu historii estymacji bezpośrednio z dashboardu, przez przycisk X na karcie rekordu. Celem jest uproszczenie zarządzania historią przez użytkownika, ale bez naruszenia spójności bieżącego kontekstu trasy. Funkcja musi zachować bezpieczeństwo własności danych i czytelny feedback po każdej próbie usunięcia.

## Starting Point

Historia jest dziś renderowana jako lista kart bez akcji mutujących (`SavedEstimationHistory.astro`), a dane pochodzą z `route_estimation_history` przez `listRouteEstimationHistoryForUser`. Backend ma wzorzec `POST + redirect`, ale tabela historii nie ma jeszcze polityki RLS dla DELETE.

## Desired End State

Użytkownik może usunąć dowolny rekord historii poza tym, który odpowiada aktualnie wgranemu routeHash. Usuwanie działa przez natywne potwierdzenie i kończy się deterministycznym komunikatem success/error na dashboardzie. Reguły auth/ownership pozostają po stronie serwera, a zachowanie jest zabezpieczone testem integracyjnym endpointu i jednym testem E2E.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Zakres usuwania | Blokujemy tylko rekord dla aktualnie wgranego routeHash | Chroni to bieżący kontekst recompute, a jednocześnie zostawia użytkownikowi pełną kontrolę nad resztą historii. |
| Zachowanie lineage | Dopuszczamy delete z `ON DELETE SET NULL` | To zgodne z aktualnym kontraktem FK i nie wymaga dodatkowej logiki kaskadowej. |
| UX potwierdzenia | Natywny confirm przed submit | Najmniejszy koszt wdrożenia przy wystarczającej ochronie przed przypadkowym kliknięciem. |
| Feedback po akcji | Banner success/error przez query params | Pasuje do istniejących redirectów API i jest spójny z serwerowym modelem dashboardu. |
| Minimalny poziom testów | Integracja endpointu + 1 E2E | Daje pokrycie reguł bezpieczeństwa i realnego przepływu użytkownika bez nadmiernego kosztu. |

## Scope

**In scope:**
- endpoint usuwania jednego wpisu historii (`POST /api/estimations/history/delete`),
- polityka RLS DELETE dla właściciela rekordu,
- akcja X na kartach historii + natywny confirm,
- blokada usuwania wpisu dla aktualnego routeHash,
- komunikaty success/error na dashboardzie,
- test integracyjny endpointu i 1 test E2E.

**Out of scope:**
- soft-delete / undo / kosz,
- bulk delete,
- zmiana logiki sortowania i wersjonowania historii,
- przebudowa modelu recompute.

## Architecture / Approach

Wykorzystujemy istniejący serwerowy wzorzec mutacji: formularz POST z karty historii wywołuje nowy endpoint API, który robi walidację `historyEntryId`, auth check, ownership check i regułę „nie kasuj current routeHash”, następnie usuwa rekord przez warstwę service i redirectuje z komunikatem. UI dostaje dodatkowy kontekst current-route, aby od razu pokazać, które rekordy są chronione.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Backend deletion contract and safety gates | Migracja RLS + service delete + endpoint z guardem current-route | Usunięcie bez poprawnej polityki auth/ownership albo bez blokady current-route. |
| 2. Dashboard history UI action and feedback wiring | Przycisk X, confirm, blokady i spójne bannery statusu | Niespójny UX (np. brak jasnej informacji czemu nie da się usunąć rekordu). |
| 3. Coverage and regression safety | Integracja endpointu + 1 scenariusz E2E | Regresje w przepływie dashboardowym po dodaniu mutacji historii. |

**Prerequisites:** działające środowisko Supabase + istniejący dashboard history + Playwright setup używany w repo.  
**Estimated effort:** ~2-3 sesje robocze przez 3 fazy.

## Open Risks & Assumptions

- Zakładamy, że blokada tylko dla current-route wpisu jest wystarczająca biznesowo (bez reguły „zostaw min. 1 rekord per routeHash”).
- Zakładamy, że istniejąca semantyka `ON DELETE SET NULL` dla lineage jest akceptowalna w analizie historii.
- Zakładamy brak wymogu audytu/usunięć odwracalnych na tym etapie projektu.

## Success Criteria (Summary)

- Użytkownik usuwa niechroniony rekord historii z dashboardu jednym flow (X → confirm → redirect).
- Próba usunięcia rekordu current-route jest blokowana po stronie serwera i jasno komunikowana.
- Test integracyjny endpointu oraz test E2E przechodzą i zabezpieczają regresje.
