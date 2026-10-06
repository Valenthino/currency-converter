"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { currencyName } from "@/lib/currency";

export function CurrencyPicker({
  open,
  onClose,
  codes,
  selected,
  baseCode,
  onAdd,
  onRemove,
}: {
  open: boolean;
  onClose: () => void;
  codes: string[];
  selected: string[];
  baseCode: string;
  onAdd: (code: string) => void;
  onRemove: (code: string) => void;
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

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className="fixed inset-0 m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--foreground)] [&::backdrop]:bg-black/40"
    >
      <div className="flex max-h-[70vh] flex-col">
        <div className="flex items-center gap-2 border-b border-[var(--border)] p-4">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search code or name"
            aria-label="Search currencies"
            className="w-full bg-transparent text-base outline-none"
          />
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="shrink-0 rounded-full p-2 text-lg leading-none text-muted hover:bg-[var(--surface-hover)]"
          >
            ×
          </button>
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
                  onClick={() => (isSelected ? onRemove(code) : onAdd(code))}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="flex flex-col">
                    <span className="font-medium">{code}</span>
                    <span className="text-xs text-muted">{currencyName(code)}</span>
                  </span>
                  {isSelected && (
                    <span aria-hidden className="text-[var(--accent)]">
                      ✓
                    </span>
                  )}
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
