---
starter_id: django
package_manager: uv
project_name: trail-route-estimator
hints:
  language_family: python
  team_size: solo
  deployment_target: fly
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: verified
  path_taken: standard
  quality_override: true
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
---

## Why this stack

Trail Route Estimator is a solo after-hours web-app with a 3-week MVP timeline and auth as the only technology-forcing feature. Django is the vetted default for (web-app, python) and arrives batteries-included: auth, ORM, migrations, and admin are pre-wired, removing most integration groundwork from the tight budget. Three of four quality gates pass cleanly — strong conventions, strong Python-ecosystem training-data presence, and authoritative version-pinned docs. The typed gate was surfaced (Django does not enforce static types by default) and the user accepted with awareness; adding Pydantic at service boundaries and incremental type hints is the compensation path. Scaffolding confidence is verified. Deployment targets Fly.io, the starter's first default. GitHub Actions with auto-deploy-on-merge matches solo shipping discipline.