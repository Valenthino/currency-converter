"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RatesPayload } from "@/lib/rates";
import {
  currencyMarker,
  currencyName,
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
      <header className="flex flex-col gap-1">
        <label htmlFor="amount" className="text-sm font-medium text-muted">
          Amount in {currencyName(state.base)}
        </label>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-semibold text-muted" aria-hidden>
            {currencyMarker(state.base)}
          </span>
          <input
            id="amount"
            inputMode="decimal"
            autoComplete="off"
            value={state.amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="w-full bg-transparent text-6xl font-semibold tabular-nums tracking-tight outline-none"
          />
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
        <ul className="flex flex-col divide-y divide-[var(--border)]" aria-live="polite">
          {rows.map((row) => (
            <CurrencyRow
              key={row.code}
              code={row.code}
              baseCode={state.base}
              unitRate={row.unitRate}
              converted={row.converted}
              onSetBase={handleSetBase}
              onRemove={handleRemoveCurrency}
            />
          ))}
        </ul>
      </section>

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-medium text-muted transition-colors hover:bg-[var(--surface-hover)]"
      >
        Add currency
      </button>

      <footer className="mt-auto pt-6 text-center text-xs text-muted">
        {rates && (
          <p>
            Rates updated {formatUpdatedAt(rates.updated_at)}
            {rates.stale ? " · showing last known rates" : ""}
          </p>
        )}
      </footer>

      <CurrencyPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        codes={allCodes}
        selected={state.selected}
        baseCode={state.base}
        onAdd={handleAddCurrency}
        onRemove={handleRemoveCurrency}
      />
    </div>
  );
}
