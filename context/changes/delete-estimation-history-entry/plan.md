# Delete Saved Estimation History Entry Implementation Plan

## Overview

Implement per-record deletion for saved estimation history on the dashboard, triggered by an X button in each card. The flow must preserve ownership guarantees, keep current-route continuity safe, and surface deterministic success/error feedback after redirect.

## Current State Analysis

Saved history is rendered server-side from `route_estimation_history` and displayed as passive cards without any mutation action. The app already uses a stable mutation pattern (`POST` form + server redirect) for recompute/profile/upload actions, and history ownership checks are already encoded in read helpers and route-level auth checks.

## Desired End State

An authenticated user can delete a single non-current-route history record directly from its dashboard card. Deletion uses the existing form-submit/redirect pattern, applies RLS-safe ownership constraints, preserves lineage behavior (`recomputed_from_history_id` can null on ancestor delete), and shows clear success/error feedback.

### Key Discoveries:

- History cards are rendered in `src/components/routes/SavedEstimationHistory.astro`, with each record already carrying `id` in the view model from `src/lib/estimation/history-view.ts`.
- Dashboard currently computes `currentRouteHash` and `recomputeHistoryEntryId` in `src/pages/dashboard.astro`; this is the natural place to drive current-route delete protection in UI and endpoint wiring.
- Ownership-scoped history lookup already exists in `src/lib/estimation/service.ts` (`getRouteEstimationHistoryEntryForUser`) and API auth/redirect conventions are established in `src/pages/api/estimations/history/recompute.ts`.
- RLS is enabled for `route_estimation_history` but only select/insert/update policies exist in `supabase/migrations/20260913224500_create_route_estimation_history.sql`; DELETE policy is missing.
- Lineage foreign key uses `ON DELETE SET NULL` in `supabase/migrations/20260914181000_evolve_route_estimation_history_for_s06.sql`, matching selected behavior for parent deletion.

## What We're NOT Doing

- Soft-delete, recycle bin, or undo flow for history records.
- Bulk/multi-select history deletion.
- Deleting the history record tied to currently uploaded route context.
- Reworking history ordering/versioning semantics.

## Implementation Approach

Follow the existing server-first mutation contract: add a dedicated delete API route, call it from a per-card POST form in the history UI, and enforce ownership plus current-route protection on the server. Keep UX minimal with native confirm and dashboard-level success/error banner feedback. Add one focused integration test for endpoint behavior and one E2E scenario for real user flow.

## Phase 1: Backend deletion contract and safety gates

### Overview

Introduce the persistence and API contract for deleting one history entry safely, including auth ownership checks and the “current route history is protected” rule.

### Changes Required:

#### 1. RLS delete policy for history table

**File**: `supabase/migrations/<timestamp>_allow_delete_own_route_estimation_history.sql`

**Intent**: Add explicit DELETE authorization for authenticated owners so endpoint-level delete can succeed under RLS without widening access.

**Contract**: Create/drop a `route_estimation_history_delete_own` policy with `for delete` and `using (auth.uid() = user_id)`.

#### 2. History service deletion helper

**File**: `src/lib/estimation/service.ts`

**Intent**: Centralize history entry deletion by `(user_id, id)` and return deterministic success/not-found/error result to keep endpoint logic thin and consistent.

**Contract**: Add `deleteRouteEstimationHistoryEntryForUser(supabase, userId, entryId)` using scoped delete criteria and returning `{ deleted: boolean, error: Error | null }` (or equivalent explicit shape used by this module).

#### 3. Delete API route with current-route guard

**File**: `src/pages/api/estimations/history/delete.ts`

**Intent**: Expose a server mutation endpoint that authenticates user, validates input, blocks deletion for current uploaded route hash, and redirects with deterministic feedback.

**Contract**: `POST` route that:
- parses `historyEntryId` from form data using same positive-integer semantics as recompute;
- loads the entry by user ownership;
- derives current uploaded route hash via `getRouteSnapshotForUser` + `buildRouteHash`;
- rejects deletion when entry `routeHash` matches current route hash;
- deletes scoped entry through service helper;
- redirects to `/dashboard`, `/dashboard?success=...`, or `/dashboard?error=...`.

### Success Criteria:

#### Automated Verification:

- New migration applies cleanly in local Supabase flow used by project.
- Endpoint contract tests pass for auth, invalid id, ownership miss, current-route protection, and successful delete.
- Build passes: `npm run build`.

#### Manual Verification:

- Deleting a non-current history entry redirects to dashboard with clear success message.
- Attempt to delete current-route history entry is blocked with clear error message.
- Other dashboard actions (upload/recompute) still work after deletion.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Dashboard history UI action and feedback wiring

### Overview

Add delete affordance to each history card with native confirmation and align dashboard messaging so post-delete outcomes are visible.

### Changes Required:

#### 1. Add per-card delete action in saved history list

**File**: `src/components/routes/SavedEstimationHistory.astro`

**Intent**: Render an accessible top-right X delete action for each card while preserving current layout and metadata.

**Contract**: Each card includes a `POST` form to `/api/estimations/history/delete` with hidden `historyEntryId`, native confirm before submit, and accessible label indicating which record is being deleted.

#### 2. Pass current-route protection context into history component

**File**: `src/pages/dashboard.astro`

**Intent**: Ensure UI can reflect the “cannot delete current-route entry” business rule before submission.

**Contract**: Pass `currentRouteHash` (or derived protected entry id) to `SavedEstimationHistory`; cards matching protected context render delete as disabled/hidden with explanatory hint.

#### 3. Normalize dashboard-level success/error/warning visibility

**File**: `src/pages/dashboard.astro` (and optionally `src/lib/estimation/history-view.ts` if warning helper needs extension)

**Intent**: Keep mutation outcomes deterministic and visible regardless of which dashboard widget initiated action.

**Contract**: `success`, `error`, and `warning` query params render as top-level status banners with precedence rules that do not mask existing estimation/history warnings.

### Success Criteria:

#### Automated Verification:

- UI-level rendering tests/probes pass for delete action visibility and protected-row behavior.
- Lint/build remain green for updated dashboard/history components.

#### Manual Verification:

- Every deletable history card shows X in top-right and requires native confirm.
- Protected current-route record does not allow delete action.
- Feedback banners match result of delete attempt (success or specific error).

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 3: Coverage and regression safety

### Overview

Lock behavior through focused integration coverage for endpoint contract and one E2E user-flow scenario.

### Changes Required:

#### 1. Add delete endpoint integration coverage

**File**: `tests/api-history-delete.integration.test.js`

**Intent**: Validate redirect semantics and safety rules without UI coupling.

**Contract**: Cover unauthenticated access, invalid `historyEntryId`, non-owned or missing entry, blocked current-route delete, and successful non-current delete.

#### 2. Add one E2E dashboard deletion scenario

**File**: `e2e/history-entry-delete.spec.ts`

**Intent**: Prove browser-level behavior from user action through persisted state refresh.

**Contract**: Authenticated dashboard scenario that deletes one non-current history record via X+confirm, then verifies card removal and preserved availability of latest estimation panel.

### Success Criteria:

#### Automated Verification:

- `node --test tests/api-history-delete.integration.test.js` passes.
- `npx playwright test e2e/history-entry-delete.spec.ts --project=msedge` passes.
- `npm run build` passes.

#### Manual Verification:

- Re-run deletion flow on populated dashboard and confirm no regressions in history ordering display.
- Verify recompute action still functions for current route context after deleting another entry.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

## Testing Strategy

### Unit Tests:

- Keep service helper behavior deterministic for delete success/not-found/error mapping.
- Validate protected-record decision helper (if extracted) for current-route blocking.

### Integration Tests:

- Endpoint contract matrix for delete route (auth, validation, ownership, protected route hash, success).
- Redirect query message semantics for both success and failure branches.

### Manual Testing Steps:

1. On dashboard with at least two history records, delete one non-current entry using X and confirm dialog.
2. Verify success banner appears and deleted card no longer renders after redirect.
3. Attempt deleting current-route entry and verify action is blocked with explicit error banner.

## Performance Considerations

Deletion path should remain O(1)-like per entry (`id` + `user_id` scoped delete). No bulk operations or additional listing queries should be added to render path beyond existing history fetch.

## Migration Notes

Additive RLS policy migration only; no data backfill required. Existing FK behavior (`recomputed_from_history_id` `ON DELETE SET NULL`) remains unchanged and is relied on for safe parent deletion.

## References

- Similar mutation flow: `src/pages/api/estimations/history/recompute.ts`
- History rendering: `src/pages/dashboard.astro`, `src/components/routes/SavedEstimationHistory.astro`
- History service and ownership filters: `src/lib/estimation/service.ts`
- RLS and lineage constraints: `supabase/migrations/20260913224500_create_route_estimation_history.sql`, `supabase/migrations/20260914181000_evolve_route_estimation_history_for_s06.sql`
- Existing history test pattern: `tests/api-history-recompute-continuity.integration.test.js`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Backend deletion contract and safety gates

#### Automated

- [ ] 1.1 Add route_estimation_history DELETE RLS policy migration
- [x] 1.1 Add route_estimation_history DELETE RLS policy migration — 6638299
- [x] 1.2 Add history service delete helper scoped by user_id and id — 6638299
- [x] 1.3 Add POST /api/estimations/history/delete endpoint with current-route guard — 6638299
- [x] 1.4 Add endpoint contract test coverage for delete safety matrix — 6638299
- [x] 1.5 Pass build after backend deletion changes — 6638299

#### Manual

- [ ] 1.6 Verify non-current history deletion succeeds with clear feedback
- [ ] 1.7 Verify current-route history deletion is blocked with clear feedback
- [ ] 1.8 Verify upload/recompute still work after deletion

### Phase 2: Dashboard history UI action and feedback wiring

#### Automated

- [x] 2.1 Add per-card X delete form in SavedEstimationHistory.astro — 227e1f4
- [x] 2.2 Pass protected current-route context from dashboard into history UI — 227e1f4
- [x] 2.3 Render deterministic dashboard status banners for delete outcomes — 227e1f4
- [x] 2.4 Pass lint/build for dashboard and history UI updates — 227e1f4

#### Manual

- [x] 2.5 Confirm each deletable card shows top-right X with native confirm — 227e1f4
- [x] 2.6 Confirm protected current-route card cannot be deleted — 227e1f4
- [x] 2.7 Confirm success/error banners match delete outcomes — 227e1f4

### Phase 3: Coverage and regression safety

#### Automated

- [ ] 3.1 Add and pass api-history-delete.integration.test.js
- [ ] 3.2 Add and pass e2e/history-entry-delete.spec.ts on msedge project
- [ ] 3.3 Pass build with deletion feature and new tests in place

#### Manual

- [ ] 3.4 Confirm no dashboard history ordering regressions after deletions
- [ ] 3.5 Confirm recompute remains functional after deleting a non-current entry
