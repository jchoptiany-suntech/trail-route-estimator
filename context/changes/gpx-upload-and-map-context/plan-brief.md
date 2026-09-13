# GPX Upload and Map Context — Plan Brief

> Full plan: `context/changes/gpx-upload-and-map-context/plan.md`

## What & Why

We are implementing S-02 so users can upload a GPX route and immediately view map context for that route. This closes FR-003 and FR-007 and creates the route-input foundation needed before personalized estimation in S-03.

The plan stays intentionally narrow: one latest route snapshot per user, strong server-side validation, and static mini-map preview. This preserves speed while keeping the output contract reusable by later slices.

## Starting Point

The app already has stable auth/profile flow with middleware gating, and dashboard is protected for completed profiles. There is currently no route persistence model, no GPX parser, no upload endpoint, and no map rendering layer.

## Desired End State

A completed-profile user can upload `.gpx` from dashboard, the server validates/parses it, and the app persists the latest route snapshot for that user. Dashboard then renders a static mini-map preview and route context using persisted snapshot data.

If upload fails (invalid file, malformed GPX, or server error), the user receives a friendly error and the previous valid snapshot stays visible. Unauthenticated access remains blocked by existing route policy.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Scope boundary | Minimal vertical S-02 | Fastest way to fully deliver FR-003 and FR-007 without bleeding into S-03/S-04. |
| Persistence model | Route snapshot per user | Reuses owner+RLS pattern from S-01 and provides stable input for next slice. |
| Re-upload semantics | Latest-route upsert | Keeps UX and data model simple while still supporting repeated uploads. |
| Map scope | Static mini-map preview | Delivers map context with controlled complexity and no advanced interaction work. |
| Upload limits | Hard server-side constraints | Protects parser and runtime deterministically and keeps failures explicit. |
| Parser error policy | Keep previous snapshot on failure | Prevents accidental loss of last valid user route context. |
| Geometry strategy | Full geometry in S-02 | Keeps visual and downstream data fidelity; optimization deferred unless needed. |
| Priority cutline | Vertical slice done over polish | Ensures S-02 closes roadmap intent before UX enhancements. |

## Scope

**In scope:**
- Add route snapshot persistence with per-user ownership and RLS.
- Add GPX parsing/validation service and upload endpoint.
- Integrate dashboard upload flow and static mini-map preview.
- Add S-02 verification matrix and docs updates.

**Out of scope:**
- Route analysis/difficulty/time estimation logic.
- Multi-route history browsing and management UX.
- Advanced interactive map features and observability expansion.

## Architecture / Approach

The flow is server-first and mirrors S-01 conventions: `dashboard form -> POST /api/routes/upload -> route parser/service -> Supabase snapshot upsert -> redirect with status -> dashboard renders snapshot`. Upload policy and ownership are enforced at the API/service boundary, while UI remains a thin consumer of persisted state.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Route snapshot contract | Route table + RLS + shared route types | Incomplete schema contract causing rework in API/UI |
| 2. GPX parser + service | Validated GPX transform and latest-snapshot service | Parser edge cases causing unstable ingestion |
| 3. Upload + dashboard mini-map | End-to-end user upload and map preview flow | Regression in protected dashboard behavior |
| 4. Verification + docs | Closure evidence and operational handoff | Missing edge-case coverage before implementation closure |

**Prerequisites:** S-01 archived, Supabase configured, migration workflow available.
**Estimated effort:** ~3-4 sessions across 4 phases.

## Open Risks & Assumptions

- Assumes full-geometry payload size stays practical under agreed file limits for MVP usage.
- Assumes static mini-map is sufficient UX for S-02 acceptance before richer interaction work.
- Main integration risk is robust parsing across real-world GPX variants.

## Success Criteria (Summary)

- Authenticated completed-profile user can upload GPX and see route preview map context.
- Route snapshot is user-owned, latest-upload based, and resilient to failed re-upload attempts.
- Existing auth/profile flows remain stable with no regressions after S-02 integration.
