export const DEFAULT_BASE = "USD";
export const DEFAULT_SELECTED = ["USD", "CAD", "XOF", "AED", "EUR"];
export const DEFAULT_AMOUNT = "1";

export type StoredState = {
  amount: string;
  base: string;
  selected: string[];
};

const STORAGE_KEY = "currency-converter:v1";

export function defaultState(): StoredState {
  return { amount: DEFAULT_AMOUNT, base: DEFAULT_BASE, selected: DEFAULT_SELECTED };
}

export function loadState(): StoredState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    const selected =
      Array.isArray(parsed.selected) && parsed.selected.length > 0
        ? parsed.selected.filter((c): c is string => typeof c === "string")
        : DEFAULT_SELECTED;
    const base = typeof parsed.base === "string" ? parsed.base : DEFAULT_BASE;
    return {
      amount: typeof parsed.amount === "string" ? parsed.amount : DEFAULT_AMOUNT,
      base,
      selected: selected.includes(base) ? selected : [base, ...selected],
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state: StoredState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable (private browsing quota, etc.) — nothing to persist, nothing to crash
  }
}
