---
change_id: enriched-estimation-signals
title: Enriched estimation signals
status: archived
created: 2026-09-14
updated: 2026-09-14
archived_at: 2026-09-14T13:36:30Z
---

## Notes

- Zakres S-05: ITRA w profilu, datetime startu biegu w uploadzie, pogoda jako sygnał opcjonalny.
- Decyzja fallback: brak pogody nie blokuje estymacji (neutralny wpływ + warning).
- Decyzja historii na tym etapie: reset historii podczas migracji tej zmiany.
- Zakres UI: latest wynik + historia pokazują średnie tempo i kontekst sygnałów.
- Przed lokalnym `npx supabase migration up` wymagane jest aktywne środowisko local Supabase (`npx supabase start`, Docker running).
