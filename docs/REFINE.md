Final refinement pass — MOBILE LAYOUT FIXES. The app works and looks good on desktop and in dark mode. Two real defects remain on narrow screens (I rendered it at 360px and 390px):

1. HERO AMOUNT OVERFLOWS / JAMS THE EDGE.
   With base XOF and amount `58506.4114`, the hero number runs to within a few px of the right edge at 360px and will overflow with any longer value. Fix so it can NEVER overflow horizontally, even with 8+ integer digits and decimals:
   - Give the amount row `min-w-0` and let the input shrink; use a responsive size that scales down on small viewports (e.g. a clamp such as `text-[clamp(2rem,12vw,4.5rem)]`, or explicit small sizes at 360px).
   - Never let the input force the page wider (no horizontal scroll at 360px).
   - Improve readability: show thousands separators for the amount when the field is NOT focused (e.g. `58,506.41`), and show the raw, unformatted editable string while the user is typing. Don't fight the user's caret.

2. ROW RATE LINE WRAPS.
   At 360/390px the unit-rate line wraps onto two lines — e.g. `1 XOF = 0.0063` then `AED` alone, and `1 XOF = 0.0063` / `CAD`. Fix:
   - The row already shows the target code, so DROP the redundant trailing code from the rate line: render `1 XOF = 0.0063`, not `1 XOF = 0.0063 AED`.
   - Add `whitespace-nowrap` to both the converted amount and the rate line so neither wraps.
   - Trim the rate to at most 4 significant decimals (already `formatRate` — keep it, just ensure the common case is short).

3. TIDY LONG NAMES.
   `United Arab Emirates Dirham` wraps to two lines at 360px. Truncate the currency NAME to a single line with an ellipsis on narrow widths (`truncate` / `line-clamp-1`); keep the full name accessible via a `title` attribute and the `aria-label` already on the row button.

Constraints: keep zero new deps. Do not regress light/dark, the picker, persistence, rebasing, `/api/rates`, or `/api/health`. Keep `npm run lint` + `npm run build` clean.

VERIFY: build clean, then serve standalone (`node .next/standalone/server.js` with `public/` and `.next/static` copied into `.next/standalone`, PORT=3100) and confirm `/api/health` → 200 and `/` → 200. Also confirm the amount input cannot cause horizontal overflow (check the page's `document.scrollWidth <= window.innerWidth` at 360px if you can). Do NOT commit. Report files changed and real command results.
