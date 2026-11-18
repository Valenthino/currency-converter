import type { RatesPayload } from "@/lib/rates";

// Last good rates payload, kept on the device so the app keeps converting
// offline (and paints instantly on the next open) once rates loaded once.
const KEY = "currency-converter:rates:v1";

function isPayload(value: unknown): value is RatesPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<RatesPayload>;
  if (typeof v.updated_at !== "string" || !v.rates || typeof v.rates !== "object") return false;
  return Object.values(v.rates).every((n) => typeof n === "number" && Number.isFinite(n) && n > 0);
}

export function loadCachedRates(): RatesPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveCachedRates(payload: RatesPayload): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // storage full or blocked — the app still works online
  }
}
