# Saved Estimation History Implementation Plan

## Overview

Implement S-04 so users can keep saved estimation history (with lightweight route context) while preserving the stable S-03 latest-estimation flow.

The plan uses an additive architecture: keep current latest-per-user tables and add history persistence + dashboard history rendering with deterministic ordering and deduplication.

## Current State Analysis

Current persistence and UI are latest-only: route snapshot and estimation overwrite one record per user, and dashboard renders one latest route context plus one latest estimation card. Recompute happens after GPX upload and after profile save.

This is a good baseline for low-risk extension, but it cannot satisfy FR-004 and FR-008 because no historical rows are stored and no history list is exposed.

## Desired End State

A signed-in user can revisit saved estimation history on dashboard, including basic route context for each entry. New history writes occur during existing recompute triggers, with deduplication by route hash + profile signature.

Ordering is deterministic (`computed_at DESC`, tie-break `id DESC`). If history persistence fails but latest estimation persistence succeeds, user still gets latest result and sees an explicit warning.

### Key Discoveries:

- Estimation storage is latest-only by contract (`route_estimations.user_id` PK + upsert on conflict) (`supabase/migrations/20260913212000_create_route_estimations.sql`, `src/lib/estimation/service.ts:46-75`).
- Route snapshot storage is also latest-only (`src/lib/route/service.ts:48-80`).
- Recompute orchestration already centralizes upload/profile triggers (`src/lib/estimation/orchestration.ts:31-80`, `src/pages/api/routes/upload.ts:54-84`, `src/pages/api/profile.ts:93-116`).
- Dashboard SSR currently reads and renders only latest snapshot + latest estimation (`src/pages/dashboard.astro:12-23`, `src/pages/dashboard.astro:58-98`).

## What We're NOT Doing

- Building a full route library module (advanced filters, detail pages, compare views).
- Replacing or redesigning S-03 latest-estimation flow.
- Introducing background jobs, event sourcing, or async workers for history writes.
- Adding retention automation or archival policies beyond current MVP needs.

## Implementation Approach

Add dedicated history tables and service methods, then extend existing orchestration so recompute can append history records using deduplication keys. Keep latest tables as the canonical source for current dashboard card, and add a separate SSR-loaded history section for saved entries.

The route-history requirement is met with a lightweight route-history read model tied to saved estimations, not a standalone route-management subsystem.

## Critical Implementation Details

### State sequencing

Upload/profile flows keep current successful writes (snapshot/profile + latest estimation) even if history append fails. Partial failure maps to an explicit warning query param and never downgrades successful latest state.

### User experience spec

History list is intentionally lean: newest-first, stable order, route context summary, and derived estimation summary per row. No hidden dedupe behavior: identical route+profile recompute updates recency/value without creating duplicate rows.

## Phase 1: Add history persistence schema and deduplication contracts

### Overview

Create additive database structures for estimation history and lightweight route history context, including deterministic ordering and dedupe fields.

### Changes Required:

#### 1. Estimation history migration

**File**: `supabase/migrations/<timestamp>_create_route_estimation_history.sql` (new)

**Intent**: Introduce append-capable history persistence without changing latest-estimation table behavior.

**Contract**: Add table with surrogate `id`, `user_id`, estimation payload fields, `computed_at`, dedupe keys (`route_hash`, `profile_signature`), and indexes supporting `user_id + computed_at DESC + id DESC`.

#### 2. Lightweight route history migration

**File**: `supabase/migrations/<timestamp>_create_saved_route_history.sql` (new)

**Intent**: Cover FR-004 in S-04 using a minimal route-context history shape linked to saved estimations.

**Contract**: Add owner-scoped route-history table storing route context summary and `route_hash`; include uniqueness/merge strategy aligned with dedupe semantics and owner-only RLS policies.

#### 3. Shared history type contracts

**File**: `src/lib/estimation/types.ts`

**Intent**: Extend domain contracts so history services and dashboard SSR consume one typed model.

**Contract**: Add row/domain interfaces for estimation-history and saved-route-history records, including stable sort and dedupe fields.

### Success Criteria:

#### Automated Verification:

- New history migrations compile cleanly and follow owner-only RLS policy conventions in `supabase/migrations`.
- Astro type generation remains valid after type extensions: `npx astro sync`.
- Lint passes after contract updates: `npm run lint`.

#### Manual Verification:

- Schema design clearly supports history listing with deterministic order.
- Dedupe keys unambiguously represent “same route + same profile input”.
- Route history shape remains lightweight and aligned to S-04 scope.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Implement history services and dedupe-aware write behavior

### Overview

Add service-layer APIs for writing/listing history records and enforce dedupe semantics in one reusable place.

### Changes Required:

#### 1. Estimation history service

**File**: `src/lib/estimation/service.ts`

**Intent**: Extend the existing estimation service with history operations while keeping latest operations unchanged.

**Contract**: Add `listRouteEstimationHistoryForUser` and `upsertRouteEstimationHistoryEntryForUser` with stable ordering and mapping parity to existing service style.

#### 2. Route history service

**File**: `src/lib/route/service.ts`

**Intent**: Provide lightweight saved-route history persistence/listing used by dashboard history view.

**Contract**: Add history read/write methods that operate by `user_id` and `route_hash`, returning typed `{ data, error }` results.

#### 3. Orchestration extension for history writes

**File**: `src/lib/estimation/orchestration.ts`

**Intent**: Keep upload/profile callers simple by embedding dedupe-aware history append/update within existing recompute orchestration.

**Contract**: Recompute returns a structured partial-failure signal differentiating latest-write failure vs history-write failure for caller-level warning behavior.

### Success Criteria:

#### Automated Verification:

- Service-level unit tests validate dedupe behavior and stable ordering contracts: `node --test`.
- Lint and type checks pass for service/orchestration changes: `npm run lint`.
- Build remains green with updated service contracts: `npm run build`.

#### Manual Verification:

- Recompute with same route hash + same profile signature does not create duplicate history entries.
- Recompute with changed profile signature for same route creates/updates history according to chosen dedupe contract.
- Returned service data contains fields required by dashboard history rendering.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 3: Integrate API flows with explicit partial-failure warnings

### Overview

Wire history writes into existing upload/profile paths and preserve current success behavior for latest estimation.

### Changes Required:

#### 1. Route upload API integration

**File**: `src/pages/api/routes/upload.ts`

**Intent**: Ensure GPX upload recompute updates latest estimation and history records in one operation path.

**Contract**: Keep current auth/validation flow; map history-only persistence failures to warning redirect while preserving upload success.

#### 2. Profile update API integration

**File**: `src/pages/api/profile.ts`

**Intent**: Keep profile-driven recompute aligned with history contracts so saved records reflect profile changes.

**Contract**: Maintain current complete-profile gating; on history-write partial failure return success-with-warning path to dashboard.

#### 3. Error mapping updates

**File**: `src/lib/estimation/error-mapping.ts`

**Intent**: Provide deterministic user-facing message variants for history-specific failures.

**Contract**: Add explicit error code/message path for history persistence degradation distinct from full recompute failure.

### Success Criteria:

#### Automated Verification:

- API-level tests cover upload and profile flows for success, dedupe, and history-partial-failure paths: `node --test`.
- Lint remains green after route/profile API updates: `npm run lint`.
- Production build remains green after API integration changes: `npm run build`.

#### Manual Verification:

- Uploading GPX updates latest estimation and populates history list data.
- Updating profile refreshes latest estimation and updates history according to dedupe rule.
- History-write failure surfaces warning without breaking successful upload/profile outcome.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 4: Render saved history in dashboard and finalize validation

### Overview

Expose saved estimation/route history in dashboard with stable ordering and lightweight presentation.

### Changes Required:

#### 1. Dashboard SSR loading for history

**File**: `src/pages/dashboard.astro`

**Intent**: Extend current SSR data loading with history reads while preserving existing latest cards and fallback states.

**Contract**: Load latest snapshot/estimation plus history datasets in one request cycle; preserve current warning channel and add history-empty state.

#### 2. History presentation component(s)

**File**: `src/components/routes/` (new history component file[s])

**Intent**: Keep history rendering modular and aligned with existing dashboard style.

**Contract**: Render newest-first entries with route summary + estimation summary; handle no-history and warning states explicitly.

#### 3. Documentation and behavior notes

**File**: `README.md`

**Intent**: Document history semantics for developers and QA.

**Contract**: Describe dedupe key, ordering rule, partial-failure behavior, and scope limit of MVP history UI.

### Success Criteria:

#### Automated Verification:

- SSR/dashboard integration tests validate history rendering scenarios: `node --test`.
- Astro sync and lint pass with new dashboard/history components: `npx astro sync` and `npm run lint`.
- Production build succeeds with S-04 history UI enabled: `npm run build`.

#### Manual Verification:

- User sees saved estimation history ordered by `computed_at DESC`, tie-break `id DESC`.
- History entries include lightweight route context and estimation summary.
- Empty-history and warning states are clear and do not regress latest estimation card UX.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Testing Strategy

### Unit Tests:

- Dedupe key generation and equality checks (`route_hash + profile_signature`).
- History ordering and tie-break stability.
- Error mapping for history-only degradation.

### Integration Tests:

- Upload flow: latest write success + history write success.
- Upload/profile flows: latest success + history partial failure warning path.
- Dashboard SSR: combined latest + history load with empty/non-empty states.

### Manual Testing Steps:

1. Upload GPX with complete profile and confirm latest card + history entry appear.
2. Trigger recompute with same route/profile and confirm no duplicate history row.
3. Update profile inputs and confirm history updates according to dedupe contract.
4. Validate ordering when entries share close timestamps (tie-break by id).
5. Confirm partial-failure warning appears while latest result remains available.

## Performance Considerations

History reads should be bounded (default row limit + newest-first ordering). Indexes on `user_id, computed_at, id` are required to keep dashboard SSR fast as user history grows.

## Migration Notes

This change is additive: existing latest tables remain intact. Rollback path removes dashboard history rendering and API history writes before dropping new history tables.

## References

- Roadmap target: `context/foundation/roadmap.md` (S-04, FR-004, FR-008)
- Existing estimation service: `src/lib/estimation/service.ts:26-75`
- Existing recompute orchestration: `src/lib/estimation/orchestration.ts:31-80`
- Existing API integration points: `src/pages/api/routes/upload.ts:54-84`, `src/pages/api/profile.ts:93-116`
- Dashboard baseline: `src/pages/dashboard.astro:12-23`, `src/pages/dashboard.astro:58-98`
- Progress contract: `.github/skills/10x-plan/references/progress-format.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Add history persistence schema and deduplication contracts

#### Automated

- [x] 1.1 New history migrations compile cleanly and follow owner-only RLS policy conventions in `supabase/migrations`. — 0558bc6
- [x] 1.2 Astro type generation remains valid after type extensions: `npx astro sync`. — 0558bc6
- [x] 1.3 Lint passes after contract updates: `npm run lint`. — 0558bc6

#### Manual

- [x] 1.4 Schema design clearly supports history listing with deterministic order. — 0558bc6
- [x] 1.5 Dedupe keys unambiguously represent “same route + same profile input”. — 0558bc6
- [x] 1.6 Route history shape remains lightweight and aligned to S-04 scope. — 0558bc6

### Phase 2: Implement history services and dedupe-aware write behavior

#### Automated

- [x] 2.1 Service-level unit tests validate dedupe behavior and stable ordering contracts: `node --test`. — c8d9c53
- [x] 2.2 Lint and type checks pass for service/orchestration changes: `npm run lint`. — c8d9c53
- [x] 2.3 Build remains green with updated service contracts: `npm run build`. — c8d9c53

#### Manual

- [x] 2.4 Recompute with same route hash + same profile signature does not create duplicate history entries. — c8d9c53
- [x] 2.5 Recompute with changed profile signature for same route creates/updates history according to chosen dedupe contract. — c8d9c53
- [x] 2.6 Returned service data contains fields required by dashboard history rendering. — c8d9c53

### Phase 3: Integrate API flows with explicit partial-failure warnings

#### Automated

- [x] 3.1 API-level tests cover upload and profile flows for success, dedupe, and history-partial-failure paths: `node --test`. — 9ad98f4
- [x] 3.2 Lint remains green after route/profile API updates: `npm run lint`. — 9ad98f4
- [x] 3.3 Production build remains green after API integration changes: `npm run build`. — 9ad98f4

#### Manual

- [x] 3.4 Uploading GPX updates latest estimation and populates history list data. — 9ad98f4
- [x] 3.5 Updating profile refreshes latest estimation and updates history according to dedupe rule. — 9ad98f4
- [x] 3.6 History-write failure surfaces warning without breaking successful upload/profile outcome. — 9ad98f4

### Phase 4: Render saved history in dashboard and finalize validation

#### Automated

- [x] 4.1 SSR/dashboard integration tests validate history rendering scenarios: `node --test`.
- [x] 4.2 Astro sync and lint pass with new dashboard/history components: `npx astro sync` and `npm run lint`.
- [x] 4.3 Production build succeeds with S-04 history UI enabled: `npm run build`.

#### Manual

- [x] 4.4 User sees saved estimation history ordered by `computed_at DESC`, tie-break `id DESC`.
- [x] 4.5 History entries include lightweight route context and estimation summary.
- [x] 4.6 Empty-history and warning states are clear and do not regress latest estimation card UX.
