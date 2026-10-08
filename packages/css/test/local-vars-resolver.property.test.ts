import { expect, test } from "bun:test";
import fc from "fast-check";
import { createVar, fallbackVar } from "../src/local-vars/authoring";
import { assignVars } from "../src/local-vars/assignments";
import { createLocalStylePlan } from "../src/compiler/local-vars";
import { resolveAssignedStyles } from "../src/local-vars/resolver";
import { evaluateLocalStyle } from "./oracles/local-vars";
const a = createVar("opacity", { owner: "@fixture/equivalence", name: "Card.a", version: 1 });
const style = createLocalStylePlan(["view"], [{ property: "opacity", value: fallbackVar(a, 1) }]);
test("local resolution matches an independent fallback interpreter", () => fc.assert(fc.property(fc.option(fc.double({ min: 0, max: 1, noNaN: true }), { nil: undefined }), value => {
  const assignments = value === undefined ? assignVars({}, {}) : assignVars({ a }, { a: value });
  const expected = evaluateLocalStyle([{ property: "opacity", value: { kind: "fallback", ids: ["a"], terminal: { kind: "literal", value: 1 } } }], value === undefined ? new Map() : new Map([["a", value]]), new Map());
  expect(resolveAssignedStyles({ root: style }, assignments).root).toEqual(expected);
})));
