# Enriched Estimation History Continuity — Plan Brief

> Full plan: `context/changes/enriched-estimation-history/plan.md`

## What & Why

We are implementing S-06 to make enriched estimation history trustworthy over time. Today users can see enriched fields, but repeated recalculations can overwrite history semantics and route context can drift from what was originally computed. This plan introduces explicit continuity rules so users can recompute intentionally and still understand what changed.

## Starting Point

Current flow already computes and stores enriched metrics (pace + signal statuses) and renders history in dashboard. However, history persistence uses upsert semantics and history UI merges route metadata from a separate mutable table, so entries are not fully immutable snapshots.

## Desired End State

Each saved history row is coherent: route context and enriched metrics reflect the exact computation snapshot at save time. Users can trigger recompute on a specific row, which creates a new versioned entry instead of mutating the previous one. Legacy rows remain visible and marked, with no risky mass backfill.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| History model | Versioned-per-key | Preserves change history while keeping grouping semantics for same route/profile thread. |
| Route context policy | Freeze context per history row | Prevents UI drift where route details no longer match the computed estimation snapshot. |
| Recompute UX | Per-entry explicit recompute action | Gives users controlled refresh behavior aligned with roadmap policy, without global side effects. |
| Time contract | Persist UTC + client offset metadata | Keeps weather calculations deterministic while preserving local-time interpretability. |
| Legacy rollout | No backfill; mark old rows as legacy | Avoids costly/risky migration recompute while keeping historical visibility. |

## Scope

**In scope:** schema evolution for versioned continuity; frozen route context fields in history; per-entry recompute API and dashboard action; legacy row marking; focused continuity regression tests.

**Out of scope:** global recompute of all history; destructive history reset; new weather providers; broad redesign of latest estimation UX.

## Architecture / Approach

We keep the existing orchestration and RPC persistence foundation, then extend contracts around history semantics. Phase 1 introduces versioning/frozen-context/legacy schema and types. Phase 2 adds explicit per-row recompute flow using continuity-aware persistence. Phase 3 updates dashboard history rendering and tests to validate coherent snapshots and lineage.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. History data model and continuity contracts | Version-capable schema, frozen route fields, legacy markers | Incorrect schema semantics could still allow accidental overwrite behavior. |
| 2. Explicit per-entry recompute workflow | User-triggered recompute endpoint and continuity-aware writes | New endpoint could diverge from existing warning/fallback patterns. |
| 3. Dashboard continuity UX and regression coverage | Clear legacy/versioned history display with per-entry recompute action | UI confusion if lineage and recompute outcomes are not explicit enough. |

**Prerequisites:** local Supabase runtime available for migration/test validation; existing S-05 contracts remain baseline.
**Estimated effort:** ~2-3 implementation sessions across 3 phases.

## Open Risks & Assumptions

- Versioning strategy must remain query-efficient as history grows.
- Legacy labeling must be unambiguous to avoid user confusion in mixed datasets.
- Per-entry recompute must preserve atomic persistence and existing fallback guarantees.

## Success Criteria (Summary)

- Users see stable, non-drifting enriched history snapshots per row.
- Explicit recompute creates new versions without mutating prior history entries.
- Legacy and new continuity rows are both readable, with clear state and consistent warnings.
