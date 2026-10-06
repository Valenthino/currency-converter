"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { currencyName } from "@/lib/currency";

export function CurrencyPicker({
  open,
  onClose,
  codes,
  selected,
  baseCode,
  mode = "manage",
  onAdd,
  onRemove,
  onSetBase,
}: {
  open: boolean;
  onClose: () => void;
  codes: string[];
  selected: string[];
  baseCode: string;
  mode?: "manage" | "base";
  onAdd: (code: string) => void;
  onRemove: (code: string) => void;
  onSetBase?: (code: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [prevOpen, setPrevOpen] = useState(open);

  // Reset the search on each open — derived during render (not an effect) per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setQuery("");
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return codes;
    return codes.filter(
      (code) => code.toLowerCase().includes(q) || currencyName(code).toLowerCase().includes(q),
    );
  }, [codes, query]);

  const title = mode === "base" ? "Change base currency" : "Add currency";

  function handlePick(code: string) {
    if (code === baseCode) return;
    if (mode === "base") {
      onSetBase?.(code);
      dialogRef.current?.close();
      return;
    }
    if (selected.includes(code)) onRemove(code);
    else onAdd(code);
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      aria-label={title}
      className="fixed inset-x-0 bottom-0 m-0 w-full max-h-[85vh] rounded-t-2xl rounded-b-none border border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--foreground)] [&::backdrop]:bg-black/40 sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[70vh] sm:w-[min(28rem,calc(100vw-2rem))] sm:rounded-2xl"
    >
      <div className="flex max-h-[85vh] flex-col sm:max-h-[70vh]">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="shrink-0 rounded-full p-1.5 text-muted transition-colors hover:bg-[var(--surface-hover)] hover:text-foreground"
          >
            <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="border-b border-[var(--border)] p-3">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search code or name"
            aria-label="Search currencies"
            className="w-full rounded-xl bg-[var(--surface-hover)] px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          />
        </div>
        <ul className="overflow-y-auto">
          {results.map((code) => {
            const isSelected = selected.includes(code);
            const isBase = code === baseCode;
            return (
              <li key={code}>
                <button
                  type="button"
                  disabled={isBase}
                  onClick={() => handlePick(code)}
                  aria-pressed={mode === "manage" && !isBase ? isSelected : undefined}
                  aria-label={
                    isBase
                      ? `${currencyName(code)} (current base)`
                      : mode === "base"
                        ? `Set ${currencyName(code)} as base currency`
                        : isSelected
                          ? `Remove ${currencyName(code)} from selected currencies`
                          : `Add ${currencyName(code)} to selected currencies`
                  }
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="flex flex-col">
                    <span className="text-[15px] font-medium">{code}</span>
                    <span className="text-xs text-muted">{currencyName(code)}</span>
                  </span>
                  {isBase ? (
                    <span className="text-xs font-medium text-muted">Base</span>
                  ) : isSelected ? (
                    <span aria-hidden className="text-[var(--accent)]">
                      ✓
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
          {results.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted">No matches</li>
          )}
        </ul>
      </div>
    </dialog>
  );
}
