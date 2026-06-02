---
starter_id: dotnet
package_manager: dotnet
project_name: trail-route-estimator
hints:
  language_family: dotnet
  team_size: solo
  deployment_target: azure-app-service
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: verified
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

Trail Route Estimator is a solo after-hours web-app project with a 3-week MVP timeline and auth as the only technology-forcing feature. The dotnet starter is the vetted default for (web-app, dotnet) and clears all four quality gates: C# provides strong static typing throughout, ASP.NET Core enforces conventions for routing, dependency injection, and configuration, .NET is well-represented in training data within the Microsoft ecosystem, and Microsoft Learn documentation is current and version-pinned. Scaffolding confidence is verified — the smoothest possible bootstrapper path. Deployment defaults to Azure App Service (starter default, user deferred choice). GitHub Actions with auto-deploy-on-merge is the standard CI shape for a solo shipping workflow.