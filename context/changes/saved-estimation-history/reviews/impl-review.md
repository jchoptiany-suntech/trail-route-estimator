<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Saved Estimation History Implementation Plan

- **Plan**: `context/changes/saved-estimation-history/plan.md`
- **Scope**: Phase 1-4 of 4
- **Date**: 2026-09-13
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 2 warnings, 2 observations

## Verdicts

| Dimension           | Verdict |
| ------------------- | ------- |
| Plan Adherence      | WARNING |
| Scope Discipline    | PASS    |
| Safety & Quality    | WARNING |
| Architecture        | WARNING |
| Pattern Consistency | PASS    |
| Success Criteria    | PASS    |

## Findings

### F1 — Recompute persistence is non-atomic across three writes

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `src/lib/estimation/orchestration.ts:74-133`
- **Detail**: Latest estimation, estimation history, and saved route history are persisted as separate sequential writes. If a later write fails, state can remain partially updated (latest updated, history missing) until a future recompute succeeds.
- **Fix A ⭐ Recommended**: Wrap the three writes in a single transactional DB RPC.
  - Strength: Removes partial-write inconsistency class at source.
  - Tradeoff: Requires SQL function boundary and migration-level contract.
  - Confidence: HIGH — this is the most direct reliability control for multi-write persistence.
  - Blind spot: RPC transaction behavior was not validated against current Supabase project settings.
- **Fix B**: Keep sequential writes and add explicit retry/reconciliation path.
  - Strength: Smaller code churn in app layer.
  - Tradeoff: Inconsistency still occurs transiently; complexity moves to retry logic.
  - Confidence: MEDIUM — depends on robust retry trigger discipline.
  - Blind spot: No durable retry mechanism exists today.
- **Decision**: FIXED — applied Fix A with transactional RPC (`persist_route_estimation_bundle`) in app + migration

### F2 — Route hash identity includes file metadata, not only route shape

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Architecture
- **Location**: `src/lib/estimation/history-signature.ts:16-17`
- **Detail**: `routeHash` canonicalization includes `sourceFileName` and `sourceFileSizeBytes`, so identical route geometry uploaded under a different file name can produce a different route identity and fragment history.
- **Fix A ⭐ Recommended**: Build `routeHash` only from stable route shape/metrics; keep filename as display metadata.
  - Strength: Keeps dedupe identity aligned to actual route content.
  - Tradeoff: Existing rows would need migration/backfill strategy if identity logic changes.
  - Confidence: HIGH — identity-by-content is a better match for saved-route semantics.
  - Blind spot: Backfill strategy for already persisted hashes was not designed in this review.
- **Fix B**: Keep current hash and document filename-sensitive identity as intended behavior.
  - Strength: Zero migration cost.
  - Tradeoff: Same route can split into multiple saved-route entries for cosmetic filename changes.
  - Confidence: MEDIUM — acceptable only if filename sensitivity is explicitly desired.
  - Blind spot: Product intent for filename vs content identity is not explicitly recorded.
- **Decision**: FIXED — route hash moved to content-shape contract (filename and file size removed), with migration backfill to re-hash existing history rows

### F3 — History warning handling is split between page and component

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `src/pages/dashboard.astro:55-57`, `src/components/routes/SavedEstimationHistory.astro:44-74`
- **Detail**: Plan phrase expected history component to handle warning state explicitly; implementation handles warning banner at dashboard page level and only empty state in component.
- **Fix**: Either move warning presentation into `SavedEstimationHistory` or record page-level warning ownership as the accepted contract in the plan.
- **Decision**: ACCEPTED — page-level warning ownership kept as the explicit contract

### F4 — README misses explicit S-04 MVP history scope-limit sentence

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `README.md:176-181`
- **Detail**: README documents dedupe, ordering, and partial-failure behavior but does not explicitly state S-04 scope limits (lightweight history, no advanced library/filtering).
- **Fix**: Add one concise scope-boundary line under “Personalized estimation notes”.
- **Decision**: SKIPPED — explicit MVP scope sentence in README deferred by product choice
