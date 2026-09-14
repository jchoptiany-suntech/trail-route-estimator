# Copilot instructions for this repository

## Build, lint, and test commands

- Install deps: `npm install`
- Dev server (Cloudflare workerd runtime): `npm run dev`
- Production build (SSR with `@astrojs/cloudflare`): `npm run build`
- Preview production build: `npm run preview`
- Lint all files: `npm run lint`
- Lint one file: `npm run lint -- src\path\to\file.tsx`
- Auto-fix lint issues: `npm run lint:fix`
- Format repo: `npm run format`

Test runner/source-of-truth reference: `@package.json` (scripts and tooling declarations).

## High-level architecture

- Stack: **Astro 6 SSR + React 19 islands + Tailwind 4 + Supabase Auth**, deployed to **Cloudflare Workers**.
- Runtime mode is server-first (`astro.config.mjs` uses `output: "server"` and `adapter: cloudflare()`), so routes are rendered on the server by default.
- Authentication is cookie-session based:
  - `src/lib/supabase.ts` creates a Supabase SSR client from request cookies and writes auth cookies back through Astro cookies.
  - `src/middleware.ts` resolves the current user on every request and stores it in `Astro.locals.user`.
  - Protected routes are centralized in `PROTECTED_ROUTES` in middleware (currently `/dashboard`) and redirect unauthenticated users to `/auth/signin`.
  - Auth API endpoints live in `src/pages/api/auth/{signin,signup,signout}.ts` and auth pages live in `src/pages/auth/`.
- Layout-level config signaling:
  - `src/lib/config-status.ts` derives missing required server config (currently Supabase URL/key).
  - `src/layouts/Layout.astro` renders warning banners when required config is missing, instead of failing silently.
- CI/source-of-truth reference: `@.github/workflows/ci.yml` (job steps and required secrets).

## Key conventions for this codebase

- Use `@/*` import alias for source imports (`@/lib/...`, `@/components/...`) rather than deep relative paths.
- Keep static rendering/layout in `.astro` files; use React components for interactive form/UI islands (`client:load` in auth pages).
- For class name composition in React/shadcn components, use `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge) instead of manual string concatenation.
- API routes should use Astro `APIRoute` exports with uppercase handlers (`GET`, `POST`) and live under `src/pages/api/`.
- `App.Locals.user` typing is defined in `src/env.d.ts`; preserve that contract when changing auth/middleware behavior.
- Supabase secrets come from `astro:env/server` and should remain server-only (`SUPABASE_URL`, `SUPABASE_KEY`).
- Keep shadcn-style UI components in `src/components/ui/`; generate new ones with `npx shadcn@latest add <component>`.

<!-- BEGIN @przeprogramowani/10x-cli -->

## 10xDevs AI Toolkit - Module 3, Lesson 4 (E2E Tests)

**For E2E tests, use the `/10x-e2e` skill.** It is the single source of truth
for the workflow — risk → seed test + rules → generate → review against the five
anti-patterns → re-prompt → verify. The skill's `references/` carry the full
rules, anti-patterns, seed pattern, and prompt-template.

A few hard rules that hold even before you invoke the skill:

- **Locators:** `getByRole` / `getByLabel` / `getByText` first; `getByTestId`
  only when accessibility attributes are ambiguous. Never CSS selectors, XPath,
  or DOM structure.
- **Never `page.waitForTimeout()`.** Wait for state: `toBeVisible()`,
  `waitForURL()`, `waitForResponse()`.
- **Test independence + cleanup.** Each test runs standalone — its own setup,
  action, assertion, and cleanup; unique ids (timestamp suffix) so parallel runs
  and re-runs don't collide.

Two boundaries to keep straight:

- **DOM (snapshot) is the default.** Vision (`--caps=vision`) is a supplement for
  visual-only risks (layout, z-index, animation); for pixel regression prefer
  deterministic tools (`toMatchSnapshot`, Argos, Lost Pixel). VLM model
  selection/cost is a debugging topic (Lesson 5), not testing.
- **Healer helps on selectors, harms on logic.** A changed selector → healer
  re-finds it (route through PR review). A changed business behavior → healer
  masks the bug; that failing-test-to-fix case is Lesson 5.

<!-- END @przeprogramowani/10x-cli -->
