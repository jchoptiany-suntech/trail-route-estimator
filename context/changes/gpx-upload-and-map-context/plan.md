# GPX Upload and Map Context Implementation Plan

## Overview

Implement S-02 as the next vertical milestone slice after archived S-01: authenticated users with completed profiles can upload a GPX file and see the uploaded route in a map preview context. This closes FR-003 and FR-007 with a minimal contract that stays compatible with downstream estimation work.

## Current State Analysis

Auth/session and profile gating are already centralized in middleware and Supabase SSR helpers, and dashboard is already a protected entry point. What is missing is every route-specific capability: GPX ingestion, parsing, route snapshot persistence, and route map rendering.

There is no existing file-upload endpoint, no XML/GPX parser utility, no route table, and no map component in the current codebase. The implementation must therefore add these contracts while preserving existing auth/profile conventions and route-level ownership boundaries.

## Desired End State

A signed-in user with a completed profile can upload a `.gpx` file from dashboard, the server validates/parses it, and the app persists a user-owned latest-route snapshot. Dashboard then displays a static mini-map preview of the stored route together with basic route context needed for the next slice.

Verification is complete when upload/re-upload/error flows and route visibility behave correctly under authenticated access, while unauthenticated access stays denied and existing auth/profile behaviors remain unchanged.

### Key Discoveries:

- Existing API conventions already provide the target shape for form parsing, auth checks, and redirect-based error UX (`src/pages/api/profile.ts:51-94`).
- Route protection and profile-complete gating are centralized in middleware and should remain the only policy gate (`src/middleware.ts:5-40`).
- Dashboard is already protected and positioned as the next route-analysis surface (`src/pages/dashboard.astro:1-29`).
- The project has no GPX parsing or map dependency baseline yet, so S-02 must introduce minimal route-specific utilities/components (`package.json`).
- Owner-only persistence and RLS policy style are already established in the profiles migration and should be mirrored for route snapshots (`supabase/migrations/20260904110000_create_profiles.sql`).

## What We're NOT Doing

- Running route analysis, estimating completion time, or assigning difficulty labels (S-03 scope).
- Building route history browsing or multi-route management UI (S-04 scope).
- Adding advanced interactive map controls (layers, hover analytics, style switching).
- Introducing a new automated test framework beyond existing lint/build/astro-sync checks.
- Adding background processing queues, telemetry pipelines, or non-MVP performance engineering.

## Implementation Approach

Use the same server-first pattern proven in S-01: add an explicit persistence contract first, isolate GPX parsing and route data mapping in a service layer, then wire an authenticated upload endpoint and dashboard UI consumption. Keep scope minimal and deterministic by using a single latest-route snapshot per user (upsert semantics), hard server-side file validation, full geometry persistence for this slice, and static mini-map rendering fed from persisted data.

## Critical Implementation Details

### Timing & lifecycle

Persist route snapshot only after parse/validation fully succeeds; any upload failure must keep the previous valid snapshot untouched. This preserves continuity and prevents accidental loss of the last usable route context.

### State sequencing

The re-upload contract is forward replacement (`latest route`) rather than additive history. That keeps S-02 small while producing a stable single-source route context for S-03 computations.

## Phase 1: Define route snapshot persistence contract

### Overview

Introduce a minimal, user-owned database contract for one latest uploaded route snapshot per user.

### Changes Required:

#### 1. Route snapshot schema and RLS policies

**File**: `supabase/migrations/<timestamp>_create_route_snapshots.sql` (new)

**Intent**: Add persistent storage for GPX-derived route context under strict per-user ownership.

**Contract**: Create a `route_snapshots` table keyed by `user_id` (single active snapshot per user) with route metadata fields and preview geometry payload, timestamps, and owner-only select/insert/update policies.

#### 2. Shared route data typing

**File**: `src/lib/route/types.ts` (new)

**Intent**: Define a stable domain contract for parsed GPX data and persisted snapshot payload shared by API, service, and UI.

**Contract**: Export typed interfaces for upload input constraints, parsed points, and normalized snapshot row mapping.

### Success Criteria:

#### Automated Verification:

- Migration file exists in `supabase/migrations` and follows project naming convention.
- Astro type sync succeeds with new route-domain types: `npx astro sync`.
- Lint passes after adding route type contracts: `npm run lint`.

#### Manual Verification:

- A developer can inspect migration SQL and confirm per-user ownership and RLS boundaries match the profile policy model.
- Snapshot contract clearly supports basic map preview and downstream S-03 feature extraction needs.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Implement GPX parsing and route snapshot service

### Overview

Add server-side GPX parsing and domain service operations that transform upload input into persisted latest-route snapshot state.

### Changes Required:

#### 1. GPX parser and validation boundary

**File**: `src/lib/route/gpx.ts` (new)

**Intent**: Centralize XML/GPX parsing and structural validation in one reusable module.

**Contract**: Parse GPX payload into normalized point data; enforce hard limits (file type/extension, max size, required track points) and return explicit parse/validation error categories for user-facing mapping.

#### 2. Route snapshot service

**File**: `src/lib/route/service.ts` (new)

**Intent**: Isolate Supabase read/upsert logic for latest route snapshot per user.

**Contract**: Expose typed operations to get current snapshot and to upsert a new snapshot from parsed GPX data, preserving previous snapshot on failed parse or failed write.

#### 3. Route error mapping helper

**File**: `src/lib/route/error-mapping.ts` (new)

**Intent**: Keep upload failures user-friendly and consistent with existing auth/profile error handling style.

**Contract**: Map internal parser/storage/auth failures to stable route-specific error messages suitable for query-param redirect rendering.

### Success Criteria:

#### Automated Verification:

- Astro sync succeeds with new route parser/service modules: `npx astro sync`.
- Lint passes for parser and service layer code: `npm run lint`.
- Production build succeeds after route service integration: `npm run build`.

#### Manual Verification:

- Valid GPX input produces normalized point and metadata output expected by snapshot service.
- Malformed GPX and empty-track GPX are rejected with deterministic error categories.
- Parser/service failure paths do not clear an existing previously stored snapshot.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 3: Deliver upload endpoint and dashboard mini-map flow

### Overview

Wire authenticated upload handling and dashboard rendering so users can upload GPX and see static map context from persisted snapshot data.

### Changes Required:

#### 1. Upload API route

**File**: `src/pages/api/routes/upload.ts` (new)

**Intent**: Provide authenticated multipart upload entrypoint for GPX ingestion.

**Contract**: Implement `POST` APIRoute that validates file constraints server-side, delegates parse + upsert to route service, keeps previous snapshot on failure, and redirects to `/dashboard` with success/error query params.

#### 2. Dashboard route data loading

**File**: `src/pages/dashboard.astro`

**Intent**: Evolve dashboard from placeholder into the route-context workspace for S-02.

**Contract**: Load current user snapshot state server-side, expose upload status messages, and render upload form + static mini-map preview when snapshot exists.

#### 3. Upload and mini-map UI components

**File**: `src/components/routes/RouteUploadForm.tsx` (new)

**Intent**: Provide the interactive upload surface following existing form interaction patterns.

**Contract**: Controlled file input form posting multipart data to `/api/routes/upload`, with inline client guidance and server error/success display compatibility.

**File**: `src/components/routes/RouteMiniMap.tsx` (new)

**Intent**: Render a static route preview context from persisted geometry.

**Contract**: Display normalized route polyline preview and lightweight start/end cues without advanced map interactions.

#### 4. Navigation and access consistency

**File**: `src/components/Topbar.astro`

**Intent**: Keep navigation coherent as dashboard becomes a route-upload surface.

**Contract**: Preserve current auth/profile links and expose the route-context destination without breaking existing sign-out flow.

### Success Criteria:

#### Automated Verification:

- Astro sync succeeds with new route API and dashboard component wiring: `npx astro sync`.
- Lint passes for dashboard and new route components: `npm run lint`.
- Production build succeeds with upload and mini-map integration: `npm run build`.

#### Manual Verification:

- Completed-profile user can upload a valid GPX and then see route preview context on dashboard.
- Re-upload replaces prior snapshot (latest route semantics) without creating duplicate visible state.
- Invalid file type/size/malformed GPX shows friendly error and preserves the last valid snapshot view.
- Unauthenticated requests to upload endpoint are denied/redirected consistently.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 4: Final verification matrix and documentation handoff

### Overview

Lock confidence for S-02 completion with explicit end-to-end verification and documentation updates.

### Changes Required:

#### 1. Documentation update

**File**: `README.md`

**Intent**: Document GPX upload constraints and route-preview behavior so local development and QA expectations are explicit.

**Contract**: Add concise guidance on supported GPX constraints, dashboard upload flow, and known scope boundaries for S-02.

#### 2. Plan progress and manual matrix completion

**File**: `context/changes/gpx-upload-and-map-context/plan.md`

**Intent**: Ensure downstream implementation records completion evidence against all automated/manual criteria.

**Contract**: Preserve this plan structure and update `## Progress` step states only through implementation workflow.

### Success Criteria:

#### Automated Verification:

- Repository lint remains green after final S-02 integration: `npm run lint`.
- Production build remains green after final S-02 integration: `npm run build`.

#### Manual Verification:

- End-to-end flow passes: sign in -> dashboard upload -> preview map render -> re-upload replacement.
- Error UX remains friendly and deterministic for invalid type, oversize file, malformed GPX, and unauthorized upload attempts.
- Existing auth/profile flows show no regressions after S-02 integration.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Testing Strategy

### Unit Tests:

- Validate GPX parser acceptance/rejection paths (valid tracks, empty tracks, malformed XML, unsupported shape).
- Validate route error mapping from parser/service failures to user-facing messages.
- Validate route snapshot row-to-domain mapping and latest-route replacement semantics.

### Integration Tests:

- Upload endpoint accepts valid GPX from authenticated user and persists latest snapshot.
- Upload endpoint rejects unauthenticated access and invalid file constraints consistently.
- Dashboard route context loads persisted snapshot and displays mini-map preview state.

### Manual Testing Steps:

1. Sign in with a completed profile and open dashboard.
2. Upload a valid GPX file and verify success message and map preview visibility.
3. Upload a second valid GPX and verify previous preview is replaced by latest route.
4. Upload malformed GPX and verify previous valid preview remains visible.
5. Upload unsupported/oversize file and verify friendly error messaging.
6. Sign out and confirm protected upload path redirects to sign-in.

## Performance Considerations

Full-geometry snapshot persistence is accepted in S-02 to keep output fidelity for preview and downstream calculations. Performance control relies on hard upload limits and single-snapshot-per-user semantics; aggressive optimization (geometry simplification, background processing) is intentionally deferred unless manual verification shows real degradation.

## Migration Notes

Route snapshot schema is additive and independent from existing profile schema. In rollback scenarios, disable dashboard upload wiring before dropping route snapshot usage so protected pages remain accessible without route context.

## References

- Roadmap slice: `context/foundation/roadmap.md` (`S-02`, `Change ID: gpx-upload-and-map-context`)
- Product requirements: `context/foundation/prd.md` (FR-003, FR-007, US-01)
- Prior archived slice: `context/archive/2026-09-03-account-and-sport-profile/plan.md`
- Existing API redirect/error pattern: `src/pages/api/profile.ts:51-94`
- Existing middleware gate policy: `src/middleware.ts:5-40`
- Existing dashboard baseline: `src/pages/dashboard.astro:1-29`
- Existing route ownership policy model: `supabase/migrations/20260904110000_create_profiles.sql`
- Progress contract: `.github/skills/10x-plan/references/progress-format.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Define route snapshot persistence contract

#### Automated

- [x] 1.1 Migration file exists in `supabase/migrations` and follows project naming convention.
- [x] 1.2 Astro type sync succeeds with new route-domain types: `npx astro sync`.
- [x] 1.3 Lint passes after adding route type contracts: `npm run lint`.

#### Manual

- [x] 1.4 Route snapshot migration enforces per-user ownership and RLS boundaries.
- [x] 1.5 Snapshot contract supports preview map and downstream S-03 feature extraction inputs.

### Phase 2: Implement GPX parsing and route snapshot service

#### Automated

- [ ] 2.1 Astro sync succeeds with new route parser/service modules: `npx astro sync`.
- [ ] 2.2 Lint passes for parser and service layer code: `npm run lint`.
- [ ] 2.3 Production build succeeds after route service integration: `npm run build`.

#### Manual

- [ ] 2.4 Valid GPX input produces normalized points and metadata expected by snapshot service.
- [ ] 2.5 Malformed GPX and empty-track GPX are rejected with deterministic error categories.
- [ ] 2.6 Parser/service failure paths preserve the previously stored valid snapshot.

### Phase 3: Deliver upload endpoint and dashboard mini-map flow

#### Automated

- [ ] 3.1 Astro sync succeeds with new route API and dashboard component wiring: `npx astro sync`.
- [ ] 3.2 Lint passes for dashboard and new route components: `npm run lint`.
- [ ] 3.3 Production build succeeds with upload and mini-map integration: `npm run build`.

#### Manual

- [ ] 3.4 Completed-profile user can upload a valid GPX and see route preview on dashboard.
- [ ] 3.5 Re-upload replaces prior snapshot without duplicate visible state.
- [ ] 3.6 Invalid type/oversize/malformed GPX shows friendly errors and keeps last valid snapshot.
- [ ] 3.7 Unauthenticated upload attempts are denied or redirected consistently.

### Phase 4: Final verification matrix and documentation handoff

#### Automated

- [ ] 4.1 Repository lint remains green after final S-02 integration: `npm run lint`.
- [ ] 4.2 Production build remains green after final S-02 integration: `npm run build`.

#### Manual

- [ ] 4.3 End-to-end flow passes: sign in -> dashboard upload -> preview map -> re-upload replacement.
- [ ] 4.4 Error UX is deterministic for invalid type, oversize, malformed GPX, and unauthorized upload.
- [ ] 4.5 Existing auth/profile flows show no regressions after S-02 integration.
