# Account Access and Sport Profile — Plan Brief

> Full plan: `context/changes/account-and-sport-profile/plan.md`

## What & Why

We are implementing the first complete account-and-profile slice needed before any route estimation flow can work reliably. The goal is to close FR-001 and FR-002 with minimal scope: stable email/password auth plus a required sport profile that supplies the first personalization inputs.

Because the roadmap is speed-biased and deadline-constrained, this plan prioritizes additive changes that preserve current auth behavior while introducing profile completeness gating only after profile persistence and UX are in place.

## Starting Point

The app already has Supabase SSR auth, auth pages, and middleware-based route protection for `/dashboard`. What is missing is server-hardened auth validation, profile persistence/contracts, and profile-completion policy enforcement.

## Desired End State

A user can register, sign in, create/edit a minimal sport profile, and finish required fields to unlock protected app surfaces. Incomplete profiles are explicitly treated as drafts and are hard-gated to the profile flow until completion.

Error handling across sign-in, sign-up, and profile updates is consistent and user-friendly, with raw provider messages hidden from the UI. The change is verified through existing lint/build automation plus a defined manual scenario matrix.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Profile scope | Minimal profile only | Keeps S-01 tractable and unblocks downstream slices fastest under deadline pressure. |
| Priority cutline | Ship auth + profile edit in one change | Closes both FR-001 and FR-002 without splitting the roadmap item. |
| Data model | One-to-one profile per auth user | Simplest and safest MVP contract for reads/writes and gate checks. |
| Profile gate policy | Hard gate on incomplete profile | Guarantees required profile inputs before protected workflow progression. |
| Incomplete profile behavior | Persist draft state | Avoids data loss when users pause before completion. |
| Error strategy | Friendly mapped errors | Improves UX and prevents leaking raw provider/internal error text. |
| Testing strategy | Lint/build + manual matrix | Matches existing repo tooling while still covering critical flow edges. |
| Performance boundary | Snappy MVP budget, no advanced caching | Preserves delivery speed without over-engineering early optimizations. |

## Scope

**In scope:**
- Harden server-side validation and error mapping for signin/signup.
- Introduce profile persistence (draft/complete) with owner-only access control.
- Add authenticated profile route/form and middleware completeness gating.
- Integrate dashboard/topbar behavior with new profile-required flow.
- Define and execute verification matrix for auth/profile scenarios.

**Out of scope:**
- GPX upload/map/estimation features (next roadmap slices).
- Social auth, MFA, multi-role authorization, advanced profile versions.
- Full automated test framework introduction in this change.

## Architecture / Approach

The plan follows a server-first policy pipeline: auth session remains resolved in middleware, profile completeness becomes an additional middleware decision, and profile data operations are encapsulated in a dedicated service + API route. UI layers (profile page/form, dashboard/topbar) consume that policy rather than re-implementing access rules locally.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Harden auth contracts and error mapping | Server-validated auth inputs + normalized user-facing auth errors | Regression in existing sign-in/sign-up redirect behavior |
| 2. Add profile persistence and profile API contract | One-to-one profile storage with draft/complete lifecycle and RLS | Data contract drift between completion rules and API behavior |
| 3. Enforce profile gate and integrate profile UX | Hard gate policy + usable profile editing flow in app navigation | Redirect loops or accidental lockout if gate exceptions are wrong |
| 4. Verification matrix and documentation handoff | Release confidence through automation + manual matrix + docs updates | Missing scenario coverage causing hidden auth/profile regressions |

**Prerequisites:** Supabase project configured with required env secrets, existing auth flow operational, roadmap slice `S-01` active.
**Estimated effort:** ~3-4 sessions across 4 phases.

## Open Risks & Assumptions

- Assumes Supabase schema migration and RLS policy rollout can be applied before enabling hard gate in non-dev environments.
- Assumes minimal profile fields selected now are sufficient to unblock the next slice without immediate schema expansion.
- Main risk is policy ordering: enabling the gate before profile UX/API readiness would create user lockout.

## Success Criteria (Summary)

- Users can register/sign in and maintain a minimal profile with draft and complete states.
- Incomplete profile users are redirected to complete profile before accessing protected app areas.
- Error handling is consistent, user-friendly, and free from raw provider/internal leakage.
