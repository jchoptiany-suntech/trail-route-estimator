# Account Access and Sport Profile Implementation Plan

## Overview

Implement the first fully usable identity and profile foundation for the product by hardening existing email/password auth flows and adding a minimal sport profile lifecycle for authenticated users. This plan closes FR-001 and FR-002 while preserving current session behavior and preparing downstream slices for GPX upload and estimation.

## Current State Analysis

Email/password authentication already exists with Supabase SSR cookies, auth pages, and auth API endpoints. The app currently protects `/dashboard` for authenticated users only, but there is no sport profile data model, no profile UI/API, and no profile-completeness gate.

Server-side validation is currently weak in auth routes (`form.get(...) as string` casts), and provider errors are passed through directly to users. This creates inconsistency with current client validation and unnecessary UX risk.

## Desired End State

Authenticated users can register/sign in and create or update a minimal sport profile that supports draft and complete states. Users with incomplete profiles are hard-gated to the profile flow until completion, after which they can access the dashboard and proceed toward route analysis features.

Verification is complete when auth + profile flows pass lint/build checks and a manual scenario matrix confirms registration, login, profile draft handling, completion gating, and mapped user-friendly errors.

### Key Discoveries:

- Supabase SSR session is centralized and should remain the source of truth (`src/lib/supabase.ts:5-24`, `src/middleware.ts:7-16`).
- Route protection is already middleware-driven and should be extended there, not duplicated in pages (`src/middleware.ts:4,18-22`).
- Auth forms already follow reusable client-side validation patterns (`src/components/auth/SignUpForm.tsx:19-52`, `src/components/auth/FormField.tsx:24-62`).
- No profile persistence exists yet, and migrations are currently absent (`supabase/config.toml` with empty `schema_paths`).
- CI validates with `npx astro sync`, `npm run lint`, and `npm run build` (`.github/workflows/ci.yml:18-24`).

## What We're NOT Doing

- Implementing GPX upload, map rendering, route analysis, or time estimation logic (S-02/S-03 scope).
- Introducing social login, passwordless auth, MFA, or role-based authorization.
- Building advanced profile analytics/history/versioning beyond one active profile per user.
- Adding a full automated test framework in this change.
- Solving large-scale profile calibration concerns noted for future scale.

## Implementation Approach

Use an additive, server-first approach in four phases. First stabilize auth contracts and server validation. Then introduce one-to-one profile persistence with owner-only access control and explicit draft/complete semantics. Next enforce hard profile-completeness gating in middleware and integrate the new profile UX into authenticated navigation surfaces. Finally, run a strict verification pass and document operational/manual checks.

## Critical Implementation Details

### Timing & lifecycle

Apply the profile-completeness gate only after profile create/update endpoints and UI are in place; otherwise authenticated users can be redirected into a dead end. Gate exceptions must include auth routes and the profile route itself to avoid redirect loops.

### State sequencing

Treat profile completeness as explicit persisted state (`draft` vs `complete`) rather than inferred ad hoc in each route. Middleware should consume this state as a single policy decision point for protected-route access.

## Phase 1: Harden auth contracts and error mapping

### Overview

Preserve existing auth flow behavior while adding robust server-side validation and user-friendly error mapping for sign-in/sign-up.

### Changes Required:

#### 1. Auth validation and mapping helpers

**File**: `src/lib/auth/validation.ts` (new)

**Intent**: Centralize auth input validation so server routes enforce the same required field rules as current client forms.

**Contract**: Export typed validators for sign-in and sign-up payloads returning normalized validation results (field errors + form error code).

**File**: `src/lib/auth/error-mapping.ts` (new)

**Intent**: Prevent raw provider error leakage and standardize user-facing auth/profile error messages.

**Contract**: Map known Supabase/auth error signatures to stable app-level error codes/messages; provide fallback for unknown failures.

#### 2. Auth API routes

**File**: `src/pages/api/auth/signin.ts`

**Intent**: Replace direct form casts and raw error pass-through with validated inputs and mapped friendly error responses.

**Contract**: Keep endpoint method/path and redirect flow unchanged while enforcing server validation and mapped error serialization.

**File**: `src/pages/api/auth/signup.ts`

**Intent**: Align signup server behavior with client expectations (including confirmation rules) and standardized error mapping.

**Contract**: Validate `email`, `password`, and `confirmPassword` server-side; continue redirecting success to `/auth/confirm-email`.

#### 3. Auth page error handling

**File**: `src/pages/auth/signin.astro`

**Intent**: Ensure mapped auth errors render consistently in the existing form error surface.

**Contract**: Keep `serverError` flow compatible with `SignInForm` while consuming mapped messages/codes.

**File**: `src/pages/auth/signup.astro`

**Intent**: Mirror signin behavior for mapped and normalized error output.

**Contract**: Preserve current page contract and `SignUpForm` props while handling mapped message values.

### Success Criteria:

#### Automated Verification:

- Astro sync completes without schema/runtime errors: `npx astro sync`
- Lint passes after auth-contract changes: `npm run lint`
- Production build succeeds with auth changes: `npm run build`

#### Manual Verification:

- Invalid sign-in/sign-up inputs show clear mapped errors (no raw provider text)
- Signup confirm-password mismatch is rejected on the server path as well
- Existing happy-path sign-in/sign-up behavior remains unchanged

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Add profile persistence and profile API contract

### Overview

Introduce one-to-one sport profile persistence with draft/complete states and owner-only data access.

### Changes Required:

#### 1. Supabase schema and policies

**File**: `supabase/migrations/<timestamp>_create_profiles.sql` (new)

**Intent**: Add the minimal storage contract for sport profile data linked to authenticated users.

**Contract**: Create a one-row-per-user profile table keyed to auth user ID, with fields needed for minimal profile, draft/complete status semantics, timestamps, and owner-only RLS policies.

**File**: `supabase/seed.sql` (new or update if present)

**Intent**: Remove local environment fragility caused by configured seed path without corresponding file.

**Contract**: Provide a valid minimal seed artifact aligned with current local Supabase config expectations.

#### 2. Profile service and typing

**File**: `src/lib/profile/service.ts` (new)

**Intent**: Isolate profile read/upsert logic and completeness evaluation from route handlers.

**Contract**: Expose typed operations to fetch current-user profile, save draft profile, and mark profile complete based on required fields.

**File**: `src/env.d.ts`

**Intent**: Extend request-local typing for middleware-driven profile policy checks.

**Contract**: Add profile-related locals (e.g., completeness flag/profile payload) without breaking existing `user` typing contract.

#### 3. Profile API endpoint

**File**: `src/pages/api/profile.ts` (new)

**Intent**: Provide authenticated create/update entrypoint for minimal profile with normalized errors.

**Contract**: APIRoute handler validates profile payload, enforces current-user ownership, supports draft/complete transitions, and redirects with mapped errors/success state.

### Success Criteria:

#### Automated Verification:

- Migration artifact exists in `supabase/migrations` and is syntactically loadable by tooling conventions
- Astro sync still succeeds with new profile route/types: `npx astro sync`
- Lint passes for new profile service/API code: `npm run lint`
- Production build succeeds after profile persistence integration: `npm run build`

#### Manual Verification:

- Authenticated user can save incomplete profile draft and return later
- Authenticated user can complete required profile fields and persist completion state
- Unauthenticated requests to profile API are denied/redirected consistently

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 3: Enforce profile gate and integrate profile UX

### Overview

Wire hard profile-completeness gating into middleware and expose a clear profile editing flow in the UI.

### Changes Required:

#### 1. Middleware policy updates

**File**: `src/middleware.ts`

**Intent**: Enforce the agreed hard gate: authenticated users without complete profiles must finish profile before proceeding in protected app surfaces.

**Contract**: Extend protected-route logic to include profile-completeness checks with explicit allowlist exceptions (`/profile`, auth endpoints, and non-protected public routes) to prevent redirect loops.

#### 2. Profile page and form components

**File**: `src/pages/profile.astro` (new)

**Intent**: Add dedicated profile screen for creating and editing the minimal sport profile.

**Contract**: Route is authenticated, consumes server-provided profile state, and mounts interactive form island for save/update actions.

**File**: `src/components/profile/ProfileForm.tsx` (new)

**Intent**: Reuse established auth-form interaction patterns for profile editing with draft/complete actions.

**Contract**: Controlled form with client validation, inline errors, mapped server error rendering, and explicit actions for draft save vs complete save.

#### 3. Authenticated navigation surfaces

**File**: `src/pages/dashboard.astro`

**Intent**: Ensure dashboard behavior assumes complete profile and no longer acts as profile placeholder.

**Contract**: Keep authenticated dashboard contract intact while removing assumptions that profile is optional.

**File**: `src/components/Topbar.astro`

**Intent**: Add clear navigation to profile management for authenticated users.

**Contract**: Preserve existing sign-in/sign-out links and add profile entry without breaking current responsive/layout conventions.

### Success Criteria:

#### Automated Verification:

- Astro sync succeeds with new route + middleware type usage: `npx astro sync`
- Lint passes for profile UI and middleware updates: `npm run lint`
- Production build succeeds with gating and new page integration: `npm run build`

#### Manual Verification:

- Authenticated user with incomplete profile is redirected to `/profile`
- Completing required profile fields unlocks access to `/dashboard`
- Gate policy does not break sign-out, sign-in, or public-page navigation

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 4: Verification matrix and documentation handoff

### Overview

Lock confidence before implementation closure with an explicit manual matrix and updated project docs for the new auth/profile contract.

### Changes Required:

#### 1. Documentation updates

**File**: `README.md`

**Intent**: Document the new profile-required flow, minimal profile scope, and developer verification process.

**Contract**: Add concise sections for profile gate behavior, required env/runtime assumptions, and local validation workflow.

#### 2. Manual verification artifact

**File**: `context/changes/account-and-sport-profile/plan.md` (Progress execution updates happen downstream)

**Intent**: Ensure implementers execute and record the agreed manual matrix for auth + profile edge cases.

**Contract**: Preserve phase criteria and progress checklist structure while downstream execution fills status and SHAs.

### Success Criteria:

#### Automated Verification:

- Lint remains green after docs-adjacent code changes: `npm run lint`
- Build remains green after full S-01 integration: `npm run build`

#### Manual Verification:

- End-to-end matrix passes for register/login/profile draft/profile complete/gate redirect scenarios
- Mapped errors are consistent across signin/signup/profile flows and avoid raw provider leakage
- No regressions observed in topbar auth state transitions and sign-out flow

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Testing Strategy

### Unit Tests:

- Validate auth input normalization for signin/signup payloads and confirm-password enforcement.
- Validate profile completeness evaluator for draft vs complete transitions.
- Validate error-mapping helper behavior for known auth/profile failure signatures.

### Integration Tests:

- Sign-up then sign-in flow preserves session and redirects correctly.
- Authenticated profile create/update persists and can be reloaded.
- Middleware gate enforces profile completion before dashboard access.

### Manual Testing Steps:

1. Register a new account and verify successful sign-up path + confirmation step behavior.
2. Sign in with valid credentials, then verify redirect to `/profile` when profile is incomplete.
3. Save profile as draft, refresh, and verify data persistence while gate remains active.
4. Complete required profile fields and verify dashboard access unlocks.
5. Trigger invalid credentials, malformed input, and missing fields to confirm friendly mapped errors.
6. Verify sign-out returns user to public state and protected routes redirect to sign-in.

## Performance Considerations

Target snappy MVP interactions for auth/profile operations under normal conditions without introducing advanced caching or instrumentation in this change. Keep profile reads/writes single-user scoped and lightweight to avoid unnecessary latency from over-engineered data paths.

## Migration Notes

Profile schema rollout is additive and should not alter existing auth session behavior. Apply migration before enabling middleware completeness gating in deployed environments; rollback safety relies on disabling the gate first if profile persistence is unavailable.

## References

- Roadmap slice: `context/foundation/roadmap.md` (`S-01`, `Change ID: account-and-sport-profile`)
- Source requirements: `context/foundation/prd.md` (FR-001, FR-002, US-01)
- Existing auth session contract: `src/lib/supabase.ts:5-24`
- Existing route guard baseline: `src/middleware.ts:4-22`
- Existing auth UI validation pattern: `src/components/auth/SignUpForm.tsx:19-52`
- Existing auth API baseline: `src/pages/api/auth/signin.ts:4-18`, `src/pages/api/auth/signup.ts:4-18`
- Progress contract: `.github/skills/10x-plan/references/progress-format.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Harden auth contracts and error mapping

#### Automated

- [x] 1.1 Astro sync completes without schema/runtime errors: `npx astro sync` — 4cee4b3
- [x] 1.2 Lint passes after auth-contract changes: `npm run lint` — 4cee4b3
- [x] 1.3 Production build succeeds with auth changes: `npm run build` — 4cee4b3

#### Manual

- [x] 1.4 Invalid sign-in/sign-up inputs show clear mapped errors (no raw provider text) — 4cee4b3
- [x] 1.5 Signup confirm-password mismatch is rejected on the server path as well — 4cee4b3
- [x] 1.6 Existing happy-path sign-in/sign-up behavior remains unchanged — 4cee4b3

### Phase 2: Add profile persistence and profile API contract

#### Automated

- [x] 2.1 Migration artifact exists in `supabase/migrations` and is syntactically loadable by tooling conventions — 1fa638c
- [x] 2.2 Astro sync still succeeds with new profile route/types: `npx astro sync` — 1fa638c
- [x] 2.3 Lint passes for new profile service/API code: `npm run lint` — 1fa638c
- [x] 2.4 Production build succeeds after profile persistence integration: `npm run build` — 1fa638c

#### Manual

- [x] 2.5 Authenticated user can save incomplete profile draft and return later — 1fa638c
- [x] 2.6 Authenticated user can complete required profile fields and persist completion state — 1fa638c
- [x] 2.7 Unauthenticated requests to profile API are denied/redirected consistently — 1fa638c

### Phase 3: Enforce profile gate and integrate profile UX

#### Automated

- [x] 3.1 Astro sync succeeds with new route + middleware type usage: `npx astro sync`
- [x] 3.2 Lint passes for profile UI and middleware updates: `npm run lint`
- [x] 3.3 Production build succeeds with gating and new page integration: `npm run build`

#### Manual

- [x] 3.4 Authenticated user with incomplete profile is redirected to `/profile`
- [x] 3.5 Completing required profile fields unlocks access to `/dashboard`
- [x] 3.6 Gate policy does not break sign-out, sign-in, or public-page navigation

### Phase 4: Verification matrix and documentation handoff

#### Automated

- [ ] 4.1 Lint remains green after docs-adjacent code changes: `npm run lint`
- [ ] 4.2 Build remains green after full S-01 integration: `npm run build`

#### Manual

- [ ] 4.3 End-to-end matrix passes for register/login/profile draft/profile complete/gate redirect scenarios
- [ ] 4.4 Mapped errors are consistent across signin/signup/profile flows and avoid raw provider leakage
- [ ] 4.5 No regressions observed in topbar auth state transitions and sign-out flow
