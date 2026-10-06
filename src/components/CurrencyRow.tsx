"use client";

import { currencyName, formatAmount, formatRate } from "@/lib/currency";

export function CurrencyRow({
  code,
  baseCode,
  unitRate,
  converted,
  index,
  onSetBase,
  onRemove,
}: {
  code: string;
  baseCode: string;
  unitRate: number;
  converted: number;
  index: number;
  onSetBase: (code: string) => void;
  onRemove: (code: string) => void;
}) {
  const formatted = formatAmount(converted, code);

  return (
    <li className="animate-row-in relative" style={{ animationDelay: `${index * 40}ms` }}>
      {index > 0 && <div className="absolute left-4 right-0 top-0 border-t border-[var(--border)]" />}
      <div className="flex min-w-0 items-center">
        <button
          type="button"
          onClick={() => onSetBase(code)}
          className="group flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3 text-left transition-[background-color,transform] active:scale-[0.99] hover:bg-[var(--surface-hover)]"
          aria-label={`Make ${code} the base currency`}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span className="flex min-w-0 flex-col">
              <span className="text-[17px] font-semibold">{code}</span>
              <span className="truncate text-[13px] text-muted" title={currencyName(code)}>
                {currencyName(code)}
              </span>
            </span>
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              className="h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-60 group-focus-visible:opacity-60"
            >
              <path
                d="M7 5l5 5-5 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="flex shrink-0 flex-col items-end">
            <span
              key={formatted}
              className="animate-value-in whitespace-nowrap text-[17px] font-semibold tabular-nums"
            >
              {formatted}
            </span>
            <span className="whitespace-nowrap text-[12px] text-muted tabular-nums">
              1 {baseCode} = {formatRate(unitRate)}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => onRemove(code)}
          aria-label={`Remove ${code}`}
          className="mr-3 shrink-0 rounded-full p-1.5 text-muted opacity-40 transition-opacity hover:opacity-100 hover:text-foreground focus-visible:opacity-100"
        >
          <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5">
            <circle cx="10" cy="10" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.3" />
            <path d="M6.5 10h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </li>
  );
}
