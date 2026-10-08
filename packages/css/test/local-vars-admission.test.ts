import { expect, test } from "bun:test";
import { createVar, fallbackVar } from "../src/local-vars/authoring";
import { assignVars } from "../src/local-vars/assignments";
import { admitLocalOperand, admitVarAssignments } from "../src/local-vars/admission";
const v = createVar("opacity", { owner: "@fixture/admission", name: "Card.alpha", version: 1 });
test("shapes require own exact data and never execute accessors", () => {
  let reads = 0;
  const getter = Object.defineProperty({}, "alpha", { enumerable: true, get() { reads++; return 1; } });
  expect(() => assignVars({ alpha: v }, getter as {
    alpha: number;
  })).toThrow(/INVALID_LOCAL_ASSIGNMENTS/);
  expect(reads).toBe(0);
  for (const values of [{ alpha: undefined }, { alpha: 1, extra: 2 }, {}, Object.create({ alpha: 1 })])
    expect(() => assignVars({ alpha: v }, values as {
      alpha: number;
    })).toThrow(/INVALID_LOCAL_ASSIGNMENTS/);
  const symbol = Object.assign({ alpha: 1 }, { [Symbol("extra")]: 2 });
  expect(() => assignVars({ alpha: v }, symbol)).toThrow(/INVALID_LOCAL_ASSIGNMENTS/);
});
test("mutable decoded inputs are revalidated and copied", () => {
  const raw = JSON.parse(JSON.stringify(assignVars({ alpha: v }, { alpha: .25 })));
  const first = admitVarAssignments(raw);
  raw.bindings[0].value = .75;
  expect(first.bindings[0]?.value).toBe(.25);
  expect(admitVarAssignments(raw).bindings[0]?.value).toBe(.75);
  raw.version = 2;
  expect(() => admitVarAssignments(raw)).toThrow(/UNSUPPORTED_VERSION/);
});
test("operand admission rejects extra fields, bad versions, domains and decorated arrays", () => {
  for (const raw of [{ ...v, extra: 1 }, { ...v, version: 2 }, { ...v, domain: { kind: "opacity", extra: 1 } }])
    expect(() => admitLocalOperand(raw)).toThrow(/LOCAL_VAR/);
  const f = JSON.parse(JSON.stringify(fallbackVar(v, 1)));
  f.variables.extra = 1;
  expect(() => admitLocalOperand(f)).toThrow(/INVALID_LOCAL_VAR/);
});
test("cycles and excessive container depth fail without modifying inputs", () => {
  const cycle: Record<string, unknown> = {};
  cycle.x = cycle;
  expect(() => assignVars(cycle as never, cycle as never)).toThrow(/INVALID_LOCAL_ASSIGNMENTS/);
  let shape: unknown = v, values: unknown = 1;
  for (let i = 0; i < 65; i++) {
    shape = { x: shape };
    values = { x: values };
  }
  expect(() => assignVars(shape as never, values as never)).toThrow(/INVALID_LOCAL_ASSIGNMENTS/);
});
test("definition admission rejects decorated identity and domain inputs", () => {
  const id = { owner: "@fixture/strict", name: "Card.a", version: 1 };
  expect(() => createVar({ kind: "opacity", extra: 1 } as never, id)).toThrow(/INVALID_LOCAL_VAR/);
  expect(() => createVar("opacity", { ...id, extra: 1 } as never)).toThrow(/INVALID_LOCAL_VAR/);
  let reads = 0;
  const domain = Object.defineProperty({}, "kind", { enumerable: true, get() { reads++; return "opacity"; } });
  expect(() => createVar(domain as never, id)).toThrow(/INVALID_LOCAL_VAR/);
  expect(reads).toBe(0);
});
