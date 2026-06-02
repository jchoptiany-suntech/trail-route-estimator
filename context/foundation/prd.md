---
project: "Trail Route Estimator"
version: 1
status: draft
created: 2026-05-29
context_type: greenfield
product_type: web-app
target_scale:
  users: medium
  qps: tbd
  data_volume: tbd
timeline_budget:
  mvp_weeks: 3
  hard_deadline: 2026-07-05
  after_hours_only: true
---

## Vision & Problem Statement

People planning mountain trail runs struggle to make a reliable, real-world estimate of route difficulty and completion time from raw route metrics alone.
The key insight is personalized estimation: combine GPX route profile (distance, elevation, slope/profile) with the runner's fitness/experience profile to produce realistic effort and time expectations.

Pain category: decision paralysis + inaccurate estimation.
Cost today: manual interpretation leads to poor planning, overexertion risk, and avoidable safety issues (e.g., returning too late, underestimating load).
Scale note: at 100x user scale, estimation logic likely needs calibration/segmentation by user profile cohorts.

## User & Persona

Primary persona: trail runner preparing mountain routes.
Trigger moment: right before choosing a route for a specific day.

## Success Criteria

### Primary

- User completes the full first flow: register/login, completes sport profile, uploads GPX, receives route analysis + time estimation + map visualization, and saves the estimation.

### Secondary

- The system provides a simple route difficulty label (easy/medium/hard) alongside the estimation.

### Guardrails

- Estimation reliability remains within target accuracy expectations.
- Route and user profile data privacy is preserved.

## User Stories

### US-01: Analyze a route and get personalized estimation

- **Given** a logged-in user with a completed sport profile and an uploaded GPX file
- **When** the user runs route analysis
- **Then** the user receives personalized difficulty and time estimation and can save the result

#### Acceptance Criteria

- Analysis includes distance, elevation gain/loss, route profile, and slope-derived features.
- A single route receives both a time estimate and a difficulty label.
- User can persist the generated estimation to their profile history.

## Functional Requirements

- FR-001: User can register and log in with email and password. Priority: must-have
  > Socrates: Counter-argument considered: "Use magic-link/passwordless to reduce friction."
  > Resolution: kept for MVP to reduce authentication complexity and keep predictable access flow.
- FR-002: User can create and update a basic sport profile. Priority: must-have
  > Socrates: Counter-argument considered: "Use only a minimal profile first to avoid onboarding friction."
  > Resolution: kept and interpreted as minimal profile fields only in MVP.
- FR-003: User can upload a GPX file. Priority: must-have
  > Socrates: Counter-argument considered: "No counter-argument; it stands as written."
  > Resolution: kept as written.
- FR-004: User can save routes and view saved routes. Priority: must-have
  > Socrates: Counter-argument considered: "Skip route history in v1 and analyze one route at a time."
  > Resolution: kept because saved history supports repeated planning and user continuity.
- FR-005: User can receive route analysis based on distance, elevation gain/loss, profile, and average slope. Priority: must-have
  > Socrates: Counter-argument considered: "Complex analysis may increase implementation risk for MVP."
  > Resolution: kept as core product value; implementation can simplify internals while preserving output.
- FR-006: User can receive a personalized route time estimation. Priority: must-have
  > Socrates: Counter-argument considered: "Personalization quality may be weak with limited profile data."
  > Resolution: kept, with initial profile scope constrained and quality tracked by success criteria.
- FR-007: User can view the uploaded route on a map. Priority: must-have
  > Socrates: Counter-argument considered: "Map integration can add UI complexity and external dependencies."
  > Resolution: kept because map context is part of route-understanding UX for MVP.
- FR-008: User can save generated estimations in their profile. Priority: must-have
  > Socrates: Counter-argument considered: "Saving estimations can wait until value of core estimation is validated."
  > Resolution: kept to support basic history and repeat-use value in MVP.

## Non-Functional Requirements

- At least 80% of generated time estimations are within ±20% of real route completion time.

## Business Logic

The app estimates route completion time and effort difficulty by combining GPX terrain features with the runner's personal fitness profile.

Inputs are user-facing route metrics derived from uploaded GPX data (distance, elevation gain/loss, slope/profile context) and a basic user fitness profile.
The output is a personalized time estimate and a route difficulty label.
The user encounters this decision immediately after running route analysis on an uploaded route.

## Access Control

Authentication: email + password login.
Authorization model: flat single-role user model in MVP (no role separation yet).

## Non-Goals

- No real-time biometric analysis in MVP (defer live physiological processing scope).

## Open Questions

1. None at this time.