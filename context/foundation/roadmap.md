---
project: "Trail Route Estimator"
version: 1
status: draft
created: 2026-09-03
updated: 2026-09-13
prd_version: 1
main_goal: speed
top_blocker: time
milestone_id: first-personalized-estimation-flow
milestone_seq: 1
milestone_status: open
---

# Roadmap: Trail Route Estimator

> Derived from `context/foundation/prd.md` + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Milestone

**M-01: First personalized estimation flow** — Status: open

- **Intent:** Deliver the first complete user journey from account access to a personalized route estimation result and saved history. Prove that the core estimation value can be shipped under a tight timeline.
- **Source materials:** `context/foundation/prd.md` (v1)
- **Done when:** every S-NN below is `done`.
- **Scope anchors:** FR-001..FR-008, US-01.

## Vision recap

People planning mountain trail runs need a more reliable way to estimate route difficulty and completion time than manual reading of raw route metrics. The product value is personalized estimation that combines route features from GPX data with the runner profile. For this milestone, the focus is shipping the first usable end-to-end flow quickly so users can apply the estimate in real route decisions.

## North star

**S-03: Personalized estimation and difficulty result** — This is the smallest delivered outcome that proves the product's core value under a speed-first sequencing strategy.

> Here, "north star" means the smallest end-to-end user-visible slice that proves the main product idea works in practice, so it is pulled as early as prerequisites allow.

## At a glance

| ID | Change ID | Outcome (user can …) | Prerequisites | PRD refs | Status |
| ----- | -------------------------- | -------------------------------------------------------------- | ------------- | ------------------------- | -------- |
| S-01 | account-and-sport-profile | register/log in and complete a basic sport profile | — | FR-001, FR-002, US-01 | done |
| S-02 | gpx-upload-and-map-context | upload GPX and view the uploaded route on a map | S-01 | FR-003, FR-007, US-01 | proposed |
| S-03 | personalized-estimation-result | run route analysis and receive personalized time and difficulty estimation | S-01, S-02 | FR-005, FR-006, US-01 | proposed |
| S-04 | saved-estimation-history | save generated estimations and view saved routes history | S-03 | FR-004, FR-008, US-01 | proposed |

## Baseline

What's already in place in the codebase as of 2026-09-03 (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** present — user interface and routed pages are already scaffolded.
- **Backend / API:** present — server-side route handlers and middleware entrypoints are already wired.
- **Data:** partial — persistence integration exists, but persistence contracts and lifecycle completeness for roadmap outcomes are incomplete.
- **Auth:** present — authenticated session flow and route protection are already wired.
- **Deploy / infra:** partial — baseline runtime and CI checks exist, but deployment hardening is incomplete.
- **Observability:** absent — dedicated instrumentation for flow-level diagnostics is not yet established.

## Foundations

No standalone cross-cutting foundation is required before the first vertical slice. Technical elements are introduced progressively inside the first consuming slice to minimize up-front scope under the current time blocker.

## Slices

### S-01: Account access and sport profile

- **Outcome:** user can register, sign in, and maintain a basic sport profile required for personalized estimation.
- **Change ID:** account-and-sport-profile
- **PRD refs:** FR-001, FR-002, US-01
- **Prerequisites:** —
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** If this is under-scoped, downstream slices cannot use stable profile inputs and sequencing slips immediately.
- **Status:** done

### S-02: Route upload and map context

- **Outcome:** user can upload a GPX route and see the uploaded route on a map for route understanding.
- **Change ID:** gpx-upload-and-map-context
- **PRD refs:** FR-003, FR-007, US-01
- **Prerequisites:** S-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Upload and map coupling can create integration friction; sequencing here isolates that risk before estimation logic.
- **Status:** proposed

### S-03: Personalized estimation and difficulty result

- **Outcome:** user can run analysis and receive personalized route time estimation with an easy/medium/hard difficulty label.
- **Change ID:** personalized-estimation-result
- **PRD refs:** FR-005, FR-006, US-01
- **Prerequisites:** S-01, S-02
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** This is the value-defining slice; delaying it lowers product learning speed despite shipping progress elsewhere.
- **Status:** proposed

### S-04: Saved estimations and route history

- **Outcome:** user can save generated estimations and revisit saved routes and estimation history.
- **Change ID:** saved-estimation-history
- **PRD refs:** FR-004, FR-008, US-01
- **Prerequisites:** S-03
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** If persistence is delayed too late, the product loses repeat-use continuity promised by MVP scope.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID | Suggested issue title | Ready for `/10x-plan` | Notes |
| ---------- | -------------------------- | -------------------------------------------------- | --------------------- | ----- |
| S-01 | account-and-sport-profile | User can register, sign in, and keep sport profile | yes | Run `/10x-plan account-and-sport-profile` |
| S-02 | gpx-upload-and-map-context | User can upload GPX and view route map context | no | Wait for S-01 |
| S-03 | personalized-estimation-result | User gets personalized time and difficulty result | no | North star; waits for S-01 and S-02 |
| S-04 | saved-estimation-history | User can save estimations and view route history | no | Wait for S-03 |

## Open Roadmap Questions

1. **None at this time.** — Owner: —. Block: —.

## Parked

- **Real-time biometric analysis in MVP** — Why parked: PRD `## Non-Goals` explicitly defers live physiological processing.
- **Large-scale estimation cohort calibration** — Why parked: Vision marks this as a 100x scale concern and current sequencing is speed-first under deadline pressure.

## Milestone History

(empty on first milestone)

## Done

- **S-01: user can register, sign in, and maintain a basic sport profile required for personalized estimation.** — Archived 2026-09-13 → `context/archive/2026-09-03-account-and-sport-profile/`. Lesson: —.
