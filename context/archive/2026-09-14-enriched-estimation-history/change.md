---
change_id: enriched-estimation-history
title: Enriched estimation history continuity
status: archived
created: 2026-09-14
updated: 2026-09-14
archived_at: 2026-09-14T16:26:41Z
---

## Notes

- Scope from roadmap S-06: keep enriched history coherent across explicit recomputes.
- Decisions locked during planning: versioned-per-key history, frozen route context per history row, per-entry recompute action.
- Time contract: persist UTC timestamp plus user-provided timezone offset metadata.
- Legacy strategy: no mass backfill; older records stay visible as legacy snapshots.
