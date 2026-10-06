You are doing a focused DESIGN POLISH pass on the existing Next.js converter in this repo. The app works; the design does not yet meet the bar. Read `docs/SPEC.md` (design north star: "Make the Apple Calculator currency converter better") and `docs/AGENT-CONTEXT.md` first. Keep the stack rules (Next 16.4 / React 19 / Tailwind v4 — consult `node_modules/next/dist/docs/` if unsure).

I rendered it: it is competent but reads as a plain dev build, not premium. Fix these concretely — do not just restyle blindly, hit every point:

1. GROUPED CARD SURFACE. Move the converted-currency list into a single rounded card (radius ~16–18px) using `--surface` (white / #1c1c1e dark), sitting on the grey page background, with hairline INSET separators between rows (iOS "grouped table" look). This alone is most of the premium feel.

2. CURRENCY IDENTITY — fix ambiguity. Right now USD and CAD BOTH render "$", and XOF renders the cramped "FCFA", inside uniform circles. Drop the ambiguous circle markers. Lead each row with the ISO code (e.g. `CAD`) in a strong weight (~17px semibold); full name (`Canadian Dollar`) in muted ~13px beneath. This removes every collision.

3. ROW RIGHT SIDE. Converted amount right-aligned, ~17px semibold, `tabular-nums`; unit-rate line (`1 USD = 585.06 XOF`) muted ~12–13px beneath it, also right-aligned. Right column must align cleanly down the whole card.

4. RATE PRECISION. Trim unit rates — max 4 fraction digits, min 2 (so `585.06`, `3.6725`, `1.4256`, `0.8921`), NOT six trailing digits. (Adjust `formatRate` in `src/lib/currency.ts`.)

5. AMOUNT HERO. Make the base currency a tappable pill (code + small chevron, e.g. `USD ⌄`) adjacent to the amount; tapping it opens the picker to change the base — this mirrors the iOS "convert from" affordance. The amount should be a responsive hero: ~text-5xl on 360px up to ~text-7xl on desktop, `tabular-nums`, tight tracking. Show the base symbol subtly.

6. ROW AFFORDANCE. Make tap-to-rebase discoverable: subtle press state (background/active scale) + a faint chevron or "tap to set base" cue on hover/focus. Tasteful, not loud.

7. REMOVE CONTROL. Replace the bare `×` with a refined ghost control (e.g. a small circular minus) that is subtle by default and clearer on hover/focus. Keep a real accessible label.

8. HEADER. Add a compact app header — a restrained title, and the "Rates updated …" line placed deliberately (header or footer), including the stale indicator. Keep it minimal.

9. MOTION. Subtle only: rows gently fade/slide in on first load; converted numbers transition smoothly on change. All motion must be disabled under `prefers-reduced-motion`.

10. PICKER. Make it feel native: full-width bottom sheet on mobile, centered dialog on desktop; search field with a clear focus state; each option shows code + name; indicate already-added currencies; the current base cannot be removed.

Constraints: no new dependencies (keep it zero). Light + dark must both look intentional. Must be excellent at 360px (no overflow) and on desktop (centered, max-w-lg at most). Do not regress the working `/api/rates`, `/api/health`, persistence, or rebasing logic.

VERIFY: `npm run lint` and `npm run build` must pass clean. Then start the standalone production server (`node .next/standalone/server.js` after copying `public/` and `.next/static` in, `HOSTNAME=0.0.0.0 PORT=3100`) and confirm `/api/health` → 200 and `/` → 200. Do NOT commit. Report files changed and the real command results.
