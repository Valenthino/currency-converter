"use client";

import type { Key, Op } from "@/lib/calc";

type KeyDef = {
  label: React.ReactNode;
  aria: string;
  key: Key;
  kind: "digit" | "fn" | "op" | "eq";
};

const BackspaceIcon = (
  <svg aria-hidden viewBox="0 0 28 20" className="h-[0.9em] w-auto">
    <path
      d="M9 2h15a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9L2 10z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path d="M13 6.5l7 7M20 6.5l-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const op = (value: Op, aria: string): KeyDef => ({ label: value, aria, key: { type: "op", value }, kind: "op" });
const digit = (value: string): KeyDef => ({
  label: value,
  aria: value === "." ? "Decimal point" : value,
  key: { type: "digit", value },
  kind: "digit",
});

const KEYS: KeyDef[] = [
  { label: BackspaceIcon, aria: "Delete", key: { type: "backspace" }, kind: "fn" },
  { label: "AC", aria: "All clear", key: { type: "clear" }, kind: "fn" },
  { label: "%", aria: "Percent", key: { type: "percent" }, kind: "fn" },
  op("÷", "Divide"),
  digit("7"), digit("8"), digit("9"), op("×", "Multiply"),
  digit("4"), digit("5"), digit("6"), op("−", "Subtract"),
  digit("1"), digit("2"), digit("3"), op("+", "Add"),
  { label: "+/−", aria: "Change sign", key: { type: "negate" }, kind: "digit" },
  digit("0"),
  digit("."),
  { label: "=", aria: "Equals", key: { type: "equals" }, kind: "eq" },
];

const KIND_CLASS: Record<KeyDef["kind"], string> = {
  digit: "bg-[var(--key-digit)] text-[var(--key-digit-fg)]",
  fn: "bg-[var(--key-fn)] text-[var(--key-fn-fg)]",
  op: "bg-[var(--key-op)] text-[var(--key-op-fg)]",
  eq: "bg-[var(--key-eq)] text-[var(--key-eq-fg)]",
};

export function Keypad({ onKey, activeOp }: { onKey: (key: Key) => void; activeOp: Op | null }) {
  return (
    <div role="group" aria-label="Calculator keypad" className="grid grid-cols-4 gap-[clamp(8px,2.6vw,14px)]">
      {KEYS.map((k) => {
        const active = k.key.type === "op" && k.key.value === activeOp;
        return (
          <button
            key={k.aria}
            type="button"
            aria-label={k.aria}
            aria-pressed={k.key.type === "op" ? active : undefined}
            onClick={() => onKey(k.key)}
            className={`keypad-key flex h-[var(--key-h)] select-none items-center justify-center rounded-full text-[clamp(1.5rem,7vw,2.1rem)] font-normal tabular-nums transition-[background-color,color,filter,transform] duration-150 active:scale-[0.96] active:brightness-125 ${
              active ? "bg-[var(--key-eq)] text-[var(--key-eq-fg)]" : KIND_CLASS[k.kind]
            } ${k.kind === "fn" && typeof k.label === "string" && k.label.length > 1 ? "text-[clamp(1.25rem,5.6vw,1.75rem)]" : ""}`}
          >
            {k.label}
          </button>
        );
      })}
    </div>
  );
}
