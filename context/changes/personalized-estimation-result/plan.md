# Personalized Estimation Result Implementation Plan

## Overview

Implement S-03 as the north-star slice: generate deterministic route analysis and personalized time estimation from the latest uploaded GPX route and completed sport profile, then show the result on dashboard with clear difficulty labeling.

This plan intentionally excludes estimation history (S-04 scope), but persists a single latest estimation snapshot per user so results stay stable across reloads and can be refreshed when route or profile changes.

## Current State Analysis

S-01 and S-02 already provide required prerequisites: authenticated users with complete profiles, a persisted latest route snapshot per user, and dashboard integration for route context preview. The missing part is the full estimation domain: no analysis engine, no difficulty/time contracts, and no persistence or UI for estimation results.

Current API flows already follow a consistent server-first pattern (auth check -> service call -> redirect with query params), which we should preserve for estimation recompute points on both route upload and profile update paths.

## Desired End State

A signed-in user with completed profile and uploaded GPX can open dashboard and see:
1) route analysis context (including slope-derived data),
2) personalized completion-time estimation,
3) deterministic easy/medium/hard difficulty label.

The result is recomputed in two places: after GPX upload and after profile update, and stored as latest estimation per user in a dedicated table with owner-only RLS. If recompute fails, route snapshot remains usable and dashboard shows a friendly estimation error without breaking S-02 behavior.

### Key Discoveries:

- Route snapshot inputs are already persisted and available server-side (`src/lib/route/service.ts`, `src/pages/dashboard.astro`).
- Profile completeness and profile persistence are already standardized (`src/lib/profile/service.ts`, `src/pages/api/profile.ts`).
- Existing API/error UX pattern uses redirect query messages, not JSON response contracts (`src/pages/api/routes/upload.ts`, `src/pages/api/profile.ts`).
- DB policy style is strict owner-only RLS with per-operation policies (`supabase/migrations/20260904110000_create_profiles.sql`, `supabase/migrations/20260913181500_create_route_snapshots.sql`).

## What We're NOT Doing

- Implementing saved estimation history browsing (S-04 scope).
- Adding async queue/background job orchestration for estimation.
- Introducing ML-based or externally hosted prediction models.
- Redesigning existing S-02 upload/map UX beyond adding estimation presentation.

## Implementation Approach

Add a dedicated `route_estimations` latest-per-user table, then implement deterministic estimation logic in a pure service module that combines route snapshot metrics/geometry with profile fields. Integrate recomputation into both existing mutation boundaries (route upload and profile save), and render estimation in dashboard SSR with graceful degradation when only estimation fails.

## Critical Implementation Details

### Timing & lifecycle

Recompute must run only after successful write of the triggering source state (route snapshot write on upload, profile write on profile save). Failed recompute must not roll back successful source writes.

### State sequencing

Route upload flow sequence: validate -> parse -> upsert route snapshot -> fetch profile -> recompute estimation -> upsert latest estimation -> redirect.
Profile save flow sequence: validate -> upsert profile -> fetch latest route snapshot -> recompute estimation (if snapshot exists and profile complete) -> upsert latest estimation -> redirect.

### User experience spec

Dashboard must continue to show latest route context even when estimation is unavailable. Estimation failures surface as explicit friendly messages; no silent fallback.

## Phase 1: Define estimation persistence and contracts

### Overview

Introduce schema and type contracts for storing and rendering latest personalized estimation per user.

### Changes Required:

#### 1. Estimation schema and RLS

**File**: `supabase/migrations/<timestamp>_create_route_estimations.sql` (new)

**Intent**: Add a dedicated persistence contract for latest estimation result per user while keeping route snapshots as source data.

**Contract**: Create `route_estimations` with `user_id` PK/FK to `auth.users`, deterministic result fields (time estimate, difficulty, key derived metrics), source timestamps, and owner-only select/insert/update RLS policies.

#### 2. Shared estimation domain types

**File**: `src/lib/estimation/types.ts` (new)

**Intent**: Centralize type-safe contracts for estimation input, computed analysis output, difficulty label, and persisted row mapping.

**Contract**: Export interfaces/enums for difficulty (`easy|medium|hard`), computed metrics payload, estimation snapshot input/output, and Supabase row shape.

### Success Criteria:

#### Automated Verification:

- Migration file exists in `supabase/migrations` with owner-only RLS policies.
- Astro sync passes with new estimation types: `npx astro sync`.
- Lint passes after adding domain contracts: `npm run lint`.

#### Manual Verification:

- Migration semantics clearly enforce latest-per-user estimation ownership.
- Estimation type contract is sufficient for both API/service and dashboard rendering.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Build deterministic analysis and estimation engine

### Overview

Implement deterministic computation that transforms route snapshot + sport profile into time estimate and difficulty label.

### Changes Required:

#### 1. Estimation engine

**File**: `src/lib/estimation/engine.ts` (new)

**Intent**: Keep all domain math in a pure, testable module independent from transport and persistence.

**Contract**: Accept normalized route snapshot and profile input; compute slope-aware derived metrics, estimated time (minutes), and deterministic difficulty label via explicit threshold rules.

#### 2. Estimation persistence service

**File**: `src/lib/estimation/service.ts` (new)

**Intent**: Isolate latest-estimation read/upsert behavior behind service methods following existing `src/lib/*/service.ts` conventions.

**Contract**: Expose `getRouteEstimationForUser` and `upsertRouteEstimationForUser` returning `{ data, error }`, with snake_case DB mapping and latest-per-user upsert semantics.

#### 3. Estimation error mapping

**File**: `src/lib/estimation/error-mapping.ts` (new)

**Intent**: Ensure user-facing estimation errors are deterministic and reusable across upload/profile flows.

**Contract**: Map estimation domain and persistence failures to stable user messages for dashboard redirect/query rendering.

### Success Criteria:

#### Automated Verification:

- Estimation engine deterministic checks pass (fixtures/edge cases): `node --test`.
- Astro sync passes with estimation modules: `npx astro sync`.
- Lint passes for estimation domain code: `npm run lint`.

#### Manual Verification:

- Same route/profile input always yields identical estimation output.
- Difficulty classification is stable on threshold boundaries (no oscillation for equivalent inputs).
- Null/missing elevation-derived edge cases fail gracefully with explicit estimation error category.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 3: Integrate hybrid recomputation into API flows

### Overview

Wire estimation recomputation into both mutation boundaries: route upload and profile update.

### Changes Required:

#### 1. Upload-flow recomputation

**File**: `src/pages/api/routes/upload.ts`

**Intent**: Keep S-02 upload UX while adding immediate recompute of latest estimation after successful snapshot upsert.

**Contract**: After route snapshot save, fetch current profile and recompute/upsert estimation when profile is complete; on estimation-only failure, keep upload success and surface estimation warning path.

#### 2. Profile-flow recomputation

**File**: `src/pages/api/profile.ts`

**Intent**: Keep profile update flow as second recompute trigger so estimation stays aligned with latest profile data.

**Contract**: After profile upsert to complete status, load latest route snapshot; if snapshot exists, recompute/upsert estimation; preserve successful profile save when estimation fails and expose user-visible warning.

#### 3. Shared orchestration helper

**File**: `src/lib/estimation/orchestration.ts` (new)

**Intent**: Avoid duplicated recompute choreography between upload and profile APIs.

**Contract**: Provide one reusable function that receives `supabase`, `userId`, `snapshot`, and `profile`, runs engine + upsert, and returns typed success/failure result for caller-specific redirect behavior.

### Success Criteria:

#### Automated Verification:

- API routes pass lint/type checks after recompute integration: `npm run lint`.
- Production build passes with integrated estimation flow: `npm run build`.
- Route/profile recompute integration checks pass (API-level tests or scripted assertions): `node --test`.

#### Manual Verification:

- Uploading valid GPX recomputes and stores latest estimation.
- Completing/updating profile recomputes latest estimation when route snapshot exists.
- Estimation failure does not break route upload/profile save success path; user sees clear warning.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 4: Render dashboard estimation context and finalize verification

### Overview

Expose S-03 value in UI and close end-to-end validation for the full estimation flow.

### Changes Required:

#### 1. Dashboard data loading and state handling

**File**: `src/pages/dashboard.astro`

**Intent**: Extend dashboard SSR loading to include latest estimation state and user-facing estimation warning/success states.

**Contract**: Read latest estimation with route snapshot; render deterministic fallback states (no estimation yet / estimation error while snapshot exists) without regressing existing route context panel.

#### 2. Estimation presentation component

**File**: `src/components/routes/RouteEstimationCard.tsx` (new)

**Intent**: Keep result rendering isolated and reusable while matching existing dashboard visual patterns.

**Contract**: Display estimated completion time, difficulty badge, and key analysis context fields used by the estimate.

#### 3. Documentation handoff

**File**: `README.md`

**Intent**: Document S-03 behavior boundaries for developers and QA.

**Contract**: Add concise section describing latest estimation semantics, recompute triggers (upload/profile), and graceful-degradation behavior.

### Success Criteria:

#### Automated Verification:

- Astro sync passes with dashboard + new component wiring: `npx astro sync`.
- Repository lint remains green after S-03 integration: `npm run lint`.
- Production build remains green after S-03 integration: `npm run build`.

#### Manual Verification:

- User with complete profile and GPX sees personalized time + difficulty on dashboard.
- Re-uploading GPX updates estimation to route-specific latest result.
- Updating profile updates estimation for existing latest route without re-upload.
- Estimation-specific failure keeps route context visible and shows explicit warning.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Testing Strategy

### Unit Tests:

- Estimation engine deterministic outputs for fixed route/profile fixtures.
- Difficulty thresholds on boundary values (just below/at/above each threshold).
- Handling of missing/flat elevation and minimal valid route geometry.

### Integration Tests:

- Upload API path recomputes latest estimation after successful snapshot upsert.
- Profile API path recomputes latest estimation after completed profile update.
- Dashboard SSR displays estimation, no-estimation, and estimation-warning states correctly.

### Manual Testing Steps:

1. Sign in as completed-profile user with existing GPX snapshot, open dashboard, verify estimation card appears.
2. Upload a new valid GPX and confirm route context and estimation both update.
3. Update profile inputs (weight/weekly distance/experience) and confirm estimation refreshes without new upload.
4. Trigger estimation failure scenario (invalid derived data path) and verify route panel remains visible with warning.
5. Confirm unauthorized API calls remain denied/redirected and do not expose estimation data.

## Performance Considerations

Estimation remains synchronous in current SSR/API flow with existing GPX size constraints (5 MB cap) reused as compute boundary. No queue/background processing is introduced in S-03; if response times degrade on large tracks, optimization is deferred to a follow-up slice.

## Migration Notes

`route_estimations` is additive and can be rolled back independently from `route_snapshots`. If rollback is needed, remove dashboard estimation rendering first, then disable recompute integration in API routes before dropping estimation persistence.

## References

- Product requirements: `context/foundation/prd.md` (FR-005, FR-006, US-01)
- Roadmap slice: `context/foundation/roadmap.md` (`S-03`, `Change ID: personalized-estimation-result`)
- Existing route contracts: `src/lib/route/types.ts`, `src/lib/route/service.ts`
- Existing API patterns: `src/pages/api/routes/upload.ts`, `src/pages/api/profile.ts`
- Existing dashboard integration point: `src/pages/dashboard.astro`
- Progress contract: `.github/skills/10x-plan/references/progress-format.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Define estimation persistence and contracts

#### Automated

- [x] 1.1 Migration file exists in `supabase/migrations` with owner-only RLS policies.
- [x] 1.2 Astro sync passes with new estimation types: `npx astro sync`.
- [x] 1.3 Lint passes after adding domain contracts: `npm run lint`.

#### Manual

- [ ] 1.4 Migration semantics enforce latest-per-user estimation ownership.
- [ ] 1.5 Estimation type contract supports API/service and dashboard rendering.

### Phase 2: Build deterministic analysis and estimation engine

#### Automated

- [ ] 2.1 Estimation engine deterministic checks pass (fixtures/edge cases): `node --test`.
- [ ] 2.2 Astro sync passes with estimation modules: `npx astro sync`.
- [ ] 2.3 Lint passes for estimation domain code: `npm run lint`.

#### Manual

- [ ] 2.4 Same route/profile input always yields identical estimation output.
- [ ] 2.5 Difficulty classification is stable on threshold boundaries.
- [ ] 2.6 Missing elevation-derived edge cases fail gracefully with explicit error category.

### Phase 3: Integrate hybrid recomputation into API flows

#### Automated

- [ ] 3.1 API routes pass lint/type checks after recompute integration: `npm run lint`.
- [ ] 3.2 Production build passes with integrated estimation flow: `npm run build`.
- [ ] 3.3 Route/profile recompute integration checks pass: `node --test`.

#### Manual

- [ ] 3.4 Uploading valid GPX recomputes and stores latest estimation.
- [ ] 3.5 Completing/updating profile recomputes latest estimation when route snapshot exists.
- [ ] 3.6 Estimation failure does not break upload/profile success path and is communicated.

### Phase 4: Render dashboard estimation context and finalize verification

#### Automated

- [ ] 4.1 Astro sync passes with dashboard and estimation component wiring: `npx astro sync`.
- [ ] 4.2 Repository lint remains green after S-03 integration: `npm run lint`.
- [ ] 4.3 Production build remains green after S-03 integration: `npm run build`.

#### Manual

- [ ] 4.4 User with complete profile and GPX sees personalized time and difficulty.
- [ ] 4.5 Re-uploading GPX refreshes latest estimation result.
- [ ] 4.6 Updating profile refreshes estimation for existing latest route.
- [ ] 4.7 Estimation failures preserve route context visibility with explicit warning.
