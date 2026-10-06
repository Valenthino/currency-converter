You are implementing a Next.js app in the current working directory (git repo). FIRST read `docs/SPEC.md` (the binding brief) and `docs/AGENT-CONTEXT.md`.

CRITICAL STACK WARNING: This is Next.js 16.4 + React 19 + Tailwind v4. APIs and conventions differ from your training data. Before writing code, read the shipped docs in `node_modules/next/dist/docs/` (App Router content under `01-app/`). Use the generated route types (e.g. `LayoutProps<"/">`). Tailwind v4 theme tokens are defined in `globals.css` via `@theme`.

Design north star: "Make the Apple Calculator currency converter better." Calm, precise, premium, hand-crafted. Big legible numbers, generous whitespace, strong typographic hierarchy, subtle motion, zero clutter. It must NOT look auto-generated (no gradient soup, no purple-on-dark template look, no tables).

Build the full app per the spec:

1. UI (`src/app/page.tsx` + focused components under `src/components/`):
   - A prominent amount input (`inputMode="decimal"`, accepts decimals, strips junk), default `1` or last used.
   - Base-currency selector, default USD.
   - A list of converted rows for the SELECTED currencies; each row shows the converted value (properly formatted) and a unit-rate line (e.g. `1 USD = 585.06 XOF`).
   - Default selected currencies: USD, CAD, XOF, AED, EUR.
   - Add/remove currencies from the FULL set returned by the API (166 codes) via a fast searchable picker (search by code or name).
   - Tap a row to make it the new base; the amount re-bases correctly.
   - `localStorage` persistence (selected list, base, amount), SSR-safe: no flash of wrong content on reload (rehydrate in an effect; render a stable placeholder server-side).
   - Freshness display: "Rates updated <date/time>" plus a clear indicator when serving stale/fallback rates.
   - Currency rows show code + name + a distinguishing symbol/marker (no emoji-led UI, no flag images needed).
   - Number formatting via `Intl.NumberFormat` with correct currency fraction digits (XOF/JPY = 0, USD = 2, …) and a safe decimal fallback for codes Intl does not know.
   - Light + dark via `prefers-color-scheme`; respect `prefers-reduced-motion`; accessible (labels, focus-visible, keyboard operability, `aria-live` on updated values).
   - Mobile-first: excellent at 360px AND on desktop.

2. `src/app/api/rates/route.ts`: server-side fetch of `https://open.er-api.com/v6/latest/USD` with a ~6h in-memory cache AND a last-known-good fallback (so upstream failure never breaks the app). Return a normalised payload: `{ base:"USD", updated_at, next_update_at, source, stale, rates: {CODE:number} }`. Add a small bundled seed snapshot JSON as the absolute last resort.

3. `src/app/api/health/route.ts`: `GET` → `200 {"status":"ok"}`.

4. PWA: web manifest, theme-color, icons; make it installable to a phone home screen.

5. Docker: set `output: 'standalone'` in `next.config.ts`; add a multi-stage `Dockerfile` (`node:22-alpine`, `EXPOSE 3000`, bind `HOSTNAME=0.0.0.0`, `ENV NODE_OPTIONS=--max-old-space-size=1024`) and a matching `.dockerignore` (must not exclude anything the Dockerfile COPYs).

Keep new dependencies minimal (ideally zero added). Ponytail rules apply: minimal diff, YAGNI, no gold-plating beyond the spec.

VERIFY (do not skip):
- Run `npm run lint` and `npm run build` — both must pass clean. Fix failures.
- Start the production server (`npm run build` output, e.g. `npm run start` or `node .next/standalone/server.js`) and curl `/api/health` and `/api/rates` — confirm real 200s and that the rates payload includes XOF, AED, CAD.

Do NOT commit; leave changes in the working tree. Report: files changed, the exact commands you ran with their real results, and anything left unverified.
