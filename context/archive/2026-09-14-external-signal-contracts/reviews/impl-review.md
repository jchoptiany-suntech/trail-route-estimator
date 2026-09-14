<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: External Signal Contracts Implementation Plan

- **Plan**: `context/changes/external-signal-contracts/plan.md`
- **Scope**: Phases 1-3 of 3
- **Date**: 2026-09-14
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 4 warnings, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Findings

### F1 — RPC failure is downgraded to generic history warning

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Safety & Quality
- **Location**: `src/lib/estimation/orchestration.ts:131-151`
- **Detail**: Any failure of `persist_route_estimation_bundle` is converted to latest-only fallback and surfaced as history warning, even when root cause may be broader (permissions/schema/network). This can mask persistent history-write failure.
- **Fix A ⭐ Recommended**: Classify fallback by DB error code and keep hard-fail for non-history failures.
  - Strength: Preserves graceful degradation only for expected partial failures.
  - Tradeoff: Requires explicit error mapping and stricter branching.
  - Confidence: HIGH — current code path treats all RPC failures the same.
  - Blind spot: No provider of structured DB error taxonomy yet in domain types.
- **Fix B**: Keep current fallback but emit explicit telemetry/event with DB error code.
  - Strength: Minimal behavior change, better diagnosability.
  - Tradeoff: User-facing behavior still hides full failure class.
  - Confidence: MEDIUM — improves observability but not correctness of fallback policy.
  - Blind spot: Telemetry stack is currently minimal in repo.
- **Decision**: FIXED via Fix A

### F2 — Provider-error fallback path from plan is not implemented

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: `src/lib/estimation/orchestration.ts:55-77`
- **Detail**: Plan phase 2 requires explicit path for provider errors (`provider_error` -> neutral + warning). Current resolver is static (`itra: missing`, `weather: not_applicable`) and does not represent provider failure state.
- **Fix**: Implement runtime branch that sets `status: provider_error` when provider call fails (even if provider integration remains mocked/off by default).
  - Strength: Aligns runtime contract with planned external-signal state machine.
  - Tradeoff: Adds logic before full provider integration in S-05.
  - Confidence: HIGH — state enum already includes `provider_error`.
  - Blind spot: No current source of provider error because fetch adapter is not yet introduced.
- **Decision**: FIXED

### F3 — Planned service/RPC compatibility touch was skipped in implementation commits

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `src/lib/estimation/service.ts`, `supabase/migrations/20260913233000_persist_route_estimation_bundle_rpc.sql`
- **Detail**: Plan lists direct verification/update in service/RPC compatibility area, but phase commits did not modify these files. Compatibility was indirectly validated by tests, not by explicit planned edits.
- **Fix**: Add a short plan addendum note in phase 2 section that compatibility was preserved without file-level edits and validated by tests.
- **Decision**: FIXED

### F4 — Unplanned migration edit introduced outside reviewed phase scope

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Scope Discipline
- **Location**: `supabase/migrations/20260914001000_backfill_route_hash_shape_v2.sql:17`
- **Detail**: Migration was changed from `digest(...)` to `extensions.digest(...)` during runtime troubleshooting after phase commits. This was necessary operationally but not captured in plan scope and remains outside change commits.
- **Fix A ⭐ Recommended**: Capture this as explicit follow-up under the same change and commit migration fix with short rationale.
  - Strength: Restores traceability between runtime remediation and repository history.
  - Tradeoff: Adds one extra maintenance commit.
  - Confidence: HIGH — file is currently dirty and related to observed warning root cause.
  - Blind spot: Requires deciding whether to include in this change or separate maintenance change.
- **Fix B**: Move migration correction to a separate maintenance change (`/10x-new`) and reference it.
  - Strength: Keeps F-01 scope strict.
  - Tradeoff: Splits root-cause fix from implementation timeline.
  - Confidence: MEDIUM — organizationally clean but adds coordination overhead.
  - Blind spot: May delay archival readiness of this change.
- **Decision**: FIXED via Fix A

### F5 — Profile warning text lowercases acronyms

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `src/lib/estimation/recompute-feedback.ts:17-21`
- **Detail**: `resolveProfileRecomputeWarning` lowercases the warning sentence, turning `ITRA` into `itra`, while upload warning preserves original casing.
- **Fix**: Remove `.toLowerCase()` for warning-forwarding branch to keep consistent wording and acronym casing.
- **Decision**: FIXED

## Success Criteria Verification

- `node --test tests/estimation-engine.test.js` — PASS
- `node --test tests/api-recompute-feedback.test.js` — PASS
- `node --test tests/estimation-history-contracts.test.js` — PASS
- `npm run build` — PASS
- `npm run lint` — PASS
- Manual progress rows are marked `[x]` for all three phases in `## Progress`.
