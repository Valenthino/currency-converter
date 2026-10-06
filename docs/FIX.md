Independent review (Codex) found 7 defects. Fix ALL of them in this repo. Read `docs/SPEC.md` + `docs/AGENT-CONTEXT.md` for context. Keep Next 16.4 / React 19 / Tailwind v4 conventions, zero new deps, and do not regress the mobile/dark-mode/picker work.

F1 (High) — `src/lib/rates.ts`: UNBOUNDED UPSTREAM REQUESTS.
Concurrent cold requests each fetch upstream independently and a failed refresh never cools down, so an outage amplifies into many upstream calls (20 concurrent cold requests → 20 upstream calls).
Fix: share a single in-flight refresh promise across concurrent callers, and apply a bounded retry cooldown (e.g. 60s) after a failure, serving last-known-good/seed during the cooldown. Verify: 20 concurrent cold requests during a simulated outage produce exactly ONE upstream fetch.

F2 (High) — corrupt preferences crash the app / yield NaN.
`src/lib/storage.ts` validates only primitive types; a stored `selected:["USD","__proto__"]` passes `rates.rates[code]` (inherited property) and `currencyName()` and makes React render an object → React error #31 (full-page error). `"Infinity"` also bypasses the amount sanitizer; unknown bases yield NaN.
Fix: validate + dedupe currency codes with UPPERCASE 3-letter A–Z checks, use OWN-property checks (`Object.hasOwn`) for all rate/name lookups, reconcile saved codes against the codes present in the fetched rates, and sanitize/bound the saved amount to a finite number. Verify: stored `{selected:["USD","__proto__"], base:"USD", amount:"1"}` renders normally with no crash; and `amount:"Infinity"` is neutralised.

F3 (Medium) — `src/lib/rates.ts`: INVALID UPSTREAM PAYLOAD ACCEPTED AS FRESH.
Only `result==="success"` and USD truthiness are checked; `{USD:1,XOF:0,AED:"bad",CAD:-1}` is served as `live`. Bad timestamps become "now".
Fix: before replacing the cache, require `result==="success"`, a USD rate present and finite, ALL rates finite and > 0, the required currencies present (at least USD, CAD, XOF, AED, EUR), and valid parseable timestamps. Otherwise fall back to last-known-good/seed with `stale:true`.

F4 (Medium) — `src/components/Converter.tsx`: DEFAULT VALUES FLASH BEFORE HYDRATION.
Saved `123 CAD` shows `1 USD` then `123 CAD` (FR7 violation).
Fix: render a stable placeholder/skeleton for preference-dependent content until storage has loaded (`hydrated`), so there is no visible swap of default→saved values. Keep SSR output stable (no hydration mismatch).

F5 (Medium) — `src/components/CurrencyPicker.tsx`: SELECTION STATE NOT EXPOSED.
The ✓ is `aria-hidden` and buttons expose no state.
Fix: give each picker row a proper selected state — e.g. `aria-pressed={isSelected}` in manage mode (or an appropriate role/`aria-checked`), with an accessible label describing the add/remove action.

F6 (Medium) — `src/lib/currency.ts` + `Converter.tsx`: REBASING PERMANENTLY ROUNDS THE AMOUNT.
Changing base rounds the stored amount to 6 dp; `0.0001 XOF` → USD stores `"0"` and can't round-trip.
Fix: keep full precision in state (store the value; don't destructively round on rebase) and round only for DISPLAY. Verify `0.0001 XOF → USD → XOF` returns the original (within float tolerance).

F7 (Medium) — `src/components/Converter.tsx`: CHANGING TO AN UNSELECTED BASE BREAKS THE INVARIANT.
Picking CNY as base does not add CNY to `selected`; switching back to USD then leaves no CNY row (inconsistent with the reload path).
Fix: when the base changes, ensure the new base is included in `selected`.

VERIFY (do not skip, report real output):
- `npm run lint` and `npm run build` clean.
- Reproduce EACH fix: F1 with the 20-concurrent-outage test; F2 with the `__proto__` stored-state test (headless browser or node); F3 with the invalid-payload test; F4 with saved-vs-default timing; F6 with the round-trip; F7 by picking an unselected base.
- Serve standalone (`node .next/standalone/server.js`, `public/` + `.next/static` copied in, PORT=3100) and confirm `/api/health` → 200, `/api/rates` → 200.
Do NOT commit. Report files changed, per-finding verification evidence, and anything unverified.
