"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RatesPayload } from "@/lib/rates";
import {
  currencyMarker,
  currencyName,
  formatAmountDisplay,
  formatUpdatedAt,
  sanitizeAmountInput,
  trimToPlainNumber,
} from "@/lib/currency";
import { defaultState, loadState, saveState, type StoredState } from "@/lib/storage";
import { CurrencyRow } from "@/components/CurrencyRow";
import { CurrencyPicker } from "@/components/CurrencyPicker";

export function Converter() {
  const [state, setState] = useState<StoredState>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const [rates, setRates] = useState<RatesPayload | null>(null);
  const [ratesError, setRatesError] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"manage" | "base">("manage");
  const [amountFocused, setAmountFocused] = useState(false);

  // Server + first client paint render the default state, so this rehydration
  // can never cause a visible flash of previously-saved values. localStorage
  // isn't readable during SSR/render, so an effect is the only place this can run.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time SSR-safe hydration read, not a derivable value
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveState(state);
  }, [hydrated, state]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/rates")
      .then((res) => {
        if (!res.ok) throw new Error(`rates ${res.status}`);
        return res.json() as Promise<RatesPayload>;
      })
      .then((data) => {
        if (!cancelled) setRates(data);
      })
      .catch(() => {
        if (!cancelled) setRatesError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const amountValue = parseFloat(state.amount) || 0;

  const handleAmountChange = useCallback((raw: string) => {
    setState((s) => ({ ...s, amount: sanitizeAmountInput(raw) }));
  }, []);

  const handleSetBase = useCallback(
    (code: string) => {
      setState((s) => {
        if (code === s.base) return s;
        if (!rates) return { ...s, base: code };
        const rate = rates.rates[code] / rates.rates[s.base];
        const current = parseFloat(s.amount) || 0;
        return { ...s, base: code, amount: trimToPlainNumber(current * rate) };
      });
    },
    [rates],
  );

  const handleAddCurrency = useCallback((code: string) => {
    setState((s) => (s.selected.includes(code) ? s : { ...s, selected: [...s.selected, code] }));
  }, []);

  const handleRemoveCurrency = useCallback((code: string) => {
    setState((s) => {
      if (code === s.base) return s;
      return { ...s, selected: s.selected.filter((c) => c !== code) };
    });
  }, []);

  const openBasePicker = useCallback(() => {
    setPickerMode("base");
    setPickerOpen(true);
  }, []);

  const openManagePicker = useCallback(() => {
    setPickerMode("manage");
    setPickerOpen(true);
  }, []);

  const rows = useMemo(() => {
    if (!rates) return [];
    return state.selected
      .filter((code) => code !== state.base && rates.rates[code] != null)
      .map((code) => {
        const unitRate = rates.rates[code] / rates.rates[state.base];
        return { code, unitRate, converted: amountValue * unitRate };
      });
  }, [rates, state.selected, state.base, amountValue]);

  const allCodes = useMemo(() => (rates ? Object.keys(rates.rates).sort() : []), [rates]);

  return (
    <div className="flex flex-1 flex-col gap-8">
      <header className="flex flex-col gap-5">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-sm font-semibold tracking-wide text-muted">Currency</h1>
          {rates && (
            <p className="text-right text-xs text-muted">
              Updated {formatUpdatedAt(rates.updated_at)}
              {rates.stale ? " · stale" : ""}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={openBasePicker}
            aria-haspopup="dialog"
            className="inline-flex w-fit items-center gap-1 rounded-full bg-[var(--surface)] px-3 py-1.5 text-sm font-semibold transition-[background-color,transform] active:scale-[0.97] hover:bg-[var(--surface-hover)]"
          >
            {state.base}
            <svg aria-hidden viewBox="0 0 20 20" className="h-3 w-3 text-muted">
              <path
                d="M5 7l5 5 5-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className="flex min-w-0 items-baseline gap-2">
            <span className="shrink-0 text-xl font-medium text-muted sm:text-2xl" aria-hidden>
              {currencyMarker(state.base)}
            </span>
            <input
              id="amount"
              inputMode="decimal"
              autoComplete="off"
              aria-label={`Amount in ${currencyName(state.base)}`}
              value={amountFocused ? state.amount : formatAmountDisplay(state.amount)}
              onChange={(e) => handleAmountChange(e.target.value)}
              onFocus={() => setAmountFocused(true)}
              onBlur={() => setAmountFocused(false)}
              className="min-w-0 flex-1 bg-transparent text-[clamp(1.6rem,8.5vw,4.5rem)] font-semibold tabular-nums tracking-tight outline-none"
            />
          </div>
        </div>
      </header>

      <section aria-label="Converted amounts" className="flex flex-col">
        {!rates && !ratesError && (
          <p className="py-8 text-center text-sm text-muted">Loading rates…</p>
        )}
        {ratesError && !rates && (
          <p className="py-8 text-center text-sm text-muted">
            Couldn&apos;t load rates. Check your connection and reload.
          </p>
        )}
        {rates && rows.length > 0 && (
          <ul
            aria-live="polite"
            className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
          >
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
        )}
      </section>

      <button
        type="button"
        onClick={openManagePicker}
        className="rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-medium text-muted transition-colors hover:bg-[var(--surface-hover)]"
      >
        Add currency
      </button>

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
