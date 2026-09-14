# Critical-path continuity coverage implementation plan

## Overview

Implement Phase 1 of `context/foundation/test-plan.md` to protect continuity-critical behavior for risks #1 and #2 using integration + contract tests. The plan targets upload and explicit history-recompute flows, while locking continuity semantics so degraded history persistence cannot be read as full success.

## Current State Analysis

The codebase already has continuity-sensitive behavior, but coverage is fragmented. Recompute currently allows `ok: true` with warnings when latest estimation persists but history write fails, and API routes surface these warnings through redirects. Explicit history recompute forces new history versions, while other recompute paths still route through bundle persistence semantics and warning classification.

## Desired End State

Phase 1 ends with deterministic, behavior-focused test coverage that proves:
1. partial history persistence failure never appears as full continuity success to the user;
2. repeated recomputes preserve route+profile+version continuity semantics without unintended duplicate/mismatch behavior.

The result is a reliable baseline for subsequent rollout phases without changing product architecture.

### Key Discoveries:

- Recompute has explicit degraded-success paths that append `history_storage_failure` while still returning `ok: true` (`src/lib/estimation/orchestration.ts:239`, `src/lib/estimation/orchestration.ts:258`, `src/lib/estimation/orchestration.ts:306`).
- Explicit history recompute is version-oriented (`forceNewHistoryVersion: true`) and verifies route-hash continuity before execution (`src/pages/api/estimations/history/recompute.ts:69`, `src/pages/api/estimations/history/recompute.ts:86`).
- History ordering and selection semantics rely on `computed_at DESC, id DESC` and dashboard route-hash selection (`src/lib/estimation/service.ts:121`, `src/lib/estimation/service.ts:122`, `src/pages/dashboard.astro:37`).
- Continuity identity includes planned run datetime in route hash and normalized profile fields in signature (`src/lib/estimation/history-signature.ts:25`, `src/lib/estimation/history-signature.ts:31`).
- Test stack baseline is Node test runner (`node --test`) over focused tests in `tests/*.test.js` (`context/foundation/test-plan.md:78`).

## What We're NOT Doing

- No new user-facing feature scope outside continuity behavior verification.
- No profile-save flow coverage in this phase (explicitly deferred).
- No schema migrations or persistence logic rewrites; this phase hardens confidence via tests.
- No broad e2e/browser test rollout in Phase 1.

## Implementation Approach

Use a behavior-first matrix mapped to two layers:
1. **Integration tests** for end-to-end request/response continuity outcomes in upload and explicit recompute flows.
2. **Contract tests** for continuity identity, dedupe/version semantics, and deterministic ordering/tie behavior.

Assertions will focus on externally meaningful outcomes (redirect warnings, version progression, mismatch rejection, deterministic selection), not implementation internals.

## Critical Implementation Details

### State sequencing

A continuity test must distinguish full success from degraded success when latest writes pass but history writes degrade. This is load-bearing for Risk #1 because `ok: true` is currently reused for both outcomes.

### Debug & observability

The fallback classification for history-only bundle failures uses text matching, so integration scenarios should include both recognized history failures and non-history storage failures to prevent false confidence in warning semantics.

## Phase 1: Continuity scenario matrix and shared test harness

### Overview

Define and codify the behavioral matrix for risks #1/#2, then align shared test probes/fixtures so later tests assert continuity semantics consistently.

### Changes Required:

#### 1. Continuity matrix artifact in plan-linked tests

**File**: `tests/critical-path-continuity.integration.test.js` (new)

**Intent**: Create a canonical scenario set that maps risk statements to executable integration checks.

**Contract**: Cover outcomes for full success, degraded history persistence, recompute mismatch rejection, and repeated recompute continuity for upload + explicit recompute entrypoints.

#### 2. Shared continuity helper alignment

**File**: `tests/api-recompute-feedback.test.js`

**Intent**: Ensure warning contract probes represent current continuity language and do not treat degraded continuity as silent success.

**Contract**: Keep warning semantics explicit for upload/profile helper outputs and align expected wording for history degradation outcomes.

#### 3. Identity/ordering probe baseline

**File**: `tests/estimation-history-contracts.test.js`

**Intent**: Anchor route+profile+version identity behavior and deterministic ordering in a single contract source.

**Contract**: Assert route hash/profile signature semantics and ordering/tie invariants that downstream integration tests depend on.

### Success Criteria:

#### Automated Verification:

- New continuity integration test file executes under Node runner with deterministic outcomes: `node --test tests/critical-path-continuity.integration.test.js`
- Existing feedback contract tests still pass with continuity wording intact: `node --test tests/api-recompute-feedback.test.js`
- Existing history contract tests pass for identity/order baseline: `node --test tests/estimation-history-contracts.test.js`
- Lint remains clean after test additions: `npm run lint -- tests/critical-path-continuity.integration.test.js tests/api-recompute-feedback.test.js tests/estimation-history-contracts.test.js`

#### Manual Verification:

- Scenario matrix traces directly to Risk #1 and Risk #2 language from `context/foundation/test-plan.md`.
- Each scenario states expected user-visible continuity semantics (full success vs degraded success vs hard failure).
- No profile-save coverage appears in this phase scope.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Integration coverage for upload and explicit recompute continuity

### Overview

Add integration tests for the two selected entry flows to prove warning/error/success semantics across continuity-critical boundaries.

### Changes Required:

#### 1. Upload flow continuity integration coverage

**File**: `tests/critical-path-continuity.integration.test.js` (new; upload scenarios)

**Intent**: Verify upload-triggered recompute cannot mask degraded continuity as complete continuity.

**Contract**: Assert redirect outcomes for: successful recompute, skipped refresh warning, degraded history persistence warning, and full recompute storage failure.

#### 2. Explicit history recompute continuity integration coverage

**File**: `tests/api-history-recompute-continuity.integration.test.js` (new)

**Intent**: Verify selected-history recompute enforces route-hash continuity boundary and version-append semantics.

**Contract**: Assert invalid `historyEntryId` handling, route-hash mismatch rejection, warning behavior on degraded writes, and successful recompute redirects.

#### 3. Dashboard continuity selection contract validation

**File**: `tests/dashboard-history-view.test.js`

**Intent**: Ensure deterministic continuity selection remains stable for recompute targeting and warning precedence.

**Contract**: Preserve selection/ordering semantics that choose recompute candidate from current route hash and keep warning precedence deterministic.

### Success Criteria:

#### Automated Verification:

- Upload continuity integration scenarios pass: `node --test tests/critical-path-continuity.integration.test.js`
- Explicit recompute continuity integration scenarios pass: `node --test tests/api-history-recompute-continuity.integration.test.js`
- Dashboard history continuity contracts remain stable: `node --test tests/dashboard-history-view.test.js`
- Build remains green after integration-test additions: `npm run build`

#### Manual Verification:

- Degraded history persistence is always surfaced distinctly from full continuity success.
- Explicit recompute cannot run against mismatched current-route context.
- Integration assertions remain behavioral (redirect/warning semantics), not implementation-mirror checks.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 3: Contract coverage for duplicate and mismatch semantics

### Overview

Harden route+profile+version semantics and repeated recompute continuity rules through contract-level tests.

### Changes Required:

#### 1. Version-append continuity contracts

**File**: `tests/estimation-history-contracts.test.js`

**Intent**: Lock the rule that explicit recompute is append-oriented in history semantics.

**Contract**: Add behavioral checks for repeated recompute continuity threads and version progression expectations for same route/profile identity.

#### 2. Duplicate/mismatch boundary contracts

**File**: `tests/estimation-history-contracts.test.js`, `tests/dashboard-history-view.test.js`

**Intent**: Distinguish acceptable continuity updates from unintended duplicates/mismatches.

**Contract**: Assert route+profile+version identity as the continuity boundary and preserve deterministic tie-handling behavior.

#### 3. Cross-layer continuity regression gate

**File**: `tests/critical-path-continuity.integration.test.js`, `tests/api-history-recompute-continuity.integration.test.js`

**Intent**: Ensure contract and integration layers stay aligned on continuity outcomes.

**Contract**: Every contract-level continuity rule has at least one integration-level scenario proving user-visible outcome parity.

### Success Criteria:

#### Automated Verification:

- Expanded history continuity contracts pass: `node --test tests/estimation-history-contracts.test.js`
- Combined continuity-focused integration suite passes: `node --test tests/critical-path-continuity.integration.test.js tests/api-history-recompute-continuity.integration.test.js`
- Full targeted continuity test pack passes together: `node --test tests/api-recompute-feedback.test.js tests/dashboard-history-view.test.js tests/estimation-history-contracts.test.js tests/critical-path-continuity.integration.test.js tests/api-history-recompute-continuity.integration.test.js`
- Lint remains clean for all touched tests: `npm run lint -- tests/api-recompute-feedback.test.js tests/dashboard-history-view.test.js tests/estimation-history-contracts.test.js tests/critical-path-continuity.integration.test.js tests/api-history-recompute-continuity.integration.test.js`

#### Manual Verification:

- Repeated recompute semantics are understandable as continuity versions, not opaque duplicates.
- Mismatch scenarios are explicit about which identity element changed (route hash, profile signature, or version context).
- The final scenario set is still limited to Phase 1 risk scope (#1, #2).

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

## Testing Strategy

### Unit Tests:

- No new pure-unit layer planned in this phase; behavior is covered via contract tests around deterministic helpers and service contracts.

### Integration Tests:

- Upload recompute continuity outcomes (success, skip, degraded persistence, hard failure).
- Explicit history recompute continuity outcomes (invalid input, mismatch, degraded write, success).
- Cross-check that integration outcomes reflect contract-level semantics.

### Manual Testing Steps:

1. Trigger upload and explicit recompute scenarios that produce both full success and degraded-success outcomes, and verify warning distinction.
2. Re-run explicit recompute for the same route/profile context and confirm versioned continuity behavior is represented consistently.
3. Validate mismatch rejection path for history entry vs current route context.

## Performance Considerations

Phase 1 is test-focused, so runtime behavior should remain unchanged. Test execution cost is controlled by targeted continuity suites under `node --test` rather than full-suite expansion.

## Migration Notes

No schema or data migration is introduced in this phase. This plan only adds/modifies test assets and continuity contracts around existing behavior.

## References

- Risk source and rollout contract: `context/foundation/test-plan.md`
- Orchestration continuity branches: `src/lib/estimation/orchestration.ts:185`, `src/lib/estimation/orchestration.ts:239`, `src/lib/estimation/orchestration.ts:287`
- History ordering/version lookups: `src/lib/estimation/service.ts:121`, `src/lib/estimation/service.ts:122`, `src/lib/estimation/service.ts:169`
- Explicit recompute route-boundary check: `src/pages/api/estimations/history/recompute.ts:69`
- Upload warning redirect behavior: `src/pages/api/routes/upload.ts:22`, `src/pages/api/routes/upload.ts:129`
- Continuity identity construction: `src/lib/estimation/history-signature.ts:25`, `src/lib/estimation/history-signature.ts:31`
- Progress contract: `.github/skills/10x-plan/references/progress-format.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Continuity scenario matrix and shared test harness

#### Automated

- [x] 1.1 New continuity integration test file executes under Node runner with deterministic outcomes: `node --test tests/critical-path-continuity.integration.test.js` — 6ee85c2
- [x] 1.2 Existing feedback contract tests still pass with continuity wording intact: `node --test tests/api-recompute-feedback.test.js` — 6ee85c2
- [x] 1.3 Existing history contract tests pass for identity/order baseline: `node --test tests/estimation-history-contracts.test.js` — 6ee85c2
- [x] 1.4 Lint remains clean after test additions: `npm run lint -- tests/critical-path-continuity.integration.test.js tests/api-recompute-feedback.test.js tests/estimation-history-contracts.test.js` — 6ee85c2

#### Manual

- [ ] 1.5 Scenario matrix traces directly to Risk #1 and Risk #2 language from `context/foundation/test-plan.md`
- [ ] 1.6 Each scenario states expected user-visible continuity semantics (full success vs degraded success vs hard failure)
- [ ] 1.7 No profile-save coverage appears in this phase scope

### Phase 2: Integration coverage for upload and explicit recompute continuity

#### Automated

- [x] 2.1 Upload continuity integration scenarios pass: `node --test tests/critical-path-continuity.integration.test.js`
- [x] 2.2 Explicit recompute continuity integration scenarios pass: `node --test tests/api-history-recompute-continuity.integration.test.js`
- [x] 2.3 Dashboard history continuity contracts remain stable: `node --test tests/dashboard-history-view.test.js`
- [x] 2.4 Build remains green after integration-test additions: `npm run build`

#### Manual

- [ ] 2.5 Degraded history persistence is always surfaced distinctly from full continuity success
- [ ] 2.6 Explicit recompute cannot run against mismatched current-route context
- [ ] 2.7 Integration assertions remain behavioral (redirect/warning semantics), not implementation-mirror checks

### Phase 3: Contract coverage for duplicate and mismatch semantics

#### Automated

- [ ] 3.1 Expanded history continuity contracts pass: `node --test tests/estimation-history-contracts.test.js`
- [ ] 3.2 Combined continuity-focused integration suite passes: `node --test tests/critical-path-continuity.integration.test.js tests/api-history-recompute-continuity.integration.test.js`
- [ ] 3.3 Full targeted continuity test pack passes together: `node --test tests/api-recompute-feedback.test.js tests/dashboard-history-view.test.js tests/estimation-history-contracts.test.js tests/critical-path-continuity.integration.test.js tests/api-history-recompute-continuity.integration.test.js`
- [ ] 3.4 Lint remains clean for all touched tests: `npm run lint -- tests/api-recompute-feedback.test.js tests/dashboard-history-view.test.js tests/estimation-history-contracts.test.js tests/critical-path-continuity.integration.test.js tests/api-history-recompute-continuity.integration.test.js`

#### Manual

- [ ] 3.5 Repeated recompute semantics are understandable as continuity versions, not opaque duplicates
- [ ] 3.6 Mismatch scenarios are explicit about which identity element changed (route hash, profile signature, or version context)
- [ ] 3.7 The final scenario set is still limited to Phase 1 risk scope (#1, #2)
