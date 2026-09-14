<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Enriched estimation signals

- **Plan**: context/changes/enriched-estimation-signals/plan.md
- **Scope**: Phases 1-3 of 3
- **Date**: 2026-09-14
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 4 warnings, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | WARNING |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

## Findings

### F1 — History reset migration is environment-agnostic and destructive

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20260914124000_reset_estimation_and_route_history_for_s05.sql:1
- **Detail**: The migration runs unconditional `truncate ... restart identity` on both history tables. This was planned and accepted for S-05, but as a baseline migration it will also execute wherever migrations are applied, including shared environments if rollout safeguards are not enforced.
- **Fix A ⭐ Recommended**: Move the reset into a one-off operational script and keep schema migrations additive only.
  - Strength: Preserves the product decision while reducing accidental data-loss risk in future rollout paths.
  - Tradeoff: Requires a documented deployment runbook step.
  - Confidence: HIGH — operational one-offs are a safer pattern for destructive data actions.
  - Blind spot: I did not verify your external deployment automation guards.
- **Fix B**: Keep migration as-is, but add explicit environment guardrails and backup prerequisite docs.
  - Strength: Minimal code churn; keeps current migration history intact.
  - Tradeoff: Safety depends on process discipline rather than technical isolation.
  - Confidence: MEDIUM — robust only if deployment path consistently enforces those controls.
  - Blind spot: No proof in-repo that all migration runners enforce environment gating.
- **Decision**: FIXED (Fix A)

### F2 — `datetime-local` is converted server-side without timezone context

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/routes/upload.ts:35
- **Detail**: `plannedRunAt` from `datetime-local` is parsed with `new Date(raw).toISOString()`. Because `datetime-local` carries no timezone, final UTC value can differ by runtime/user timezone assumptions, which may bias weather-hour selection.
- **Fix**: Send timezone-aware datetime from the client (UTC or datetime + offset) and parse deterministically on the API boundary.
  - Strength: Removes environment-dependent time interpretation.
  - Tradeoff: Small API/form contract change.
  - Confidence: HIGH — this is the standard approach for `datetime-local` inputs.
  - Blind spot: No significant blind spot.
- **Decision**: FIXED

### F3 — Database ITRA constraint is looser than application contract

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20260914121000_add_itra_index_to_profiles.sql:9
- **Detail**: App logic enforces ITRA range `1..1000`, but DB constraint only checks `> 0`. Non-API writes could persist out-of-range values.
- **Fix**: Tighten DB check to `itra_index IS NULL OR (itra_index BETWEEN 1 AND 1000)`.
- **Decision**: FIXED

### F4 — Weather provider boundary differs from planned contract boundary

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/lib/estimation/weather-provider.ts:57
- **Detail**: Plan placed the `available/provider_error/not_applicable` contract at adapter level; implementation returns raw weather payload from adapter and materializes status in orchestration. Behavior is correct, but boundary differs from the written plan.
- **Fix**: Either update plan to document orchestration-owned status mapping, or refactor adapter to return the full status contract directly.
- **Decision**: FIXED

### F5 — Phase 1 migration command is not reproducible in current local environment

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: N/A
- **Detail**: During full review verification, `npx supabase migration up` fails locally (`ECONNREFUSED 127.0.0.1:54322`) because local Supabase is not running. Other automated checks pass and remote migration parity was already restored earlier, but the exact phase command is currently not reproducible on this machine.
- **Fix**: Document the prerequisite (`supabase start` / Docker up) in change notes or runbook before using `migration up` as a strict local gate.
- **Decision**: FIXED
