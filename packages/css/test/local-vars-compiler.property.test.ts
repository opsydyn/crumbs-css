import { expect, test } from "bun:test";
import fc from "fast-check";
import { createVar } from "../src/local-vars/authoring";
import { captureLocalVarsIntoNativeIr } from "../src/compiler/local-vars";
import { markNativeCaptureRule } from "../src/compiler/native-capture";
import { evaluateLocalStyle } from "./oracles/local-vars";
const variable = createVar("length", { owner: "@fixture/oracle", name: "Card.padding", version: 1 });
test("capture expands padding to the independently interpreted four native sides", () => fc.assert(fc.property(fc.integer({ min: 0, max: 1000 }), value => {
  const captured = captureLocalVarsIntoNativeIr(markNativeCaptureRule({ padding: variable }, ["view"]), { packageOwner: "@fixture/oracle", sourceId: "case.css.ts", className: "root" });
  const actual = Object.fromEntries(captured.declarations.map(d => [d.property, value]));
  const expected = evaluateLocalStyle(["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"].map(property => ({ property, value: { kind: "literal" as const, value } })), new Map(), new Map());
  expect(actual as Record<string, unknown>).toEqual(expected);
})));
