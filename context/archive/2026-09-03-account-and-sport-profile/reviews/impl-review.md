<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Account Access and Sport Profile Implementation Plan

- **Plan**: `context/changes/account-and-sport-profile/plan.md`
- **Scope**: Full plan (Phases 1-4)
- **Date**: 2026-09-13
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 1 warning, 0 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

## Findings

### F1 — Profile status downgrade race between complete and draft writes

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `src/pages/api/profile.ts`, `supabase/migrations/20260904110000_create_profiles.sql`
- **Detail**: The API blocks `complete -> draft` by reading current state first and then issuing a separate `upsert`. This is non-atomic. Under concurrent requests, a draft write can still land after a complete write because the database currently has no guard that rejects status regression.
- **Fix A ⭐ Recommended**: Enforce monotonic profile status in the database with a `BEFORE UPDATE` trigger that rejects `OLD.status = 'complete' AND NEW.status = 'draft'`.
  - Strength: Removes race-condition class at the true consistency boundary and protects all callers.
  - Tradeoff: Adds migration complexity and stricter runtime error path that must be handled in API.
  - Confidence: HIGH — DB-level invariant enforcement is the most reliable approach for concurrent writes.
  - Blind spot: Existing data and edge handling for direct SQL maintenance paths were not audited.
- **Fix B**: Replace `upsert` with an atomic RPC/SQL operation that checks and applies state transition in one statement.
  - Strength: Keeps rule encapsulated in one write path with explicit API semantics.
  - Tradeoff: More custom query logic and less straightforward than current service abstraction.
  - Confidence: MEDIUM — sound pattern, but more implementation surface than a single invariant trigger.
  - Blind spot: Would need verification across any future caller that bypasses the RPC.
- **Decision**: FIXED via Fix A
