# Enriched Estimation History Continuity Implementation Plan

## Overview

Implement S-06 so saved estimations remain coherent after enrichment: users can inspect historical entries with frozen context, trigger explicit per-entry recompute, and compare refreshed results without losing original meaning.

## Current State Analysis

The stack already stores enriched estimation metrics (`averagePaceMinPerKm`, external signal statuses) and renders them in dashboard history, but continuity is still weak in three places. First, history writes are upserts keyed by `(user_id, route_hash, profile_signature)`, so repeated recalculations overwrite state instead of preserving versions. Second, history rows do not freeze route context and currently rely on live join with `saved_route_history`, which can drift. Third, recompute happens only indirectly (upload/profile), with no explicit action from a history row.

## Desired End State

Users can open dashboard history and see stable enriched snapshots per estimation event, including route context that matches the computed result at save time. From any row, users can run explicit recompute that creates a new versioned history entry while preserving prior versions. Time semantics are deterministic: planned run datetime is stored as UTC with source offset metadata, and legacy rows are clearly marked without forced backfill.

### Key Discoveries:

- History persistence currently upserts and updates a single row per dedupe key (`src/lib/estimation/service.ts`, `supabase/migrations/20260913224500_create_route_estimation_history.sql`).
- History UI composes estimation rows with route context from a separate table via `routeHash`, enabling display drift over time (`src/lib/estimation/history-view.ts`).
- Recompute entrypoints are upload/profile flows only; there is no user-triggered per-history recompute route today (`src/pages/api/routes/upload.ts`, `src/pages/api/profile.ts`).
- `plannedRunAt` parsing already carries timezone offset from client, so UTC + offset metadata can be formalized without changing UX direction (`src/components/routes/RouteUploadForm.tsx`, `src/pages/api/routes/upload.ts`).

## What We're NOT Doing

- No global recompute of all historical entries.
- No destructive history reset for S-06 rollout.
- No new weather providers or heavier forecast modeling.
- No redesign of latest-estimation card behavior beyond continuity-specific additions.

## Implementation Approach

Keep the existing orchestration and persistence architecture, then harden history semantics in place. The plan introduces version-aware history contracts and frozen route context fields on history records, adds explicit per-entry recompute API + UI action, and finalizes continuity UX/testing around legacy-vs-versioned entries. This preserves current upload/profile behavior while adding a controllable recompute path.

## Critical Implementation Details

### Timing & lifecycle

When recompute is triggered from history, create a new history version and keep the previous row immutable. Recompute must read current profile and weather/provider state, but the source row remains untouched as the historical baseline.

### State sequencing

History write and latest write stay atomic through the existing bundle RPC path; explicit recompute must not introduce a side path that can persist only one of them. Legacy marking migration runs before new versioned writes are enabled.

## Phase 1: History data model and continuity contracts

### Overview

Establish schema and type contracts for versioned history, frozen route context, UTC+offset time metadata, and legacy row labeling.

### Changes Required:

#### 1. History schema evolution

**File**: `supabase/migrations/<timestamp>_evolve_route_estimation_history_for_s06.sql`

**Intent**: Convert history from overwrite semantics to version-preserving continuity semantics.

**Contract**: Add versioning fields and lineage metadata to `route_estimation_history` so explicit recomputes create new entries rather than update-in-place for the same conceptual route/profile key.

#### 2. Frozen route context in history rows

**File**: `supabase/migrations/<timestamp>_freeze_route_context_in_estimation_history.sql`, `src/lib/estimation/types.ts`

**Intent**: Ensure each history row carries stable route context used for user-facing rendering.

**Contract**: Store route display/context fields required by history UI directly on `route_estimation_history` (at minimum filename, distance, elevation gain, planned run UTC, planned run offset), and map them in row/domain interfaces.

#### 3. Legacy labeling strategy

**File**: `supabase/migrations/<timestamp>_mark_legacy_history_rows.sql`

**Intent**: Keep existing records visible without risky mass recompute.

**Contract**: Introduce a machine-readable legacy marker for pre-S-06 rows and set it for existing data; no backfill recalculation is performed.

### Success Criteria:

#### Automated Verification:

- New migrations apply cleanly in local Supabase workflow: `npx supabase migration up`.
- Type contracts compile after schema expansion: `npm run build`.
- Lint remains clean after contract updates: `npm run lint`.
- History contract tests pass with new continuity fields: `node --test tests/estimation-history-contracts.test.js`.

#### Manual Verification:

- Existing historical records remain queryable and visibly marked as legacy.
- New continuity fields are nullable/compatible for legacy rows and populated for new rows.
- Schema supports multiple versions for same conceptual route/profile history thread.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Explicit per-entry recompute workflow

### Overview

Add a dedicated recompute action for a selected history row and persist refreshed estimation as a new versioned entry.

### Changes Required:

#### 1. Recompute API endpoint for history entry

**File**: `src/pages/api/estimations/history/recompute.ts` (new)

**Intent**: Provide an explicit user action boundary for recomputing one selected history item.

**Contract**: Accept history entry identifier, authorize ownership, load required baseline context, run recompute through orchestration, and return redirect-safe success/warning/error contract consistent with existing dashboard flows.

#### 2. Orchestration and service continuity path

**File**: `src/lib/estimation/orchestration.ts`, `src/lib/estimation/service.ts`, `src/lib/estimation/history-signature.ts`

**Intent**: Reuse existing compute/persist logic while introducing version-preserving history writes for explicit recompute.

**Contract**: Add a continuity-aware persistence path that creates a new version row and snapshots route context into history row fields, while latest estimation remains updated as before.

#### 3. Time metadata persistence (UTC + offset)

**File**: `src/lib/route/types.ts`, `src/lib/route/service.ts`, `src/pages/api/routes/upload.ts`, `src/lib/estimation/types.ts`

**Intent**: Finalize deterministic time semantics for weather resolution and history inspection.

**Contract**: Persist UTC planned run timestamp together with source timezone offset metadata from client; recompute paths preserve and expose both values where needed for continuity display.

### Success Criteria:

#### Automated Verification:

- API recompute feedback tests pass for success/warning/failure paths: `node --test tests/api-recompute-feedback.test.js`.
- History contract tests validate version creation for explicit recompute: `node --test tests/estimation-history-contracts.test.js`.
- Build and lint pass after endpoint + orchestration updates: `npm run build && npm run lint`.

#### Manual Verification:

- User can trigger recompute from a specific history row.
- Recompute creates a new history version and preserves prior entry unchanged.
- Warning behavior stays consistent when optional signals are missing or provider fails.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 3: Dashboard continuity UX and regression coverage

### Overview

Render versioned continuity clearly in history UI and lock behavior with focused tests.

### Changes Required:

#### 1. History view model update

**File**: `src/lib/estimation/history-view.ts`

**Intent**: Remove drift-prone dependence on live route join for core row rendering.

**Contract**: Build history items from frozen context stored on estimation history rows; include version/legacy indicators and signal context needed by component layer.

#### 2. Dashboard and component interaction

**File**: `src/components/routes/SavedEstimationHistory.astro`, `src/pages/dashboard.astro`

**Intent**: Expose per-entry recompute action and communicate continuity state to users.

**Contract**: Render row-level recompute control, version/legacy labels, stable pace/signal fields, and non-blocking warning messages consistent with current dashboard message precedence.

#### 3. Test suite expansion for continuity semantics

**File**: `tests/dashboard-history-view.test.js`, `tests/estimation-history-contracts.test.js`, `tests/api-recompute-feedback.test.js`

**Intent**: Prevent regressions in new continuity rules and user-visible behavior.

**Contract**: Add tests covering frozen-context rendering, explicit recompute versioning, and legacy row handling in list output and warnings.

### Success Criteria:

#### Automated Verification:

- Dashboard history view tests pass with legacy/versioned scenarios: `node --test tests/dashboard-history-view.test.js`.
- History contracts and recompute feedback tests pass end-to-end: `node --test tests/estimation-history-contracts.test.js tests/api-recompute-feedback.test.js`.
- Repository lint and build pass after UI/SSR changes: `npm run lint && npm run build`.

#### Manual Verification:

- Dashboard history shows coherent route context for each row without post-upload drift.
- Legacy rows are clearly distinguishable from S-06 versioned rows.
- Per-entry recompute is understandable and does not regress existing upload/profile flows.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

## Testing Strategy

### Unit Tests:

- Signature/version contract generation for continuity keys and lineage metadata.
- Time metadata mapping (UTC timestamp + offset) through row/domain conversion.
- Warning-resolution behavior when explicit recompute returns degraded optional signals.

### Integration Tests:

- Upload/profile baseline flows still refresh latest estimation without requiring explicit recompute.
- Per-entry recompute flow creates a new history version and keeps prior rows intact.
- History rendering uses frozen row context even when `saved_route_history` later changes.

### Manual Testing Steps:

1. Trigger multiple recomputes from one history row and confirm version chain is preserved.
2. Edit profile between recomputes and verify new row reflects updated profile-derived estimation while prior row remains unchanged.
3. Validate that planned run local intent is still understandable in UI via UTC + offset representation.

## Performance Considerations

Versioned history increases row count, so list queries remain bounded and indexed by user + recency/version fields. Per-entry recompute stays on request-response path with neutral fallback for optional provider failures to avoid long-lived retries in web requests.

## Migration Notes

This change is additive and backward-compatible for reads: legacy rows remain queryable and are tagged. No destructive reset or forced backfill is executed. Rollback strategy is to hide new UI controls first, then disable explicit recompute endpoint, and only then revert schema usage.

## References

- Roadmap target: `context/foundation/roadmap.md` (S-06, `enriched-estimation-history`)
- Existing orchestration baseline: `src/lib/estimation/orchestration.ts`
- Existing history mapping: `src/lib/estimation/history-view.ts`
- Existing history persistence contract: `src/lib/estimation/service.ts`
- Existing time input contract: `src/components/routes/RouteUploadForm.tsx`, `src/pages/api/routes/upload.ts`
- Progress contract: `.github/skills/10x-plan/references/progress-format.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: History data model and continuity contracts

#### Automated

- [x] 1.1 New migrations apply cleanly in local Supabase workflow: `npx supabase migration up`. — 439e2e8
- [x] 1.2 Type contracts compile after schema expansion: `npm run build`. — 439e2e8
- [x] 1.3 Lint remains clean after contract updates: `npm run lint`. — 439e2e8
- [x] 1.4 History contract tests pass with new continuity fields: `node --test tests/estimation-history-contracts.test.js`. — 439e2e8

#### Manual

- [x] 1.5 Existing historical records remain queryable and visibly marked as legacy. — 439e2e8
- [x] 1.6 New continuity fields are nullable/compatible for legacy rows and populated for new rows. — 439e2e8
- [x] 1.7 Schema supports multiple versions for same conceptual route/profile history thread. — 439e2e8

### Phase 2: Explicit per-entry recompute workflow

#### Automated

- [x] 2.1 API recompute feedback tests pass for success/warning/failure paths: `node --test tests/api-recompute-feedback.test.js`. — 50f1706
- [x] 2.2 History contract tests validate version creation for explicit recompute: `node --test tests/estimation-history-contracts.test.js`. — 50f1706
- [x] 2.3 Build and lint pass after endpoint + orchestration updates: `npm run build && npm run lint`. — 50f1706

#### Manual

- [x] 2.4 User can trigger recompute from a specific history row. — 50f1706
- [x] 2.5 Recompute creates a new history version and preserves prior entry unchanged. — 50f1706
- [x] 2.6 Warning behavior stays consistent when optional signals are missing or provider fails. — 50f1706

### Phase 3: Dashboard continuity UX and regression coverage

#### Automated

- [x] 3.1 Dashboard history view tests pass with legacy/versioned scenarios: `node --test tests/dashboard-history-view.test.js`. — 95db4a0
- [x] 3.2 History contracts and recompute feedback tests pass end-to-end: `node --test tests/estimation-history-contracts.test.js tests/api-recompute-feedback.test.js`. — 95db4a0
- [x] 3.3 Repository lint and build pass after UI/SSR changes: `npm run lint && npm run build`. — 95db4a0

#### Manual

- [x] 3.4 Dashboard history shows coherent route context for each row without post-upload drift. — 95db4a0
- [x] 3.5 Legacy rows are clearly distinguishable from S-06 versioned rows. — 95db4a0
- [x] 3.6 Per-entry recompute is understandable and does not regress existing upload/profile flows. — 95db4a0
