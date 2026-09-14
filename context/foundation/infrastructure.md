---
project: trail-route-estimator
researched_at: 2026-09-03T18:18:47+02:00
recommended_platform: Cloudflare Workers + Pages
runner_up: Netlify
context_type: mvp
tech_stack:
  language: JavaScript/TypeScript
  framework: Astro 6 SSR + React 19
  runtime: Cloudflare workerd (@astrojs/cloudflare 13.x)
---

## Recommendation

**Deploy on Cloudflare Workers + Pages.**

This option scored highest after fresh platform research and matches your current repository setup (`astro@6.3.1`, `@astrojs/cloudflare@13.5.0`, `wrangler@4.90.0`) without adapter migration. With your constraints (cost-first MVP, no persistent process requirement, single region acceptable, no strong platform familiarity), Cloudflare gives the lowest-friction path with strong CLI/docs integration and the best free-tier economics at 10k-100k requests.

## Platform Comparison

| Platform | CLI-first | Managed/Serverless | Agent-readable docs | Stable deploy API | MCP / Integration | Total |
|---|---|---|---|---|---|---|
| Cloudflare Workers + Pages | Pass | Pass | Pass | Pass | Pass | 5.0 |
| Netlify | Pass | Pass | Pass | Partial | Pass | 4.5 |
| Vercel | Pass | Pass | Partial | Pass | Partial | 4.0 |
| Railway | Pass | Partial | Pass | Pass | Pass | 4.0 |
| Fly.io | Pass | Partial | Pass | Partial | Partial | 3.5 |
| Render | Partial | Partial | Pass | Partial | Partial | 3.0 |

**Cloudflare Workers + Pages:** Full fit for current stack and runtime target. `wrangler deploy`, `wrangler rollback` (Workers), and `wrangler tail` are mature; docs are agent-readable (`llms.txt` + GitHub docs source); and Cloudflare MCP support is available. Cost is strongest for your expected traffic (typically within free limits). Noted non-GA caveats: selected Wrangler flags and some ecosystem features are beta/experimental/private beta.

**Netlify:** Strong docs/CLI and very attractive credit model for MVP traffic. Netlify MCP is first-class and docs are easy for agents to parse. It ranks second because rollback from CLI is less direct (often via API/UI flow) and your repo would need adapter migration from Cloudflare to Netlify.

**Vercel:** Excellent deploy DX, stable rollback/log tooling, and very good free entry tier for low traffic. It scores lower than Netlify here because your current stack still needs adapter migration, and key agent/realtime surfaces (e.g., MCP/WebSocket support) include public beta status caveats.

**Railway:** Strong CLI and solid MCP/docs story with persistent service model. It drops for this MVP because it is more container/PaaS-shaped than serverless and usually has higher baseline monthly cost than Cloudflare/Netlify for this app class.

**Fly.io:** Highly capable for persistent processes and infra control, but less “managed/serverless” for a fast MVP and no always-on process requirement from your interview. Several relevant surfaces are experimental/beta (notably MCP command surface and some managed service capabilities), and no permanent free tier weakens cost fit.

**Render:** Good markdown docs and simple hosting model, but weaker CLI rollback ergonomics and free-tier operational caveats (spin-down behavior, limits) reduce confidence for this exact SSR workflow compared to higher-ranked options.

### Shortlisted Platforms

#### 1. Cloudflare Workers + Pages (Recommended)

It won because it is already wired into your codebase, gives top score across all five criteria, and best matches a cost-sensitive MVP with no persistent process requirement.

#### 2. Netlify

Very close operationally and cost-effective, but behind due to migration overhead and slightly weaker scriptable rollback ergonomics.

#### 3. Vercel

Excellent alternative with polished CI/deploy experience, but migration from current Cloudflare-targeted runtime plus beta caveats on some advanced capabilities places it third.

## Anti-Bias Cross-Check: Cloudflare Workers + Pages

### Devil's Advocate — Weaknesses

1. `workerd` is not full Node.js; some SSR dependencies can behave differently and fail only in edge/runtime-specific paths.
2. Pages vs Workers operational paths are easy to mix up, increasing release mistakes (wrong command, wrong artifact, wrong rollback assumption).
3. App rollback is fast, but data-layer rollback is not; a bad migration in Supabase can outlive a reverted deploy.
4. Cloudflare-native primitives (KV/DO/Queues) can quietly increase lock-in if introduced ad hoc during incident fixes.
5. Debugging latency/perf issues can get noisy when edge compute location and external data-provider region (Supabase) are misaligned.

### Pre-Mortem — How This Could Fail

The team chose Cloudflare because it matched the existing Astro adapter and looked nearly free at MVP scale. Early releases were fast, so release discipline stayed informal: no strict runbook, weak environment separation, and no hard checks around preview vs production commands. As features accumulated, one dependency behaved differently under `workerd` than local assumptions suggested, but the issue appeared intermittently and was misdiagnosed as app logic. Later, a schema change shipped with the app release; the deploy itself was reversible, but the database migration was not, so rolling back the app did not restore behavior. Meanwhile, more Cloudflare-specific bindings were added to patch performance and caching problems quickly, making the architecture harder to move. Latency complaints grew because traffic and Supabase region locality were never measured explicitly, so the team optimized the wrong layer for weeks. Six months in, the platform still ran, but velocity dropped: every release required more manual checks, incident triage took longer than expected, and the original “cheap and simple” assumption turned into hidden operational cost.

### Unknown Unknowns

- Older tutorials may use deprecated/legacy Wrangler flows; current Pages vs Workers command split matters and can change quickly by CLI major.
- Astro 6 + Cloudflare adapter v13 already gives high local runtime fidelity via `astro dev` (`workerd`), so adding separate legacy local commands can create confusion instead of parity.
- Some Cloudflare/Wrangler capabilities are explicitly beta/experimental/private beta and should not be treated as stable operational dependencies.
- Preview URLs are often public by default unless protected (e.g., Cloudflare Access), which can expose test data or internal workflows.
- At low request counts, latency bottlenecks may come from Supabase region distance rather than hosting platform CPU/network limits.

## Operational Story

- **Preview deploys**: Use Cloudflare Pages Git integration for branch/PR preview URLs; protect sensitive previews with Cloudflare Access before sharing externally.
- **Secrets**: Keep runtime secrets in Cloudflare secrets/vars and CI secrets in GitHub Actions; rotate with `wrangler secret put <NAME>` and limit write access to maintainers.
- **Rollback**: For Workers, use `wrangler rollback`; for Pages, redeploy/promote a previous successful deployment via deployment history/API flow. Treat DB migrations as separate rollback playbooks.
- **Approval**: Human-only for production publish approvals, primary secret rotation, and destructive data operations; agent may run read-only diagnostics, preview deploy checks, and non-destructive actions.
- **Logs**: Runtime logs with `wrangler tail` (Workers) or `wrangler pages deployment tail` (Pages); pipeline/build logs from GitHub Actions and deployment history.

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Runtime-specific dependency breakage under `workerd` | Devil's advocate | M | H | Keep a production-like smoke test suite and block deploy if SSR critical paths fail under Cloudflare runtime. |
| Command-path confusion between Pages and Workers | Devil's advocate / Unknown unknowns | M | M | Standardize one deploy path in repo docs and CI, with explicit command ownership and rollback procedure. |
| Irreversible DB migration after app rollback | Devil's advocate / Pre-mortem | M | H | Enforce backward-compatible migration windows and separate migration approval gate before production publish. |
| Vendor lock-in creep via Cloudflare-specific primitives | Devil's advocate | M | M | Encapsulate platform-specific integrations behind service interfaces in `src/lib/services/`. |
| Hidden latency from Supabase region mismatch | Unknown unknowns / Research finding | M | M | Measure p95 by endpoint and align Supabase region strategy before optimization work. |
| Reliance on beta/experimental platform features | Unknown unknowns / Research finding | L | M | Keep beta features out of critical production path; track feature status quarterly and maintain fallback commands. |

## Getting Started

1. Install dependencies and keep pinned toolchain from repo: `npm install`.
2. Configure local/server secrets (`SUPABASE_URL`, `SUPABASE_KEY`) in `.dev.vars`/environment and verify local runtime with `npm run dev` (Astro 6 + Cloudflare adapter uses `workerd` parity path).
3. Build SSR artifact with `npm run build` and confirm `dist/` output is generated for the Cloudflare entrypoint.
4. Authenticate and provision secrets on Cloudflare: `npx wrangler login`, then `npx wrangler secret put SUPABASE_URL` and `npx wrangler secret put SUPABASE_KEY`.
5. Deploy with current project config (`wrangler.jsonc` uses `main: @astrojs/cloudflare/entrypoints/server`) via `npx wrangler deploy`; monitor runtime logs with `npx wrangler tail`.

## Out of Scope

The following were not evaluated in this research:
- Docker image configuration
- CI/CD pipeline setup
- Production-scale architecture (multi-region, HA, DR)
