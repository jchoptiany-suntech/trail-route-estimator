---
bootstrapped_at: 2026-06-02T11:18:43Z
starter_id: 10x-astro-starter
starter_name: 10x Astro Starter (Astro + Supabase + Cloudflare)
project_name: trail-route-estimator
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: npm audit --json
---

## Hand-off

```yaml
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
```

## Why this stack

Trail Route Estimator is a solo after-hours web-app project with a 3-week MVP timeline, auth as the only technology-forcing feature, and no payments, realtime, or AI requirements. The recommended default for (web-app, js) — 10x Astro Starter — clears all four agent-friendly gates: TypeScript-first with Zod schemas at boundaries, opinionated folder layout and routing conventions, strong community presence in training data, and current version-pinned documentation. Auth and database come included via Supabase, removing integration setup from the 3-week budget. Cloudflare Pages is the starter's default deployment target and the user's confirmed choice. GitHub Actions with auto-deploy-on-merge matches the solo shipping discipline the short timeline demands. Standard path taken; all quality gates pass; no override recorded.

## Pre-scaffold verification

| Signal      | Value                                                                  | Severity | Notes                             |
| ----------- | ---------------------------------------------------------------------- | -------- | --------------------------------- |
| npm package | not run                                                                | n/a      | `cmd_template` uses `git clone`   |
| GitHub repo | przeprogramowani/10x-astro-starter last pushed 2026-05-17T10:33:39Z   | fresh    | from `card.docs_url`              |

## Scaffold log

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`  
**Strategy**: git-clone  
**Exit code**: 0  
**Files moved**: 31,520  
**Conflicts (.scaffold siblings)**: `.vscode\settings.json.scaffold`  
**.gitignore handling**: moved silently  
**.bootstrap-scaffold cleanup**: deleted

## Post-scaffold audit

**Tool**: `npm audit --json`  
**Summary**: 0 CRITICAL, 1 HIGH, 9 MODERATE, 0 LOW  
**Direct vs transitive**: 0/0/2/0 direct of total 0/1/9/0

#### CRITICAL findings

None.

#### HIGH findings

**Package**: `devalue`  
**Version**: `5.8.0`  
**Advisory**: `GHSA-77vg-94rm-hx3p`  
**Description**: Svelte devalue: DoS via sparse array deserialization  
**Fix**: npm audit reports a fix is available

#### MODERATE findings

**Package**: `@astrojs/check`  
**Version**: `0.9.9`  
**Advisory**: not surfaced in npm audit summary  
**Description**: npm audit marked this direct dependency as moderate severity  
**Fix**: npm audit suggests `@astrojs/check@0.9.2` (semver-major change)

**Package**: `@astrojs/language-server`  
**Version**: `2.16.8`  
**Advisory**: not surfaced in npm audit summary  
**Description**: transitive moderate finding affecting `@astrojs/check`  
**Fix**: npm audit routes remediation through `@astrojs/check@0.9.2`

**Package**: `@cloudflare/vite-plugin`  
**Version**: `1.36.3`  
**Advisory**: not surfaced in npm audit summary  
**Description**: transitive moderate finding  
**Fix**: npm audit reports a fix is available

**Package**: `miniflare`  
**Version**: `4.20260507.1`  
**Advisory**: not surfaced in npm audit summary  
**Description**: transitive moderate finding affecting `@cloudflare/vite-plugin` and `wrangler`  
**Fix**: npm audit reports a fix is available

**Package**: `volar-service-yaml`  
**Version**: `0.0.70`  
**Advisory**: not surfaced in npm audit summary  
**Description**: transitive moderate finding affecting `@astrojs/language-server`  
**Fix**: npm audit routes remediation through `@astrojs/check@0.9.2`

**Package**: `wrangler`  
**Version**: `4.90.0`  
**Advisory**: not surfaced in npm audit summary  
**Description**: npm audit marked this direct dependency as moderate severity  
**Fix**: npm audit reports a fix is available

**Package**: `ws`  
**Version**: `8.18.0`  
**Advisory**: `GHSA-58qx-3vcg-4xpx`  
**Description**: ws: Uninitialized memory disclosure  
**Fix**: npm audit reports a fix is available

**Package**: `yaml`  
**Version**: nested copy under `yaml-language-server`  
**Advisory**: `GHSA-48c2-rrv3-qjmp`  
**Description**: yaml is vulnerable to Stack Overflow via deeply nested YAML collections  
**Fix**: npm audit routes remediation through `@astrojs/check@0.9.2`

**Package**: `yaml-language-server`  
**Version**: `1.20.0`  
**Advisory**: not surfaced in npm audit summary  
**Description**: transitive moderate finding affecting `volar-service-yaml`  
**Fix**: npm audit routes remediation through `@astrojs/check@0.9.2`

#### LOW / INFO findings

None.

## Hints recorded but not acted on

| Hint                     | Value                |
| ------------------------ | -------------------- |
| bootstrapper_confidence  | first-class          |
| quality_override         | false                |
| path_taken               | standard             |
| self_check_answers       | null                 |
| team_size                | solo                 |
| deployment_target        | cloudflare-pages     |
| ci_provider              | github-actions       |
| ci_default_flow          | auto-deploy-on-merge |
| has_auth                 | true                 |
| has_payments             | false                |
| has_realtime             | false                |
| has_ai                   | false                |
| has_background_jobs      | false                |

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- `git init` (if you have not already) to start your own repo history.
- Review any `.scaffold` siblings the conflict policy created and decide which version of each file to keep.
- Address audit findings per your project's risk tolerance — the full breakdown is in this log.
