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

/** How many decimals a currency normally uses (USD 2, XOF/JPY 0, KWD 3). */
export function fractionDigits(code: string): number {
  try {
    return (
      new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions()
        .maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

/** True when a non-zero value would round to 0 at the currency's normal precision (e.g. 1 XOF in USD). */
function belowSmallestUnit(value: number, digits: number): boolean {
  return value !== 0 && Math.abs(value) < 0.5 * 10 ** -digits;
}

/** Converted-value formatting with each currency's correct fraction digits. */
export function formatAmount(value: number, code: string): string {
  const digits = fractionDigits(code);
  const tiny = belowSmallestUnit(value, digits);
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
      ...(tiny ? { maximumSignificantDigits: 2 } : {}),
    }).format(value);
  } catch {
    return `${value.toLocaleString("en", tiny ? { maximumSignificantDigits: 2 } : {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${code}`;
  }
}

/**
 * The amount to carry over when a currency becomes the new base: rounded to
 * that currency's normal decimals (41.8392817… XOF → "42", 0.0713… USD → "0.07"),
 * so switching never leaves a long tail of decimals. Values smaller than the
 * currency's smallest unit keep two significant digits instead of becoming 0.
 */
export function roundForCurrency(value: number, code: string): string {
  if (!Number.isFinite(value) || value === 0) return "0";
  const digits = fractionDigits(code);
  const out = new Intl.NumberFormat("en", {
    useGrouping: false,
    ...(belowSmallestUnit(value, digits)
      ? { maximumSignificantDigits: 2 }
      : { maximumFractionDigits: digits }),
  }).format(value);
  return out === "-0" ? "0" : out;
}

/** The big display number: grouped, at most 10 decimals, no float noise. */
export function formatDisplayNumber(value: number): string {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 10,
    maximumSignificantDigits: 12,
    roundingPriority: "lessPrecision",
  } as Intl.NumberFormatOptions)
    .format(value)
    .replace("-", "−");
}

/** Unit-rate formatting, e.g. the "585.06" in "1 USD = 585.06 XOF". */
export function formatRate(value: number): string {
  if (value !== 0 && Math.abs(value) < 0.01) {
    return new Intl.NumberFormat("en", { maximumSignificantDigits: 3 }).format(value);
  }
  return new Intl.NumberFormat("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

const MAX_AMOUNT_LENGTH = 15;

/** Keeps a stored amount to an optional leading "-", digits and a single decimal point. */
export function sanitizeAmountInput(raw: string): string {
  const negative = raw.trim().startsWith("-");
  let cleaned = raw.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replaceAll(".", "");
  }
  return (negative ? "-" : "") + cleaned.slice(0, MAX_AMOUNT_LENGTH);
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
