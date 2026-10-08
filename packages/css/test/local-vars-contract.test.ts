import { expect, test } from "bun:test";
import { createVar, fallbackVar } from "../src/local-vars/authoring";
import { assignVars } from "../src/local-vars/assignments";
import { createThemeContract } from "../src/theme-contract";
import { createTokenContract, token } from "../src/tokens/domains";
const identity = (name: string) => ({ owner: "@fixture/ui", name, version: 1 });
test("independent definitions preserve canonical identity and domain", () => {
  const a = createVar("opacity", identity("Card.opacity"));
  const b = createVar("opacity", identity("Card.opacity"));
  expect(a).toEqual(b);
  expect(Object.isFrozen(a.identity)).toBe(true);
  expect(createVar({ kind: "enum", values: ["z", "a"] }, identity("Card.enum")).domain).toEqual({ kind: "enum", values: ["a", "z"] });
});
test("zero is present, subsets replace and the empty snapshot is canonical", () => {
  const opacity = createVar("opacity", identity("Card.opacity"));
  expect(assignVars({ opacity }, { opacity: 0 }).bindings[0]?.value).toBe(0);
  expect(assignVars({}, {})).toBe(assignVars({}, {}));
  expect(Object.is(assignVars({ opacity }, { opacity: -0 }).bindings[0]?.value, -0)).toBe(true);
  expect(() => assignVars({ opacity }, { opacity: NaN })).toThrow(/INVALID_LOCAL_ASSIGNMENTS/);
});
test("duplicates collapse only equal domains and Object.is values", () => {
  const a = createVar("opacity", identity("Card.same"));
  const b = createVar("opacity", identity("Card.same"));
  expect(assignVars({ a, b }, { a: 0, b: 0 }).bindings).toHaveLength(1);
  expect(() => assignVars({ a, b }, { a: 0, b: -0 })).toThrow(/LOCAL_VAR_CONFLICT/);
  const other = createVar("length", identity("Card.same"));
  expect(() => assignVars({ a, other }, { a: 1, other: 1 })).toThrow(/LOCAL_VAR_CONFLICT/);
});
test("fallback validates every branch and enforces 16 handles", () => {
  const v = createVar("opacity", identity("Card.alpha"));
  expect(fallbackVar(v, ...Array(15).fill(v), 1).variables).toHaveLength(16);
  expect(() => fallbackVar(v, ...Array(16).fill(v), 1)).toThrow(/INVALID_LOCAL_VAR/);
  expect(() => fallbackVar(v, NaN)).toThrow(/INVALID_LOCAL_VAR/);
  const length = createVar("length", identity("Card.length"));
  // @ts-expect-error different domains
  expect(() => fallbackVar(v, length, 1)).toThrow(/DOMAIN_MISMATCH/);
});
test("public typed theme terminals carry their admitted owning domain", () => {
  const vars = createTokenContract({ accent: token.color() }, { owner: "@fixture/ui", name: "LocalTheme", version: 1 });
  const accent = createVar("color", identity("Card.accent"));
  expect(fallbackVar(accent, vars.accent).terminal.kind).toBe("theme");
  expect(() => assignVars({ accent }, { accent: vars.accent as string })).toThrow(/INVALID_LOCAL_ASSIGNMENTS/);
});
test("private and legacy terminals cannot acquire local fallback authority", () => {
  const privateVars = createTokenContract({ shown: token.color(), hidden: token.color() }, { identity: { owner: "@fixture/private", name: "Colors", version: 1 }, visibility: { public: [["shown"]] } });
  const accent = createVar("color", identity("Card.private"));
  // @ts-expect-error private theme reference
  expect(() => fallbackVar(accent, privateVars.hidden)).toThrow(/INVALID_LOCAL_VAR/);
  const legacy = createThemeContract({ legacyLocal: null });
  // @ts-expect-error legacy theme reference
  expect(() => fallbackVar(accent, legacy.legacyLocal)).toThrow(/INVALID_LOCAL_VAR/);
});
test("fallback domains include enum membership and length permissions", () => {
  const positive = createVar("length", identity("Card.positive")), negative = createVar({ kind: "length", allowNegative: true }, identity("Card.negative"));
  // @ts-expect-error incompatible length permission
  expect(() => fallbackVar(positive, negative, 1)).toThrow(/DOMAIN_MISMATCH/);
  const choice = createVar({ kind: "enum", values: ["flex", "none"] }, identity("Card.choice"));
  // @ts-expect-error invalid enum literal
  expect(() => fallbackVar(choice, "block")).toThrow(/INVALID_LOCAL_VAR/);
});
