# Agent working context — currency-converter

Read **`docs/SPEC.md`** first — it is the binding brief. This file is the extra agent context.

## What this is
A personal, no-login multi-currency converter deployed at `http://currency.vavqo.com` on Coolify.
Design north star: **"Make the Apple Calculator currency converter better."** Calm, precise, premium,
hand-crafted. Big legible numbers, generous whitespace, subtle motion, zero clutter.

## Non-negotiables
- No auth, no DB, no server-side user state, no PII, no tracking. Prefs in `localStorage` only.
- Mid-market daily rates from `https://open.er-api.com/v6/latest/USD` (no API key). Never invent rates.
- Do not build saved product/landed-cost comparisons or a manual spread/adjustment field (out of scope).
- Nothing that looks auto-generated (no gradient soup, no purple-on-dark template look, no tables).

## Stack warning (important)
Next.js **16.4**, React 19, Tailwind **v4**. These differ from most training data. **Before writing code,
read the shipped docs in `node_modules/next/dist/docs/`** (App Router content under `01-app`). Use the
generated route types (e.g. `LayoutProps<"/">`). Tailwind v4 theme tokens live in `globals.css` via `@theme`.

## Commands
`npm run dev` · `npm run build` · `npm run start` · `npm run lint` (must be clean)

## Key paths
- `src/app/` — App Router pages, `layout.tsx`, `globals.css`
- `src/app/api/rates/route.ts` — cached, normalised rate endpoint
- `src/app/api/health/route.ts` — `200 {status:"ok"}` for Coolify
- `Dockerfile`, `.dockerignore` at repo root (standalone output, port 3000, memory-bounded)

## Definition of done
`npm run lint` + `npm run build` clean; SPEC.md acceptance criteria met; verify the UI in a browser
(both themes, 360px + desktop). Report changed files, exact commands run, and their real results —
never claim success without having run the build and seen the page.
