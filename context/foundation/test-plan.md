# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-09-14

## 1. Strategy

Tests follow three non-negotiable principles for this project:

1. **Cost × signal.** The cheapest test that gives a real signal for the
   risk wins. Do not promote to e2e because e2e "feels safer." Do not put a
   vision model on top of a deterministic visual diff that already catches
   the regression.
2. **User concerns are first-class evidence.** Risks anchored in "the
   team is worried about X, and the failure would surface somewhere in
   area Y" carry the same weight as PRD lines or hot-spot data.
3. **Risks are scenarios, not code locations.** This plan documents what
   could fail and why we believe it is likely — drawn from documents,
   interview, and codebase signal (churn, structure, test base). It does
   NOT claim to know which line owns the failure. That knowledge is
   produced by `/10x-research` during each rollout phase. If the plan and
   research disagree about where the failure lives, research is the
   ground truth.

Hot-spot scope used for likelihood weighting: `src`, `tests`, `supabase/migrations`.

## 2. Risk Map

The top failure scenarios this project must protect against, ordered by
risk = impact × likelihood. Risks are failure scenarios in user/business
terms, not test names. The Source column cites evidence that surfaced the
risk — not an asserted code owner.

| # | Risk (failure scenario) | Impact | Likelihood | Source (evidence — not anchor) |
|---|---|---|---|---|
| 1 | Recompute preserves latest output but continuity degrades because history persistence fails or is surfaced ambiguously. | High | High | interview Q2; roadmap FR-004/FR-008 and S-04/S-06; hot-spot dir `src/lib/estimation` (38 commits/30d) |
| 2 | History continuity breaks with duplicate or mismatched entries for similar route/profile runs, reducing trust in comparisons. | High | High | interview Q4; roadmap S-04/S-06; hot-spot dirs `src/lib/estimation` (38 commits/30d), `src/lib/route` (11 commits/30d) |
| 3 | Parameter-weight changes introduce unstable estimate drift beyond intended behavior bounds. | High | Medium | interview Q3; PRD FR-005/FR-006 + NFR accuracy; archived S-05/F-01 plans |
| 4 | Abuse scenario: authenticated users can access, mutate, or recompute another user’s estimation/history context. | High | Medium | PRD Access Control; roadmap FR-004/FR-008; hot-spot dir `src/pages/api` (15 commits/30d) |
| 5 | Optional-signal fallback paths (missing provider data/input) produce inconsistent warnings or persisted context versus user-visible outputs. | Medium | High | archived F-01/S-05 plans; interview Q2; hot-spot dirs `src/lib/estimation` (38 commits/30d), `src/pages/api` (15 commits/30d) |
| 6 | Dashboard history/latest context drifts in rendering or warning precedence, leading to contradictory interpretation. | Medium | Medium | roadmap S-04/S-06; archived S-04/S-06 plans; hot-spot dirs `src/components/routes` (11 commits/30d), `src/pages/api` (15 commits/30d) |

### Risk Response Guidance

| Risk | What would prove protection | Must challenge | Context `/10x-research` must ground | Likely cheapest layer | Anti-pattern to avoid |
|------|-----------------------------|----------------|--------------------------------------|-----------------------|-----------------------|
| #1 | Partial history persistence failure cannot present as full success; continuity state stays explicit and coherent. | "Latest saved, so continuity is fine." | Latest vs history write boundary, warning propagation contract, response semantics | integration | happy-path-only assertions |
| #2 | Repeated recomputes preserve intended continuity semantics without unintended duplicates/mismatches. | "Same conceptual input always implies same continuity action." | Identity key policy, version/dedupe semantics, ordering tie-break behavior | integration + contract | implementation-mirror assertions |
| #3 | Bounded parameter adjustments remain within expected behavioral limits across representative scenarios. | "Small weight changes cannot break reliability." | Parameter normalization/clamp rules, independent behavior oracles, edge profiles | unit + contract | expected values copied from implementation |
| #4 | Ownership boundaries hold for all history read/update/recompute surfaces, not just authentication presence. | "Authenticated means authorized." | RLS-policy behavior and API ownership checks parity | integration | over-mocking authz boundaries |
| #5 | Missing/failed optional signals degrade deterministically with neutral influence and consistent warnings. | "Optional input can be silently ignored." | Optionality policy, warning precedence rules, persisted signal-status contract | unit + integration | e2e-first where deterministic checks suffice |
| #6 | Dashboard output and warning precedence stay semantically aligned for latest + history contexts. | "If it renders, it is correct." | SSR mapping/fallback contracts and display precedence | integration + UI contract | snapshot-without-meaning tests |

## 3. Phased Rollout

Each row is a discrete rollout phase that opens its own change folder.
Status is orchestrator state and advances from `not started` to `complete`.

| # | Phase name | Goal (one line) | Risks covered | Test types | Status | Change folder |
|---|---|---|---|---|---|---|
| 1 | Critical-path continuity coverage | Prove continuity under history-write degradation and dedupe pressure at the cheapest layer. | #1, #2 | integration + contract | change opened | context/changes/testing-critical-path-continuity-coverage/ |
| 2 | Estimation-parameter stability | Guard bounded parameter behavior and optional-signal fallback consistency. | #3, #5 | unit + integration | not started | — |
| 3 | Ownership and abuse boundaries | Verify ownership enforcement across history surfaces under authenticated access. | #4 | integration + security-focused contract | not started | — |
| 4 | Dashboard coherence and quality-gates wiring | Lock coherent rendering/warning semantics and wire risk-based local/CI gates. | #6, cross-cutting | UI contract + gates | not started | — |

## 4. Stack

The test base is currently sparse and centered on focused Node test files.
AI-native or tooling recommendations remain conservative and date-stamped.

| Layer | Tool | Version | Notes |
|------|------|---------|-------|
| unit + integration | Node test runner (`node --test`) | Node 22.14.0 | Current baseline test execution in `tests/*.test.js` |
| API mocking | none yet | n/a | Add only when integration boundaries require isolated provider behavior |
| e2e | none yet | n/a | No dedicated e2e runner configured today |
| accessibility | none yet | n/a | Consider after critical continuity risks are covered |
| (optional) AI-native | none | n/a | No AI-native test runner/tool surfaced in current session |

**Stack grounding tools (current session):**
- Docs: none — no docs MCP exposed in this session; checked: 2026-09-14
- Search: none — no Exa/search MCP exposed in this session; checked: 2026-09-14
- Runtime/browser: none — no browser automation MCP exposed in this session; checked: 2026-09-14
- Provider/platform: GitHub MCP — available for issue/workflow quality-gate support; checked: 2026-09-14

## 5. Quality Gates

The gates below are either already active or explicitly tied to rollout
phases in §3.

| Gate | Where | Required? | Catches |
|------|-------|-----------|---------|
| lint + typecheck/build | local + CI | required | syntax/type/config drift |
| focused unit + integration | local + CI | required after §3 Phase 1 | continuity and logic regressions |
| ownership/abuse integration checks | CI on PR | required after §3 Phase 3 | authz boundary regressions |
| post-edit hook on risk areas | local (agent loop) | recommended after §3 Phase 4 | fast feedback on high-risk edits |
| deterministic dashboard contract checks | CI on PR | required after §3 Phase 4 | render/warning precedence drift |
| pre-prod smoke | between merge + prod | optional | environment-specific failures |

## 6. Cookbook Patterns

How to add tests by behavior/risk area in this project. Placeholders are
intentionally phase-linked and filled as phases complete.

### 6.1 Adding a unit test

- TBD — see §3 Phase 2 for parameter-bound and fallback-behavior patterns.

### 6.2 Adding an integration test

- TBD — see §3 Phase 1 for continuity/degradation patterns and §3 Phase 3 for ownership patterns.

### 6.3 Adding a test for history continuity

- TBD — see §3 Phase 1 for duplicate/mismatch and partial-write continuity behavior.

### 6.4 Adding a test for new estimation parameter behavior

- TBD — see §3 Phase 2 for bounded weighting and neutral optional-signal behavior.

### 6.5 Adding a test for a new history-facing API endpoint

- TBD — see §3 Phase 3 for ownership and abuse boundary protection patterns.

### 6.6 Per-rollout-phase notes

- TBD — appended as each §3 phase lands.

## 7. What We Deliberately Don't Test

Exclusions agreed for this rollout. Re-evaluate only if assumptions change.

- **Marketing-style visual snapshots** — low signal, high maintenance churn. Re-evaluate if public conversion pages become a tracked business KPI. (Source: Phase 2 interview Q5.)
- **Generated artifacts that already have generator-level guarantees** — duplicate assertions add cost without new signal. Re-evaluate if generator contract changes or downstream transforms diverge. (Source: Phase 2 interview Q5.)
- **Low-impact internal/admin-only paths** — limited blast radius for current product scope. Re-evaluate if internal tooling scope or user count expands materially. (Source: Phase 2 interview Q5.)

## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-09-14
- Stack versions last verified: 2026-09-14
- AI-native tool references last verified: 2026-09-14

Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes (framework/runtime/test runner),
- §7 negative-space no longer matches team belief.
