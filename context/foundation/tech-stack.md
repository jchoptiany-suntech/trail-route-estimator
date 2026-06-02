---
starter_id: 10x-astro-starter
package_manager: npm
project_name: trail-route-estimator
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
---

## Why this stack

Trail Route Estimator is a solo after-hours web-app project with a 3-week MVP timeline, auth as the only technology-forcing feature, and no payments, realtime, or AI requirements. The recommended default for (web-app, js) — 10x Astro Starter — clears all four agent-friendly gates: TypeScript-first with Zod schemas at boundaries, opinionated folder layout and routing conventions, strong community presence in training data, and current version-pinned documentation. Auth and database come included via Supabase, removing integration setup from the 3-week budget. Cloudflare Pages is the starter's default deployment target and the user's confirmed choice. GitHub Actions with auto-deploy-on-merge matches the solo shipping discipline the short timeline demands. Standard path taken; all quality gates pass; no override recorded.