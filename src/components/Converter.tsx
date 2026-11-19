"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RatesPayload } from "@/lib/rates";
import {
  currencyName,
  formatDisplayNumber,
  formatUpdatedAt,
  roundForCurrency,
} from "@/lib/currency";
import {
  cleanNumber,
  currentValue,
  expressionLine,
  formatEntry,
  initialCalc,
  pendingOp,
  press,
  type CalcState,
  type Key,
} from "@/lib/calc";
import { DEFAULT_SELECTED, defaultState, loadState, saveState, type StoredState } from "@/lib/storage";
import { loadCachedRates, saveCachedRates } from "@/lib/rates-cache";
import { CurrencyRow } from "@/components/CurrencyRow";
import { CurrencyPicker } from "@/components/CurrencyPicker";
import { Keypad } from "@/components/Keypad";

const KEYBOARD_MAP: Record<string, Key> = {
  "+": { type: "op", value: "+" },
  "-": { type: "op", value: "−" },
  "*": { type: "op", value: "×" },
  x: { type: "op", value: "×" },
  "/": { type: "op", value: "÷" },
  "=": { type: "equals" },
  Enter: { type: "equals" },
  "%": { type: "percent" },
  Backspace: { type: "backspace" },
  Escape: { type: "clear" },
  Delete: { type: "clear" },
  ",": { type: "digit", value: "." },
  ".": { type: "digit", value: "." },
};

function displaySizeClass(text: string): string {
  const len = text.length;
  if (len <= 7) return "text-[clamp(3rem,16vw,4.75rem)]";
  if (len <= 10) return "text-[clamp(2.4rem,12vw,3.75rem)]";
  if (len <= 14) return "text-[clamp(1.9rem,9vw,2.9rem)]";
  return "text-[clamp(1.5rem,7vw,2.3rem)]";
}

export function Converter() {
  const [state, setState] = useState<StoredState>(defaultState);
  const [calc, setCalc] = useState<CalcState>(() => initialCalc(defaultState().amount));
  const [hydrated, setHydrated] = useState(false);
  const [rates, setRates] = useState<RatesPayload | null>(null);
  const [ratesError, setRatesError] = useState(false);
  const [offline, setOffline] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"manage" | "base">("manage");

  // localStorage isn't readable during SSR, so the saved preferences and the
  // last good rates are restored once after mount (a skeleton covers the gap).
  useEffect(() => {
    const saved = loadState();
    /* eslint-disable react-hooks/set-state-in-effect -- one-time SSR-safe hydration read */
    setState(saved);
    setCalc(initialCalc(saved.amount));
    const cached = loadCachedRates();
    if (cached) setRates(cached);
    setOffline(typeof navigator !== "undefined" && navigator.onLine === false);
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const value = currentValue(calc);

  useEffect(() => {
    if (!hydrated) return;
    saveState({ ...state, amount: value === null ? "0" : cleanNumber(value) });
  }, [hydrated, state, value]);

  const loadRates = useCallback(() => {
    let cancelled = false;
    fetch("/api/rates", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`rates ${res.status}`);
        return res.json() as Promise<RatesPayload>;
      })
      .then((data) => {
        if (cancelled) return;
        setRates(data);
        setRatesError(false);
        // The service worker may have answered from its cache while offline.
        setOffline(navigator.onLine === false);
        saveCachedRates(data);
      })
      .catch(() => {
        if (cancelled) return;
        setRatesError(true);
        setOffline(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => loadRates(), [loadRates]);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    window.addEventListener("online", loadRates);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", loadRates);
      window.removeEventListener("offline", goOffline);
    };
  }, [loadRates]);

  // Reconcile persisted codes against what the rates payload knows about, so a
  // stale/corrupt saved code never reaches formatting as a live selection.
  const [reconciledWith, setReconciledWith] = useState<RatesPayload | null>(null);
  if (hydrated && rates && rates !== reconciledWith) {
    setReconciledWith(rates);
    const known = state.selected.filter((c) => Object.hasOwn(rates.rates, c));
    const baseKnown = Object.hasOwn(rates.rates, state.base);
    if (known.length !== state.selected.length || !baseKnown) {
      const selected = known.length > 0 ? known : DEFAULT_SELECTED;
      setState((s) => {
        const base = baseKnown ? s.base : selected[0];
        return { ...s, base, selected: selected.includes(base) ? selected : [base, ...selected] };
      });
    }
  }

  const handleKey = useCallback((key: Key) => setCalc((c) => press(c, key)), []);

  const handleSetBase = useCallback(
    (code: string) => {
      if (code === state.base) return;
      const selected = state.selected.includes(code) ? state.selected : [...state.selected, code];
      if (rates && Object.hasOwn(rates.rates, code) && Object.hasOwn(rates.rates, state.base)) {
        // Convert the live amount and round it to the new currency's own decimals
        // (XOF 0, USD 2…) — no long tail of digits after switching.
        const converted = (value ?? 0) * (rates.rates[code] / rates.rates[state.base]);
        setCalc(initialCalc(roundForCurrency(converted, code)));
      }
      setState((s) => ({ ...s, base: code, selected }));
    },
    [rates, state.base, state.selected, value],
  );

  const handleAddCurrency = useCallback((code: string) => {
    setState((s) => (s.selected.includes(code) ? s : { ...s, selected: [...s.selected, code] }));
  }, []);

  const handleRemoveCurrency = useCallback((code: string) => {
    setState((s) => (code === s.base ? s : { ...s, selected: s.selected.filter((c) => c !== code) }));
  }, []);

  const openBasePicker = useCallback(() => {
    setPickerMode("base");
    setPickerOpen(true);
  }, []);

  const openManagePicker = useCallback(() => {
    setPickerMode("manage");
    setPickerOpen(true);
  }, []);

  // Physical keyboard support (desktop / iPad with keyboard).
  useEffect(() => {
    if (!hydrated) return;
    function onKeyDown(e: KeyboardEvent) {
      if (pickerOpen || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const key: Key | undefined = /^[0-9]$/.test(e.key) ? { type: "digit", value: e.key } : KEYBOARD_MAP[e.key];
      if (!key) return;
      // Let Enter activate a focused button (row, picker…) rather than hijack it.
      if (e.key === "Enter" && target?.tagName === "BUTTON" && !target.closest("[data-keypad]")) return;
      e.preventDefault();
      handleKey(key);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hydrated, pickerOpen, handleKey]);

  const rows = useMemo(() => {
    if (!rates || !Object.hasOwn(rates.rates, state.base)) return [];
    const baseRate = rates.rates[state.base];
    return state.selected
      .filter((code) => code !== state.base && Object.hasOwn(rates.rates, code))
      .map((code) => {
        const unitRate = rates.rates[code] / baseRate;
        return { code, unitRate, converted: value === null ? null : value * unitRate };
      });
  }, [rates, state.selected, state.base, value]);

  const allCodes = useMemo(() => (rates ? Object.keys(rates.rates).sort() : []), [rates]);

  const display =
    value === null
      ? "Error"
      : calc.tokens.length === 0 && calc.entry !== ""
        ? formatEntry(calc.entry)
        : formatDisplayNumber(value);
  const expr = expressionLine(calc);
  const showingCachedOffline = rates && (offline || ratesError);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-3 pt-2">
        <p className="min-w-0 truncate text-xs text-muted" aria-live="polite">
          {rates ? (
            showingCachedOffline ? (
              <>
                <span className="mr-1.5 inline-block h-1.5 w-1.5 -translate-y-px rounded-full bg-[var(--accent)] align-middle" />
                Offline · rates from {formatUpdatedAt(rates.updated_at)}
              </>
            ) : (
              <>
                Updated {formatUpdatedAt(rates.updated_at)}
                {rates.stale ? " · stale" : ""}
              </>
            )
          ) : ratesError ? (
            "Offline"
          ) : (
            "Loading rates…"
          )}
        </p>
        <button
          type="button"
          onClick={openManagePicker}
          aria-label="Add or remove currencies"
          aria-haspopup="dialog"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-foreground transition-[background-color,transform] hover:bg-[var(--surface-hover)] active:scale-95"
        >
          <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4">
            <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <section
        aria-label="Converted amounts"
        className="mt-3 flex min-h-[64px] flex-1 flex-col overflow-y-auto overscroll-contain rounded-2xl pb-6 [mask-image:linear-gradient(to_bottom,black_calc(100%-28px),transparent)]"
      >
        {!hydrated || (!rates && !ratesError) ? (
          <div className="flex flex-col gap-px overflow-hidden rounded-2xl" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[60px] animate-pulse bg-[var(--surface)]" />
            ))}
          </div>
        ) : !rates ? (
          <p className="py-6 text-center text-sm text-muted">
            Couldn&apos;t load rates. Connect once and they&apos;ll be saved for offline use.
          </p>
        ) : rows.length > 0 ? (
          <ul className="shrink-0 overflow-hidden rounded-2xl bg-[var(--surface)]">
            {rows.map((row, i) => (
              <CurrencyRow
                key={row.code}
                code={row.code}
                baseCode={state.base}
                unitRate={row.unitRate}
                converted={row.converted}
                index={i}
                onSetBase={handleSetBase}
                onRemove={handleRemoveCurrency}
              />
            ))}
          </ul>
        ) : (
          <button
            type="button"
            onClick={openManagePicker}
            className="rounded-2xl border border-dashed border-[var(--border)] py-6 text-sm text-muted"
          >
            Add a currency to convert into
          </button>
        )}
      </section>

      <div className="flex flex-col pb-3 pt-2">
        <p className="h-7 truncate text-right text-[clamp(1.05rem,4.8vw,1.35rem)] tabular-nums text-muted" aria-hidden>
          {expr}
        </p>
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => rows[0] && handleSetBase(rows[0].code)}
            disabled={!rows[0]}
            aria-label={rows[0] ? `Swap ${state.base} with ${rows[0].code}` : "Swap currencies"}
            className="mb-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--accent)] transition-transform active:scale-90 disabled:opacity-30"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6">
              <path
                d="M7 20V4M3 8l4-4 4 4M17 4v16M13 16l4 4 4-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {hydrated ? (
            <output
              aria-live="polite"
              aria-label={`${display} ${currencyName(state.base)}`}
              className={`min-w-0 flex-1 truncate text-right font-light leading-none tracking-tight tabular-nums ${displaySizeClass(display)}`}
            >
              {display}
            </output>
          ) : (
            <div className="ml-auto h-[clamp(3rem,16vw,4.75rem)] w-1/2 animate-pulse rounded-xl bg-[var(--surface)]" aria-hidden />
          )}
          <button
            type="button"
            onClick={openBasePicker}
            aria-haspopup="dialog"
            aria-label={`Base currency ${state.base}. Change`}
            className="mb-1.5 flex shrink-0 items-center gap-0.5 rounded-lg px-1 py-1 text-[clamp(1.05rem,4.6vw,1.3rem)] text-muted transition-colors hover:text-foreground"
          >
            {hydrated ? state.base : "···"}
            <svg aria-hidden viewBox="0 0 12 20" className="h-[1.1em] w-auto">
              <path
                d="M2.5 7.5L6 4l3.5 3.5M2.5 12.5L6 16l3.5-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div data-keypad className="pb-[max(12px,env(safe-area-inset-bottom))]">
        <Keypad onKey={handleKey} activeOp={pendingOp(calc)} />
      </div>

      <CurrencyPicker
        open={pickerOpen}
        mode={pickerMode}
        onClose={() => setPickerOpen(false)}
        codes={allCodes}
        selected={state.selected}
        baseCode={state.base}
        onAdd={handleAddCurrency}
        onRemove={handleRemoveCurrency}
        onSetBase={handleSetBase}
      />
    </div>
  );
}
