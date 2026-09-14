# First Production Deploy Runbook (Wrangler Workers)

## Scope

- Runtime: Astro SSR with `@astrojs/cloudflare`
- Deployment path: `npx wrangler deploy` (manual first release)
- Repository: `jchoptiany-suntech/trail-route-estimator`

## Execution Log

1. Worker deployed successfully.
2. Production URL: `https://trail-route-estimator.trail-route-estimator.workers.dev`
3. Current Version ID: `21161962-67a8-4016-aa24-c296887498e2`
4. Runtime secrets configured in Worker:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
5. GitHub repository secrets configured:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`

## Preconditions

1. `SUPABASE_URL` and `SUPABASE_KEY` are available and valid for production.
2. GitHub CLI is authenticated (for CI secrets management).
3. Local Node.js version is compatible with Astro (`>=22.12.0`).
4. Repository quality gate passes (`npm run lint` and `npm run build`).

## Manual Setup Gates

1. Configure Cloudflare runtime secrets:
   - `npx wrangler secret put SUPABASE_URL`
   - `npx wrangler secret put SUPABASE_KEY`
2. Configure GitHub Actions secrets:
   - `gh secret set SUPABASE_URL --repo jchoptiany-suntech/trail-route-estimator`
   - `gh secret set SUPABASE_KEY --repo jchoptiany-suntech/trail-route-estimator`

## Release Gate

1. `npm run lint`
2. `npm run build`

If either step fails, stop and resolve before deploy.

## First Deploy

1. `npx wrangler deploy`
2. Capture the deployed URL and deployment metadata in the deployment log.

## Post-Deploy Verification

1. Open homepage and verify response status is `200`.
2. Validate auth flow:
   - Sign in and sign up endpoints respond correctly.
   - Protected route (`/dashboard`) redirects unauthenticated users to `/auth/signin`.
3. Stream runtime logs:
   - `npx wrangler tail`

## Rollback

1. Identify last known good deployment.
2. Redeploy the previous artifact/version via Wrangler.
3. Re-run post-deploy verification checks.

## Environment Note

Windows `curl` in this environment requires `--ssl-no-revoke` to bypass Schannel revocation-check failures (`CRYPT_E_NO_REVOCATION_CHECK`) for `*.workers.dev`.

Validated smoke-check commands:

- `curl --ssl-no-revoke -I https://trail-route-estimator.trail-route-estimator.workers.dev` → `200`
- `curl --ssl-no-revoke -I https://trail-route-estimator.trail-route-estimator.workers.dev/auth/signin` → `200`
- `curl --ssl-no-revoke -I https://trail-route-estimator.trail-route-estimator.workers.dev/dashboard` → `302` with `Location: /auth/signin`
