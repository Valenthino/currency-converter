// Currency identity + formatting helpers built on Intl, which already knows
// fraction digits, symbols, and display names per currency — no static table to maintain.

// Informal/unofficial codes the upstream API returns that Intl doesn't recognise.
const NAME_OVERRIDES: Record<string, string> = {
  FOK: "Falkland Islands Pound",
  GGP: "Guernsey Pound",
  IMP: "Isle of Man Pound",
  JEP: "Jersey Pound",
  KID: "Kiribati Dollar",
  TVD: "Tuvaluan Dollar",
};

let displayNames: Intl.DisplayNames | undefined;
function getDisplayNames(): Intl.DisplayNames {
  displayNames ??= new Intl.DisplayNames(["en"], { type: "currency" });
  return displayNames;
}

export function currencyName(code: string): string {
  if (Object.hasOwn(NAME_OVERRIDES, code)) return NAME_OVERRIDES[code];
  try {
    const name = getDisplayNames().of(code);
    return name && name !== code ? name : code;
  } catch {
    return code;
  }
}

/** A short, non-emoji glyph for a currency (symbol where Intl has one, else the code). */
export function currencyMarker(code: string): string {
  try {
    const parts = new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(1);
    const symbol = parts.find((p) => p.type === "currency")?.value;
    return symbol && symbol !== code ? symbol : code;
  } catch {
    return code;
  }
}

/** Converted-value formatting with each currency's correct fraction digits. */
export function formatAmount(value: number, code: string): string {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
    }).format(value);
  } catch {
    return `${value.toLocaleString("en", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${code}`;
  }
}

/** Unit-rate formatting, e.g. the "585.06" in "1 USD = 585.06 XOF". */
export function formatRate(value: number): string {
  return new Intl.NumberFormat("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

/** Thousands-grouped display for the hero amount while not focused, e.g. "58,506.41". */
export function formatAmountDisplay(raw: string): string {
  const value = parseFloat(raw);
  if (!Number.isFinite(value)) return raw;
  return value.toLocaleString("en", { maximumFractionDigits: 2 });
}

/**
 * Full-precision plain decimal string for an amount re-based after a tap
 * (e.g. "0.00000017092"). Rebasing must not destructively round the stored
 * amount — only display formatting rounds; this keeps round-trips (A→B→A)
 * accurate for tiny amounts in high-ratio currency pairs.
 */
export function toPlainDecimalString(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "0";
  const trimmed = value.toFixed(20).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  return trimmed === "" || trimmed === "-" ? "0" : trimmed;
}

const MAX_AMOUNT_LENGTH = 15;

/** Keeps the amount input to digits + a single decimal point, mobile-keypad friendly. */
export function sanitizeAmountInput(raw: string): string {
  let cleaned = raw.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replaceAll(".", "");
  }
  return cleaned.slice(0, MAX_AMOUNT_LENGTH);
}

export function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";
  return (
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }).format(date) + " UTC"
  );
}
