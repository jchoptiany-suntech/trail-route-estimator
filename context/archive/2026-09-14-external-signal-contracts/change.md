---
change_id: external-signal-contracts
title: External signal contracts
status: archived
created: 2026-09-14
updated: 2026-09-14
archived_at: 2026-09-14T10:00:59Z
---

## Notes

- Provider pogodowy: Open-Meteo.
- Indeks biegacza: wyłącznie ITRA, wpływ jako globalny mnożnik czasu.
- Pogoda jest opcjonalna: jeśli użytkownik nie poda daty biegu, pogoda nie jest uwzględniana.
- F-01 pozostaje zmianą foundation/runtime (bez nowych zmian user-facing UI).
- Migration hotfix `20260914001000_backfill_route_hash_shape_v2.sql` (`digest` -> `extensions.digest`) został wykonany operacyjnie i ma zostać utrwalony commitem w tej zmianie.
