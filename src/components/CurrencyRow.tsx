"use client";

import { currencyMarker, currencyName, formatAmount, formatRate } from "@/lib/currency";

export function CurrencyRow({
  code,
  baseCode,
  unitRate,
  converted,
  onSetBase,
  onRemove,
}: {
  code: string;
  baseCode: string;
  unitRate: number;
  converted: number;
  onSetBase: (code: string) => void;
  onRemove: (code: string) => void;
}) {
  return (
    <li className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onSetBase(code)}
        className="flex flex-1 items-center justify-between gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-[var(--surface-hover)]"
        aria-label={`Make ${code} the base currency`}
      >
        <span className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-sm font-medium"
            aria-hidden
          >
            {currencyMarker(code)}
          </span>
          <span className="flex flex-col">
            <span className="font-medium">{code}</span>
            <span className="text-xs text-muted">{currencyName(code)}</span>
          </span>
        </span>
        <span className="flex flex-col items-end">
          <span className="text-lg font-semibold tabular-nums">
            {formatAmount(converted, code)}
          </span>
          <span className="text-xs text-muted tabular-nums">
            1 {baseCode} = {formatRate(unitRate)} {code}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => onRemove(code)}
        aria-label={`Remove ${code}`}
        className="shrink-0 rounded-full p-2 text-lg leading-none text-muted transition-colors hover:bg-[var(--surface-hover)] hover:text-foreground"
      >
        ×
      </button>
    </li>
  );
}
