# Critical-path continuity coverage — Plan brief

> Full plan: `context/changes/testing-critical-path-continuity-coverage/plan.md`

## What & Why

This plan implements Phase 1 of the test rollout by hardening continuity behavior around recompute and history persistence. The goal is to prove that degraded history persistence never looks like full success to the user, and that repeated recomputes preserve continuity semantics without duplicate/mismatch confusion. We focus on integration + contract layers because they give the best cost-to-signal for risks #1 and #2.

## Starting Point

The app already supports recompute flows and warning redirects, plus history versioning primitives and continuity identity helpers. Existing tests validate parts of these contracts, but there is no single risk-focused continuity matrix spanning upload and explicit history recompute outcomes.

## Desired End State

After this plan, continuity-critical behavior is protected by deterministic tests that clearly distinguish full success, degraded success, and failure. Repeated recompute behavior is verified using route+profile+version semantics, and mismatch handling is explicit. The test set becomes the confidence baseline for later rollout phases.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Phase 1 scope boundary | Cover upload + explicit history recompute; exclude profile-save | This captures highest-risk continuity paths while keeping execution tight for a low-complexity pass. |
| Partial persistence semantics | Keep current success-with-warning behavior | It preserves successful latest estimation while forcing explicit continuity degradation signals. |
| Duplicate/recompute policy | Explicit recompute should append version history | This keeps recompute as an auditable continuity event instead of collapsing context. |
| Mismatch definition | Validate route hash + profile signature + history version semantics | Route-only checks are too weak for continuity trust and can miss semantic drift. |
| Verification layer | Integration + contract only | This matches the rollout strategy and gives behavioral confidence without expensive e2e expansion. |

## Scope

**In scope:**
- New continuity-focused integration coverage for upload and explicit recompute paths
- Contract test expansion for dedupe identity, version behavior, and deterministic ordering
- Alignment of warning/continuity assertions with current user-visible semantics

**Out of scope:**
- Profile-save flow coverage in this phase
- Runtime behavior rewrites, schema migrations, or new product features
- Browser/e2e quality-gate rollout

## Architecture / Approach

The plan adds a scenario matrix and maps each risk-critical behavior to either integration tests (for route-level outcomes) or contract tests (for identity/order semantics). Assertions remain behavior-first: redirect outcomes, warning visibility, mismatch rejection, and version continuity. No production-path architectural change is required.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Continuity scenario matrix and shared test harness | Canonical scenarios and aligned baseline contracts | Matrix drifts from risk language and loses traceability |
| 2. Integration coverage for upload and explicit recompute continuity | End-to-end continuity outcome tests for selected entrypoints | Degraded persistence still appears as full success in user-facing outcomes |
| 3. Contract coverage for duplicate and mismatch semantics | Locked identity/version/tie behavior across repeated recomputes | Duplicate/mismatch ambiguity reappears via semantic drift |

**Prerequisites:** Existing continuity-related code and current Node `--test` baseline remain available; no infra change required.  
**Estimated effort:** ~2-3 implementation sessions across 3 phases.

## Open Risks & Assumptions

- Integration harness fidelity must be high enough to represent partial persistence boundaries without over-mocking.
- Text-based classification for history-only failures is brittle; tests should explicitly guard recognized vs unrecognized failures.

## Success Criteria (Summary)

- Continuity tests prove degraded history persistence is never equivalent to full success.
- Repeated recompute continuity behavior is deterministic under route+profile+version semantics.
- Phase 1 scope remains constrained to risks #1 and #2 with no unintended expansion.
