<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: GPX Upload and Map Context Implementation Plan

- **Plan**: `context/changes/gpx-upload-and-map-context/plan.md`
- **Scope**: Full plan (Phases 1-4)
- **Date**: 2026-09-13
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 2 warnings, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Findings

### F1 — GPX parser rejects valid XML attribute variants

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `src/lib/route/gpx.ts:160`
- **Detail**: GPX parsing relies on a regex that assumes specific XML attribute formatting (`lat` before `lon`, double-quoted values). Valid GPX XML can use different attribute order or quoting and still be standards-compliant, so accepted uploads may fail.
- **Fix**: Replace regex-based trackpoint extraction with XML parsing that reads attributes order-independently.
  - Strength: Removes format-order brittleness and aligns with GPX/XML semantics.
  - Tradeoff: Slightly more implementation complexity in parser logic.
  - Confidence: HIGH — mismatch is direct in current regex contract.
  - Blind spot: Not benchmarked yet for parser performance under large files.
- **Decision**: SKIPPED

### F2 — Route upload form contract drifted from planned controlled form

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `src/components/routes/RouteUploadForm.tsx:10`
- **Detail**: Plan phase 3 contract called for a controlled file-input form pattern, but implementation uses a plain uncontrolled form. Behavior works, but the planned interaction contract was not followed.
- **Fix**: Either update the plan contract to explicitly allow an uncontrolled multipart form, or align component to a controlled form pattern.
- **Decision**: SKIPPED

### F3 — Upload endpoint auth-error handling differs from established API pattern

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `src/pages/api/routes/upload.ts:26`
- **Detail**: Existing APIs (for example `src/pages/api/profile.ts`) branch on both `authError` and missing `user`, while upload route checks only `user`. Current behavior still redirects unauthorized requests correctly, but error-handling semantics differ.
- **Fix**: Mirror `authError || !user` handling used in other API routes.
- **Decision**: FIXED
