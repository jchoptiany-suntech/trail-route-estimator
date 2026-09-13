<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Personalized Estimation Result Implementation Plan

- **Plan**: `context/changes/personalized-estimation-result/plan.md`
- **Scope**: Phases 1-4 of 4
- **Date**: 2026-09-13
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 3 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | WARNING |

## Findings

### F1 — Progress row format is malformed for phase 4 item 4.1

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `context/changes/personalized-estimation-result/plan.md:337`
- **Detail**: The row is stored as `- - [x] 4.1 ...` instead of canonical `- [x] 4.1 ...`. This breaks the progress-format contract and can confuse parsers used by workflow skills.
- **Fix**: Remove the extra leading `- ` so the checkbox line matches the canonical `- [x]` pattern.
- **Decision**: FIXED

### F2 — Dashboard warning state misses read-time estimation failures

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: `src/pages/dashboard.astro:16-19`
- **Detail**: The plan requires deterministic estimation fallback states including estimation error visibility while route context is present. Current rendering uses `warning` query params, but read-time `estimationResult.error` is collapsed into `null` and not surfaced.
- **Fix A ⭐ Recommended**: Surface estimation read errors in the dashboard with the same warning banner pattern used for recompute warnings.
  - Strength: Aligns directly with phase 4 contract and keeps degradation explicit for users.
  - Tradeoff: Adds one more warning path in SSR rendering logic.
  - Confidence: HIGH — existing page already has warning UI and only needs one additional source.
  - Blind spot: No user telemetry in this slice to measure banner frequency.
- **Fix B**: Keep UI unchanged and amend plan/review notes to treat read-time failures as "no estimation yet".
  - Strength: Avoids extra UI branching and preserves current minimal behavior.
  - Tradeoff: Weakens explicit-error requirement from the approved plan.
  - Confidence: MEDIUM — technically consistent with current code, but diverges from plan intent.
  - Blind spot: Whether stakeholders accept this interpretation change.
- **Decision**: FIXED (Fix A)

### F3 — Phase 2/3 automated checks claim tests passed, but no tests executed

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Success Criteria
- **Location**: `context/changes/personalized-estimation-result/plan.md:313,329` and `node --test` output
- **Detail**: The review run confirms `node --test` exits successfully with `# tests 0`. Progress rows 2.1 and 3.3 are marked complete as if deterministic/integration checks ran, but there is no executable test evidence behind those steps.
- **Fix A ⭐ Recommended**: Add focused tests for estimation engine and upload/profile integration paths, then keep these rows as true automated evidence.
  - Strength: Restores integrity of the success criteria and catches regressions in core estimation logic.
  - Tradeoff: Requires additional test authoring effort now.
  - Confidence: HIGH — this is the exact gap indicated by the command output.
  - Blind spot: Final test harness scope (unit-only vs. API integration) still needs explicit boundary.
- **Fix B**: Reclassify 2.1 and 3.3 as manual-only evidence in the plan/review artifacts.
  - Strength: Minimal code churn; documents actual verification reality.
  - Tradeoff: Loses automated regression protection for critical estimation behavior.
  - Confidence: MEDIUM — process-consistent, but lowers quality bar.
  - Blind spot: Acceptability for future archive/quality gates.
- **Decision**: FIXED (Fix A)

### F4 — React class composition in new card bypasses `cn()` convention

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `src/components/routes/RouteEstimationCard.tsx:58`
- **Detail**: The new component builds class names through template interpolation, while repository guidance prefers `cn()` from `@/lib/utils` for class composition in React/shadcn-style components.
- **Fix**: Replace template interpolation with `cn("base classes", difficultyBadgeClass(...))`.
- **Decision**: FIXED

### F5 — Dashboard fetches snapshot and estimation sequentially

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `src/pages/dashboard.astro:16-17`
- **Detail**: Snapshot and estimation reads are independent, but currently awaited sequentially. This can add avoidable latency to SSR response time.
- **Fix**: Fetch both via `Promise.all` and keep existing fallback behavior.
- **Decision**: FIXED
