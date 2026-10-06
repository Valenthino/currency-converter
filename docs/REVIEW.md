You are performing an INDEPENDENT CODE REVIEW + verification of the Next.js app in this repo (cwd). Read `docs/SPEC.md` and `docs/AGENT-CONTEXT.md` for the binding brief. Do NOT rewrite the app — review it.

Your job (be adversarial; find real problems, don't rubber-stamp):

1. CORRECTNESS of the currency math. The app fetches a single USD-based rate table and computes cross-rates as `rates[to] / rates[from]`. Re-derive this independently and check: converting USD->XOF and XOF->USD round-trips; rebasing the amount on row-tap is arithmetically correct; no divide-by-zero or NaN paths; unknown/missing codes handled.

2. API layer (`src/lib/rates.ts`, `src/app/api/rates/route.ts`): confirm the 6h cache, the last-known-good fallback, the seed fallback, and the `stale` flag actually work. Identify any state-leak across requests or wrong-TTL bug. Confirm the upstream payload is validated (result==="success").

3. SSR/hydration + persistence (`src/components/Converter.tsx`, `src/lib/storage.ts`): confirm there is NO hydration mismatch / wrong-content flash, that localStorage load/save is SSR-safe, and that a corrupt/partial stored value cannot crash the app.

4. Security & hygiene: no secrets, no PII, no user accounts; the API route must not be abusable (e.g. unbounded upstream amplification); input sanitization actually constrains the amount.

5. Accessibility: labels, keyboard operability, focus-visible, `aria-live` correctness, dialog/sheet focus trapping and Escape-to-close in the picker.

Then INDEPENDENTLY VERIFY by running it yourself:
- `npm run lint` and `npm run build` (both must pass).
- Start the standalone server (`node .next/standalone/server.js` after copying `public/` and `.next/static` into `.next/standalone`, `HOSTNAME=0.0.0.0 PORT=3200`) and curl `/api/health` and `/api/rates` — report the REAL status codes and confirm the payload contains XOF, AED, CAD. Stop the server afterwards.

Output: a prioritized list of findings (each: severity, file:line, the concrete problem, and the suggested fix), plus a short verdict (ship / fix-first) and the exact commands you ran with their real results. Do NOT commit. If you find nothing material in a category, say so explicitly.
