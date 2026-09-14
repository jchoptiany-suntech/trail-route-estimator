# Enriched Estimation Signals — Plan Brief

> Full plan: `context/changes/enriched-estimation-signals/plan.md`

## What & Why

Rozszerzamy estymację trasy o dwa brakujące wejścia użytkownika: indeks ITRA w profilu oraz datetime planowanego startu biegu przy uploadzie GPX. Celem jest zwiększenie użyteczności wyniku przez lepszy kontekst personalizacji i pogody, bez łamania zasady, że pogoda jest sygnałem opcjonalnym.

## Starting Point

Backend estymacji ma już kontrakt sygnałów zewnętrznych i neutralne fallbacki, ale UI/API nie zbiera jeszcze ITRA ani datetime biegu. Karta latest i historia pokazują dziś podstawowe metryki, bez średniego tempa i bez kontekstu sygnałów.

## Desired End State

Użytkownik może podać ITRA i datetime startu, a system wykorzystuje te dane podczas recompute. Wynik latest oraz historia pokazują średnie tempo i status sygnałów (ITRA/pogoda), a przy niedostępności pogody estymacja nadal działa z warningiem. Historia rozróżnia wpisy dla różnych czasów startu tej samej trasy.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Zakres UI S-05 | Wejścia + widoczność sygnałów w latest i historii | Buduje zaufanie użytkownika, bo widać, jakie dane wpłynęły na wynik. |
| Format czasu biegu | Data i godzina startu | Umożliwia precyzyjniejszą ocenę warunków pogodowych na osi czasu biegu. |
| Miejsce przechowywania czasu biegu | `route_snapshots.planned_run_at` + snapshot w `derived_metrics` | Daje canonical input i jednocześnie zachowuje kontekst użytego wyliczenia. |
| Walidacja ITRA | Zakres domenowy + wartość opcjonalna | Chroni model przed śmieciowymi wartościami bez blokowania użytkownika bez ITRA. |
| Brak danych pogodowych | Neutralny wpływ + warning | Zachowuje ciągłość flow i transparentność fallbacku. |
| Deduplikacja historii | Uwzględnia `planned_run_at` | Pozwala oddzielić scenariusze tej samej trasy z różnymi startami czasowymi. |
| Migracja starych danych | Reset historii | Upraszcza przejście na nowy kontrakt kosztem ciągłości historycznych wpisów. |

## Scope

**In scope:**
- Pole ITRA w profilu i jego walidacja w UI/API/service.
- Pole datetime startu biegu w upload flow i mapowanie do `planned_run_at`.
- Enrichment recompute o sygnały ITRA/pogoda oraz średnie tempo.
- Rendering enrichment w latest i historii.
- Migracje danych + aktualizacja testów kontraktowych i widokowych.

**Out of scope:**
- Nowi providerzy pogodowi poza Open-Meteo.
- Rozszerzenia S-06 wykraczające poza potrzeby S-05.
- Zaawansowana analityka segmentowa pogody.

## Architecture / Approach

Plan idzie warstwowo przez istniejący pipeline: formularze -> API -> serwisy -> orchestracja/engine -> persist RPC -> dashboard views. Najpierw stabilizujemy kontrakty i migracje, potem podłączamy wejścia użytkownika i weather resolve, a na końcu wystawiamy nowe dane w UI oraz domykamy regresję testami.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Data Contract and Persistence Baseline | ITRA + planned run datetime w modelu danych i dedupe, plus reset historii | Błędna kolejność migracji może rozjechać kontrakt zapisu historii |
| 2. Input Capture and Recompute Enrichment | Działające wejścia ITRA/datetime i recompute z optional weather fallback | Niespójna walidacja UI/API może dawać nieprzewidywalne warningi |
| 3. Result Presentation and Regression Net | Średnie tempo i sygnały widoczne w latest/historii + testy | Rozszerzenie UI może rozjechać mapowanie danych historii |

**Prerequisites:** Zamknięte F-01 (done), dostępne migracje Supabase i obecny pipeline recompute.
**Estimated effort:** ~2-3 sessions across 3 phases.

## Open Risks & Assumptions

- Reset historii jest decyzją produktową i oznacza utratę wcześniejszych wpisów historycznych.
- Interpretacja timezone dla `datetime-local` musi być spójna na wejściu i w renderze.
- Weather provider może zwracać częściowe dane; fallback i komunikaty muszą pozostać stabilne.

## Success Criteria (Summary)

- Użytkownik podaje ITRA i datetime startu, a estymacja korzysta z tych danych bez regresji flow.
- Latest i historia pokazują średnie tempo oraz kontekst sygnałów.
- Przy braku pogody estymacja kończy się sukcesem z czytelnym warningiem.
