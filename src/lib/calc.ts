// Calculator engine: a small, pure state machine behind the keypad.
// Kept dependency-free (no "@/" imports) so it can be unit-tested with plain Node.

export type Op = "+" | "−" | "×" | "÷";

export type CalcState = {
  /** Completed numbers and operators, always ending with an operator when non-empty. */
  tokens: string[];
  /** The number currently being typed ("" = waiting for the next operand). */
  entry: string;
  /** Next digit replaces `entry` instead of appending (after "=", %, or a re-base). */
  replaceEntry: boolean;
  /** The expression that produced the current result, shown after "=". */
  lastExpr: string | null;
};

export type Key =
  | { type: "digit"; value: string } // "0"-"9" or "."
  | { type: "op"; value: Op }
  | { type: "equals" }
  | { type: "percent" }
  | { type: "negate" }
  | { type: "backspace" }
  | { type: "clear" };

const OPS: readonly string[] = ["+", "−", "×", "÷"];
export const MAX_DIGITS = 15;

export function isOp(token: string | undefined): token is Op {
  return token !== undefined && OPS.includes(token);
}

/** Removes float noise (0.1 + 0.2 → "0.3") and never returns exponent notation. */
export function cleanNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (value === 0) return "0";
  const out = new Intl.NumberFormat("en", {
    useGrouping: false,
    maximumSignificantDigits: 12,
  }).format(value);
  return out === "-0" ? "0" : out;
}

export function initialCalc(amount = "0"): CalcState {
  return { tokens: [], entry: amount || "0", replaceEntry: true, lastExpr: null };
}

function digitCount(entry: string): number {
  return entry.replace(/[^0-9]/g, "").length;
}

function normalizeEntry(entry: string): string {
  if (entry === "" || entry === "-" || entry === "-0" || entry === "-0.") return "0";
  return entry.endsWith(".") ? entry.slice(0, -1) : entry;
}

/** Evaluates with × ÷ before + −. Returns null on division by zero / overflow. */
export function evaluateTokens(parts: string[]): number | null {
  const list = [...parts];
  while (list.length > 0 && isOp(list[list.length - 1])) list.pop();
  if (list.length === 0) return 0;

  // First pass: × and ÷
  const terms: (number | Op)[] = [parseFloat(normalizeEntry(list[0]))];
  for (let i = 1; i < list.length; i += 2) {
    const op = list[i] as Op;
    const n = parseFloat(normalizeEntry(list[i + 1]));
    if (op === "×" || op === "÷") {
      const left = terms.pop() as number;
      if (op === "÷" && n === 0) return null;
      terms.push(op === "×" ? left * n : left / n);
    } else {
      terms.push(op, n);
    }
  }
  // Second pass: + and −
  let result = terms[0] as number;
  for (let i = 1; i < terms.length; i += 2) {
    const n = terms[i + 1] as number;
    result = terms[i] === "+" ? result + n : result - n;
  }
  return Number.isFinite(result) ? result : null;
}

/** The live value of everything typed so far (what the converted list shows). */
export function currentValue(s: CalcState): number | null {
  return evaluateTokens(s.entry === "" ? s.tokens : [...s.tokens, s.entry]);
}

/** The operator waiting for its right-hand operand, if any (highlighted on the keypad). */
export function pendingOp(s: CalcState): Op | null {
  const last = s.tokens[s.tokens.length - 1];
  return s.entry === "" && isOp(last) ? last : null;
}

export function press(s: CalcState, key: Key): CalcState {
  switch (key.type) {
    case "clear":
      return initialCalc("0");

    case "digit": {
      const d = key.value;
      if (s.replaceEntry || s.entry === "") {
        const neg = !s.replaceEntry && s.entry.startsWith("-");
        return { ...s, entry: (neg ? "-" : "") + (d === "." ? "0." : d), replaceEntry: false, lastExpr: null };
      }
      if (d === "." && s.entry.includes(".")) return s;
      if (d !== "." && digitCount(s.entry) >= MAX_DIGITS) return s;
      if (d !== "." && (s.entry === "0" || s.entry === "-0")) {
        return { ...s, entry: s.entry.slice(0, -1) + d, lastExpr: null };
      }
      return { ...s, entry: s.entry + d, lastExpr: null };
    }

    case "op": {
      if (s.entry === "") {
        if (s.tokens.length === 0) return { ...s, tokens: ["0", key.value] };
        return { ...s, tokens: [...s.tokens.slice(0, -1), key.value] };
      }
      return {
        tokens: [...s.tokens, normalizeEntry(s.entry), key.value],
        entry: "",
        replaceEntry: false,
        lastExpr: null,
      };
    }

    case "equals": {
      if (s.tokens.length === 0) return { ...s, entry: normalizeEntry(s.entry), replaceEntry: true };
      const parts = s.entry === "" ? s.tokens.slice(0, -1) : [...s.tokens, normalizeEntry(s.entry)];
      const value = evaluateTokens(parts);
      return {
        tokens: [],
        entry: value === null ? "0" : cleanNumber(value),
        replaceEntry: true,
        lastExpr: value === null ? "Can’t divide by 0" : formatExpression(parts) + " =",
      };
    }

    case "percent": {
      if (s.entry === "") return s;
      const cur = parseFloat(normalizeEntry(s.entry));
      const prev = s.tokens[s.tokens.length - 1];
      let value = cur / 100;
      if (prev === "+" || prev === "−") {
        value = (evaluateTokens(s.tokens) ?? 0) * (cur / 100);
      }
      return { ...s, entry: cleanNumber(value), replaceEntry: true, lastExpr: null };
    }

    case "negate": {
      if (s.entry === "") return { ...s, entry: "-0", replaceEntry: false };
      const entry = s.entry.startsWith("-") ? s.entry.slice(1) : "-" + s.entry;
      return { ...s, entry, lastExpr: null };
    }

    case "backspace": {
      if (s.entry !== "") {
        if (s.replaceEntry && s.tokens.length === 0) {
          // After "=", backspace edits the result like typed digits (Apple behaviour).
          const trimmed = s.entry.slice(0, -1);
          return { ...s, entry: trimmed === "" || trimmed === "-" ? "0" : trimmed, replaceEntry: trimmed === "" || trimmed === "-", lastExpr: null };
        }
        const trimmed = s.entry.slice(0, -1);
        if (trimmed === "" || trimmed === "-") {
          return s.tokens.length === 0
            ? { ...s, entry: "0", replaceEntry: true, lastExpr: null }
            : { ...s, entry: "", replaceEntry: false };
        }
        return { ...s, entry: trimmed, replaceEntry: false, lastExpr: null };
      }
      if (s.tokens.length >= 2) {
        // Remove the trailing operator and resume editing the number before it.
        const tokens = s.tokens.slice(0, -2);
        return { ...s, tokens, entry: s.tokens[s.tokens.length - 2], replaceEntry: false };
      }
      return initialCalc("0");
    }
  }
}

/** "1234.5" → "1,234.5", keeping a trailing "." or trailing zeros the user typed. */
export function formatEntry(entry: string): string {
  if (entry === "") return "";
  const neg = entry.startsWith("-");
  const body = neg ? entry.slice(1) : entry;
  const [int, frac] = body.split(".");
  const grouped = (int || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (neg ? "−" : "") + grouped + (frac !== undefined ? "." + frac : "");
}

export function formatExpression(parts: string[]): string {
  return parts.map((p) => (isOp(p) ? p : formatEntry(p))).join(" ");
}

/** The small line above the big number: the expression being typed, or the one just solved. */
export function expressionLine(s: CalcState): string {
  if (s.tokens.length > 0) {
    return formatExpression(s.entry === "" ? s.tokens : [...s.tokens, s.entry]);
  }
  return s.lastExpr ?? "";
}
