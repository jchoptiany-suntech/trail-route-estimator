---
project: "Trail Route Estimator"
version: 1
status: active
created: 2026-09-03
updated: 2026-09-14
prd_version: 1
main_goal: quality
top_blocker: none
milestone_id: first-personalized-estimation-flow
milestone_seq: 1
milestone_status: open
---

# Roadmap: Trail Route Estimator

> Derived from `context/foundation/prd.md` + user addendum from 2026-09-14 + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Milestone

**M-01: First personalized estimation flow** — Status: open

- **Intent:** Deliver the first complete user journey from account access to personalized route estimation with saved history, then extend the estimation quality with runner-level signals and optional weather context.
- **Source materials:** `context/foundation/prd.md` (v1) + user addendum (ITRA + weather + average pace)
- **Done when:** every F-NN and S-NN below is `done`.
- **Scope anchors:** FR-001..FR-008, US-01, MS-01..MS-03.
  - MS-01: Estymacja może uwzględniać indeks biegacza (ITRA).
  - MS-02: Pogoda (Open-Meteo) jest sygnałem dodatkowym: wpływa lekko na estymację, ale nie jest wymagana do jej wyliczenia.
  - MS-03: Wynik estymacji pokazuje także przewidywane średnie tempo (min/km).

## Vision recap

People planning mountain trail runs need a more reliable estimate of route difficulty and completion time than manual interpretation of route metrics. The product value is still personalized estimation from route + runner context, but this milestone now extends that value toward richer inputs and clearer output quality. The riskiest assumption (the key hypothesis most likely to fail and most important to test early) is that adding runner indices and weather improves estimate usefulness without harming reliability.

## North star

**S-05: Enriched estimation signals and pace output** — This is the smallest end-to-end extension that validates whether richer runner + weather signals actually increase practical decision value for users under a quality-first bias.

> Here, "north star" means the smallest end-to-end user-visible slice whose successful delivery proves the core product hypothesis for the current milestone.

## At a glance

| ID | Change ID | Outcome (user can …) | Prerequisites | PRD refs | Status |
| ----- | ------------------------------ | ------------------------------------------------------------------------------- | ------------- | -------------------------------- | -------- |
| S-01 | account-and-sport-profile | register/log in and complete a basic sport profile | — | FR-001, FR-002, US-01 | done |
| S-02 | gpx-upload-and-map-context | upload GPX and view the uploaded route on a map | S-01 | FR-003, FR-007, US-01 | done |
| S-03 | personalized-estimation-result | run route analysis and receive personalized time and difficulty estimation | S-01, S-02 | FR-005, FR-006, US-01 | done |
| S-04 | saved-estimation-history | save generated estimations and view saved routes history | S-03 | FR-004, FR-008, US-01 | done |
| F-01 | external-signal-contracts | (foundation) define external signal contracts and fallback policy for weather and runner indices | S-03 | FR-005, FR-006, NFR-accuracy, MS-01, MS-02 | done |
| S-05 | enriched-estimation-signals | receive enriched estimation with runner-index and weather factors, plus average pace output | F-01, S-04 | FR-005, FR-006, US-01, MS-01, MS-02, MS-03 | proposed |
| S-06 | enriched-estimation-history | revisit saved estimation history entries with enriched-signal context and pace consistency | S-05 | FR-004, FR-008, US-01, MS-03 | proposed |

## Baseline

What's already in place in the codebase as of 2026-09-14 (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** present — Astro + React UI with dashboard/auth pages (`package.json`, `src/pages/dashboard.astro`).
- **Backend / API:** present — server route handlers for auth/profile/upload flows (`src/pages/api/auth/*`, `src/pages/api/profile.ts`, `src/pages/api/routes/upload.ts`).
- **Data:** present — Supabase persistence and migrations for profile/route/estimation/history (`supabase/migrations/*.sql`).
- **Auth:** present — Supabase session + middleware-protected routes (`src/lib/supabase.ts`, `src/middleware.ts`).
- **Deploy / infra:** partial — CI lint+build exists, deeper release hardening remains light (`.github/workflows/ci.yml`).
- **Observability:** absent — no dedicated telemetry stack detected (no sentry/datadog/otel integration).

## Foundations

### F-01: External signal contracts and fallback policy

- **Outcome:** (foundation) external weather and ITRA inputs have a defined contract, confidence/fallback behavior, and gating rules before user-facing enrichment is expanded, with weather kept optional.
- **Change ID:** external-signal-contracts
- **PRD refs:** FR-005, FR-006, NFR-accuracy, MS-01, MS-02
- **Unlocks:** S-05, S-06
- **Prerequisites:** S-03
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Weather provider selected: Open-Meteo (decision captured 2026-09-14). — Owner: user. Block: no.
  - ITRA mapping selected: global time multiplier with bounded impact (decision captured 2026-09-14). — Owner: user. Block: no.
- **Risk:** Without a clear external-data contract, enriched estimation can drift in behavior and fail quality expectations despite working code.
- **Status:** done

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
- **Status:** done

### S-03: Personalized estimation and difficulty result

- **Outcome:** user can run analysis and receive personalized route time estimation with an easy/medium/hard difficulty label.
- **Change ID:** personalized-estimation-result
- **PRD refs:** FR-005, FR-006, US-01
- **Prerequisites:** S-01, S-02
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** This is the value-defining slice; delaying it lowers product learning speed despite shipping progress elsewhere.
- **Status:** done

### S-04: Saved estimations and route history

- **Outcome:** user can save generated estimations and revisit saved routes and estimation history.
- **Change ID:** saved-estimation-history
- **PRD refs:** FR-004, FR-008, US-01
- **Prerequisites:** S-03
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** If persistence is delayed too late, the product loses repeat-use continuity promised by MVP scope.
- **Status:** done

### S-05: Enriched estimation signals and pace output

- **Outcome:** user can receive enriched route estimation that incorporates runner-index and optional weather context and displays predicted average pace.
- **Change ID:** enriched-estimation-signals
- **PRD refs:** FR-005, FR-006, US-01, MS-01, MS-02, MS-03
- **Prerequisites:** F-01, S-04
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Runner index selected: ITRA only (decision captured 2026-09-14). — Owner: user. Block: no.
  - What fallback should user see when Open-Meteo data is unavailable for selected time/location, with weather treated as optional input? — Owner: user. Block: no.
- **Risk:** Pulling in multiple signals without a strict fallback path can reduce trust in estimates even if calculations become more complex.
- **Status:** ready

### S-06: Enriched estimation history continuity

- **Outcome:** user can revisit saved estimation history with enriched context and pace values that remain coherent across recomputes.
- **Change ID:** enriched-estimation-history
- **PRD refs:** FR-004, FR-008, US-01, MS-03
- **Prerequisites:** S-05
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - History policy selected: freeze external-signal snapshot at save-time; provide explicit "recompute estimation" action to refresh with latest provider data on demand. — Owner: user. Block: no.
- **Risk:** If persistence semantics for external signals are unclear, history can become inconsistent and hard to interpret.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID | Suggested issue title | Ready for `/10x-plan` | Notes |
| ---------- | ------------------------------ | ------------------------------------------------------------- | --------------------- | ----- |
| S-01 | account-and-sport-profile | User can register, sign in, and keep sport profile | no | done |
| S-02 | gpx-upload-and-map-context | User can upload GPX and view route map context | no | done |
| S-03 | personalized-estimation-result | User gets personalized time and difficulty result | no | done |
| S-04 | saved-estimation-history | User can save estimations and view route history | no | done |
| F-01 | external-signal-contracts | Define external signal contracts and fallback policy | yes | This unlocks north star S-05 |
| S-05 | enriched-estimation-signals | User gets enriched estimation with pace output | no | Plan after F-01 is implemented |
| S-06 | enriched-estimation-history | User revisits enriched estimation history consistently | no | Wait for S-05 |

## Open Roadmap Questions

- —

## Parked

- **Real-time biometric analysis in MVP** — Why parked: PRD `## Non-Goals` explicitly defers live physiological processing.
- **Large-scale estimation cohort calibration** — Why parked: Vision marks this as a 100x scale concern and current sequencing is quality-first around MVP reliability.

## Milestone History

(empty on first milestone)

## Done

- **S-01: user can register, sign in, and maintain a basic sport profile required for personalized estimation.** — Archived 2026-09-13 → `context/archive/2026-09-03-account-and-sport-profile/`. Lesson: —.
- **S-02: user can upload a GPX route and see the uploaded route on a map for route understanding.** — Archived 2026-09-13 → `context/archive/2026-09-13-gpx-upload-and-map-context/`. Lesson: —.
- **S-03: user can run analysis and receive personalized route time estimation with an easy/medium/hard difficulty label.** — Archived 2026-09-13 → `context/archive/2026-09-13-personalized-estimation-result/`. Lesson: —.
- **S-04: user can save generated estimations and revisit saved routes and estimation history.** — Archived 2026-09-13 → `context/archive/2026-09-13-saved-estimation-history/`. Lesson: —.
- **F-01: (foundation) external weather and ITRA inputs have a defined contract, confidence/fallback behavior, and gating rules before user-facing enrichment is expanded, with weather kept optional.** — Archived 2026-09-14 → `context/archive/2026-09-14-external-signal-contracts/`. Lesson: —.
