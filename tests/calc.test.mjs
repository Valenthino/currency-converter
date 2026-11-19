import { test } from "node:test";
import assert from "node:assert/strict";
import { initialCalc, press, currentValue, expressionLine, cleanNumber, pendingOp } from "../src/lib/calc.ts";

const D = (v) => ({ type: "digit", value: v });
const O = (v) => ({ type: "op", value: v });
function run(keys, start = initialCalc("0")) {
  return keys.reduce((s, k) => press(s, k), start);
}
function typed(str, start) {
  const map = { "+": O("+"), "-": O("−"), "*": O("×"), "/": O("÷"), "=": { type: "equals" }, "%": { type: "percent" }, "n": { type: "negate" }, "<": { type: "backspace" } };
  return run([...str].map((c) => map[c] ?? D(c)), start);
}

test("float noise is cleaned", () => {
  assert.equal(cleanNumber(0.1 + 0.2), "0.3");
  assert.equal(typed("0.1+0.2=").entry, "0.3");
});

test("operator precedence", () => {
  assert.equal(currentValue(typed("2+3*4")), 14);
  assert.equal(typed("10-4/2=").entry, "8");
});

test("first digit replaces the loaded amount", () => {
  assert.equal(typed("5", initialCalc("41.839")).entry, "5");
});

test("expression line and pending op", () => {
  const s = typed("1200*");
  assert.equal(pendingOp(s), "×");
  assert.equal(expressionLine(typed("1200*3")), "1,200 × 3");
  assert.equal(expressionLine(typed("1200*3=")), "1,200 × 3 =");
});

test("operator replacement", () => {
  assert.deepEqual(typed("5+*").tokens, ["5", "×"]);
});

test("percent", () => {
  assert.equal(typed("50%").entry, "0.5");
  assert.equal(typed("200+10%=").entry, "220");
});

test("negate and backspace", () => {
  assert.equal(typed("12n").entry, "-12");
  assert.equal(typed("123<").entry, "12");
  const s = typed("5+<");
  assert.deepEqual(s.tokens, []);
  assert.equal(s.entry, "5");
  assert.equal(typed("7<").entry, "0");
});

test("divide by zero does not crash", () => {
  const s = typed("5/0=");
  assert.equal(s.entry, "0");
  assert.match(s.lastExpr, /divide/);
});

test("decimal point rules", () => {
  assert.equal(typed(".5").entry, "0.5");
  assert.equal(typed("1..2").entry, "1.2");
});

test("digit limit", () => {
  assert.equal(typed("1234567890123456789").entry.length, 15);
});
