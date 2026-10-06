# Currency Converter — Specification

**Owner:** Thino (Valentin Sawadogo) · **Repo:** `Valenthino/currency-converter` · **Deploy:** `http://currency.vavqo.com` (Coolify, server `localhost` 10.94.10.29)

## 1. Goal & design north star

A personal, no-login multi-currency converter. The single design target, in the owner's words:

> **"Make the Apple Calculator currency converter better."**

That means: a calm, precise, premium feel. Big legible numbers, generous whitespace, strong
typographic hierarchy, exact optical alignment, tactile and *subtle* motion, and zero clutter.
It must look hand-crafted and intentional — **not** like a generic AI-generated dashboard.
The owner is a former photographer: craft and finish matter in everything.

Explicitly avoid: gradient soup, drop-shadow stacks, emoji-led UI, busy borders, purple-on-dark
"AI startup" defaults, tables, or anything that reads as a bootstrap demo.

## 2. Non-goals (do NOT build)

- **No login, no accounts, no database, no server-side user state.** Preferences live in `localStorage`.
- **No saved product/landed-cost comparisons** (buy-in-Dubai / sell-in-Wagadu) — that is a deliberate Phase 2.
- **No manual rate adjustment / spread field** — mid-market daily rates only.
- No analytics, no tracking, no PII stored, no third-party embeds.

## 3. Functional requirements (MVP)

- **FR1 — Amount input.** One prominent numeric amount field. Mobile-friendly numeric keypad
  (`inputMode="decimal"`), accepts decimals, rejects/strips junk, sane max length. Default `1` (or last used).
- **FR2 — Base currency selector.** Choose which currency the amount is expressed in. Default **USD**.
- **FR3 — Converted list.** Show the amount converted into every *selected* currency, each row showing:
  the converted value (properly formatted) and the unit rate line (e.g. `1 USD = 585.06 XOF`).
- **FR4 — Default selected currencies:** `USD, CAD, XOF, AED, EUR` (this is the owner's 5+ set:
  US / Canada / West African CFA / UAE dirham / euro).
- **FR5 — Add/remove currencies** from the full set returned by the API (166 codes). Discoverable,
  fast picker (search by code or name). Removing is easy; re-adding easier.
- **FR6 — Set base by tapping a row** (tap any converted currency to make it the new base) — the
  single best interaction detail of the Apple version.
- **FR7 — Persistence (per device, `localStorage`):** selected currency list, base currency, and last
  amount. Must rehydrate cleanly on reload with no flash of wrong content (SSR-safe).
- **FR8 — Freshness display:** show when rates were last updated (e.g. `Rates updated 6 Oct, 00:02 UTC`),
  and a clear state if serving stale/fallback rates.
- **FR9 — Currency identity:** show code + name + a distinguishing symbol/flag-free marker. Numbers
  formatted via `Intl.NumberFormat` with the correct currency fraction digits (XOF/JPY = 0, USD = 2 …),
  with a safe fallback for codes `Intl` does not know.
- **FR10 — Installable PWA:** web manifest + icons + theme-color so it can be added to the phone home
  screen. (Service-worker offline shell is a stretch goal — only if it stays simple and robust.)

## 4. Rates: source, caching, resilience

- **Source:** `https://open.er-api.com/v6/latest/USD` — free, **no API key**, ~166 currencies, refreshes
  once per day (00:00 UTC). Verified live to include `XOF`, `AED`, `CAD`, plus `EUR/GBP/CNY/NGN/GHS/LRD`.
  Response fields: `result`, `time_last_update_utc`, `time_next_update_utc`, `rates{CODE: number}`.
- **Fetch once, compute cross-rates:** server fetches the single USD-based table and caches it.
  Client cross-rate = `rates[to] / rates[from]`. One cached fetch serves every base/currency.
- **Cache:** in-memory with ~6h TTL, plus **last-known-good fallback** so a failed upstream never breaks
  the app (serve stale with a flag). Bundled seed snapshot as the absolute last resort.
- **Server endpoint:** `GET /api/rates` → `{ base: "USD", updated_at, next_update_at, source, stale, rates: {…} }`.
- **Health endpoint:** `GET /api/health` → `200 {status:"ok"}` (used by Coolify's health check).
- Do **not** expose the upstream raw response unmodified if it contains anything unexpected; normalise.

## 5. Tech & constraints

- **Next.js 16.4 App Router + React 19 + TypeScript + Tailwind v4.** Already scaffolded.
  ⚠️ This Next version has breaking changes vs. most training data — **read `node_modules/next/dist/docs/`
  before writing code** (App Router guides live under `01-app`). Note generated types like `LayoutProps<"/">`.
- Tailwind v4: theme via `@theme` in `globals.css`; no `tailwind.config.js` unless required.
- Server components by default; client components only where interactivity/`localStorage` needs it.
- Respect `prefers-color-scheme` (light + dark) and `prefers-reduced-motion`.
- Mobile-first; must be excellent at 360px wide and on desktop.
- Accessible: labels, focus-visible states, keyboard operability, `aria-live` for updated values.
- No new runtime dependencies unless clearly justified (aim: zero or near-zero added deps).
- TypeScript strict; `npm run lint` and `npm run build` must pass clean.

## 6. Deployment

- Multi-stage **Dockerfile**, Next `output: "standalone"`, `node:22-alpine`, `EXPOSE 3000`,
  bind `0.0.0.0`, and `ENV NODE_OPTIONS=--max-old-space-size=1024` (Coolify host is memory-tight).
- `.dockerignore` must not exclude anything the Dockerfile `COPY`s.
- Coolify: build pack = Dockerfile; domain `http://currency.vavqo.com` (tunnel terminator is Traefik on
  port 80 — **`https://` domain causes an infinite redirect loop**); `health_check_host=127.0.0.1`;
  health path `/api/health`; port `3000`.

## 7. Acceptance criteria

1. `npm run build` succeeds locally; `npm run lint` clean.
2. `/api/rates` returns a normalised payload incl. XOF/AED/CAD and an `updated_at`.
3. `/api/health` returns 200.
4. On load: amount `100`, base USD, rows for USD/CAD/XOF/AED/EUR with correct converted values and
   unit-rate lines. Changing the amount updates all rows instantly.
5. Adding a currency (e.g. CNY) and removing one both work; selection survives a reload.
6. Tapping a row sets it as the new base; the amount re-bases correctly.
7. Light + dark mode both look intentional; reduced-motion respected.
8. Layout is excellent at 360px and at desktop widths.
9. Deployed at `http://currency.vavqo.com` serving the new UI; Coolify health check green.
10. No secrets, no PII, no accounts anywhere in the codebase.
