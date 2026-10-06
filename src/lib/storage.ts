import { sanitizeAmountInput } from "./currency";

export const DEFAULT_BASE = "USD";
export const DEFAULT_SELECTED = ["USD", "CAD", "XOF", "AED", "EUR"];
export const DEFAULT_AMOUNT = "1";

export type StoredState = {
  amount: string;
  base: string;
  selected: string[];
};

const STORAGE_KEY = "currency-converter:v1";
const CODE_RE = /^[A-Z]{3}$/;

function isValidCode(value: unknown): value is string {
  return typeof value === "string" && CODE_RE.test(value);
}

function sanitizeSelected(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter(isValidCode)));
}

function sanitizeAmount(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_AMOUNT;
  const cleaned = sanitizeAmountInput(value);
  return cleaned !== "" && Number.isFinite(parseFloat(cleaned)) ? cleaned : DEFAULT_AMOUNT;
}

export function defaultState(): StoredState {
  return { amount: DEFAULT_AMOUNT, base: DEFAULT_BASE, selected: DEFAULT_SELECTED };
}

export function loadState(): StoredState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    const base = isValidCode(parsed.base) ? parsed.base : DEFAULT_BASE;
    const codes = sanitizeSelected(parsed.selected);
    const selected = codes.length > 0 ? codes : DEFAULT_SELECTED;
    return {
      amount: sanitizeAmount(parsed.amount),
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
