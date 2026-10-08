import { expect, test } from "bun:test";
import fc from "fast-check";
import { createVar } from "../src/local-vars/authoring";
import { assignVars } from "../src/local-vars/assignments";
const a = createVar("opacity", { owner: "@fixture/property", name: "Card.a", version: 1 });
const b = createVar("opacity", { owner: "@fixture/property", name: "Card.b", version: 1 });
test("binding order is independent of record insertion order", () => fc.assert(fc.property(fc.double({ min: 0, max: 1, noNaN: true }), fc.double({ min: 0, max: 1, noNaN: true }), (x, y) => {
  expect(assignVars({ a, b }, { a: x, b: y })).toEqual(assignVars({ b, a }, { b: y, a: x }));
})));
