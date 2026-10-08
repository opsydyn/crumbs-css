import { expect, test } from "bun:test";
import { createVar, fallbackVar } from "../src/local-vars/authoring";
import { assignVars } from "../src/local-vars/assignments";
import { createLocalStylePlan } from "../src/compiler/local-vars";
import { resolveAssignedStyles } from "../src/local-vars/resolver";
import { createTokenContract, createTokenTheme, token } from "../src/tokens/domains";
import { resolveThemeTokens, resolveThemeStyles } from "../src/theme-runtime";
const id = (name: string) => ({ owner: "@fixture/resolver", name, version: 1 });
const alpha = createVar("opacity", id("Card.alpha")), alternative = createVar("opacity", id("Card.alternative"));
const plan = (value: unknown) => createLocalStylePlan(["view"], [{ property: "opacity", value }]);
test("ordered fallback treats zero and negative zero as present", () => {
  const styles = Object.freeze({ root: plan(fallbackVar(alpha, alternative, 1)) });
  expect(resolveAssignedStyles(styles, assignVars({ alpha, alternative }, { alpha: 0, alternative: .75 })).root).toEqual({ opacity: 0 });
  expect(Object.is((resolveAssignedStyles(styles, assignVars({ alpha }, { alpha: -0 })).root as {
    opacity: number;
  }).opacity, -0)).toBe(true);
  expect(resolveAssignedStyles(styles, assignVars({ alternative }, { alternative: .75 })).root).toEqual({ opacity: .75 });
  expect(resolveAssignedStyles(styles, assignVars({}, {})).root).toEqual({ opacity: 1 });
});
test("two instances replace complete snapshots independently", () => {
  const styles = Object.freeze({ root: plan(fallbackVar(alpha, 1)) }), a = assignVars({ alpha }, { alpha: .25 }), b = assignVars({ alpha }, { alpha: .75 });
  const first = resolveAssignedStyles(styles, a), second = resolveAssignedStyles(styles, b);
  expect(first.root).toEqual({ opacity: .25 });
  expect(second.root).toEqual({ opacity: .75 });
  expect(resolveAssignedStyles(styles, assignVars({}, {})).root).toEqual({ opacity: 1 });
  expect(first.root).toEqual({ opacity: .25 });
});
test("a required effective local variable fails but a shadowed one does not", () => {
  expect(() => resolveAssignedStyles({ root: plan(alpha) }, assignVars({}, {}))).toThrow(/LOCAL_VAR_REQUIRED/);
  const shadow = createLocalStylePlan(["view"], [{ property: "opacity", value: alpha }, { property: "opacity", value: 1 }]);
  expect(resolveAssignedStyles({ root: shadow }, assignVars({}, {})).root).toEqual({ opacity: 1 });
});
test("a theme terminal is read only after local alternatives are absent", () => {
  const vars = createTokenContract({ accent: token.color() }, { owner: "@fixture/resolver", name: "Colors", version: 1 });
  const accent = createVar("color", id("Card.accent")), styles = Object.freeze({ root: createLocalStylePlan(["view"], [{ property: "backgroundColor", value: fallbackVar(accent, vars.accent) }]) });
  expect(resolveAssignedStyles(styles, assignVars({ accent }, { accent: "blue" })).root).toEqual({ backgroundColor: "blue" });
  expect(() => resolveAssignedStyles(styles, assignVars({}, {}))).toThrow(/Missing.*[Tt]heme|provider/);
  const theme = createTokenTheme(vars, { accent: "red" });
  expect(resolveAssignedStyles(styles, assignVars({}, {}), theme).root).toEqual({ backgroundColor: "red" });
  const wrong = createTokenContract({ accent: token.color() }, { owner: "@fixture/resolver", name: "OtherColors", version: 1 });
  expect(() => resolveAssignedStyles(styles, assignVars({}, {}), createTokenTheme(wrong, { accent: "green" }))).toThrow(/CONTRACT_MISMATCH|PROVIDER_MISMATCH/);
});
test("property constraints and cross-input domains are checked before publication", () => {
  const length = createVar("length", id("Card.spacing")), styles = { root: createLocalStylePlan(["view"], [{ property: "borderTopWidth", value: length }]) };
  expect(() => resolveAssignedStyles(styles, assignVars({ length }, { length: "20%" }))).toThrow(/INVALID_PROPERTY_VALUE/);
  const conflict = createVar("length", id("Card.alpha"));
  expect(() => resolveAssignedStyles({ root: plan(alpha) }, assignVars({ conflict }, { conflict: 1 }))).toThrow(/LOCAL_VAR_CONFLICT/);
});
test("mutable decoded values and descriptor versions are re-admitted", () => {
  const styles = JSON.parse(JSON.stringify({ root: plan(fallbackVar(alpha, 1)) })), assignments = JSON.parse(JSON.stringify(assignVars({ alpha }, { alpha: .25 })));
  const first = resolveAssignedStyles(styles, assignments);
  assignments.bindings[0].value = .75;
  expect(resolveAssignedStyles(styles, assignments).root).toEqual({ opacity: .75 });
  expect(first.root).toEqual({ opacity: .25 });
  styles.root.version = 2;
  expect(() => resolveAssignedStyles(styles, assignments)).toThrow(/UNSUPPORTED_VERSION/);
});
test("existing resolvers reject new plans with a directed diagnostic", () => {
  expect(() => resolveThemeTokens(plan(alpha), { contract: {}, values: {}, tokens: {} })).toThrow(/LOCAL_STYLE_PLAN_REQUIRED/);
});
test("decoded plans validate dependencies, placements and all descriptors before a selected branch", () => {
  const base = JSON.parse(JSON.stringify(plan(fallbackVar(alpha, 1))));
  base.dependencies.localVars = [];
  expect(() => resolveAssignedStyles({ root: base }, assignVars({ alpha }, { alpha: .25 }))).toThrow(/INVALID_LOCAL_VAR/);
  const malformed = JSON.parse(JSON.stringify(plan(fallbackVar(alpha, 1))));
  malformed.declarations[0].value.terminal.value = NaN;
  expect(() => resolveAssignedStyles({ root: malformed }, assignVars({ alpha }, { alpha: .25 }))).toThrow(/INVALID_LOCAL_VAR/);
  let reads = 0;
  const getter = Object.defineProperty({}, "opacity", { enumerable: true, get() { reads++; return 1; } });
  expect(() => resolveAssignedStyles({ root: getter }, assignVars({}, {}))).toThrow(/INVALID_LOCAL_VAR/);
  expect(reads).toBe(0);
  const structured = JSON.parse(JSON.stringify(createLocalStylePlan(["view"], [{ property: "opacity", value: fallbackVar(alpha, 1) }, { property: "transform", value: [{ scale: 2 }] }])));
  structured.declarations[1].value = [{ scale: alpha }];
  expect(() => resolveAssignedStyles({ root: structured }, assignVars({ alpha }, { alpha: .25 }))).toThrow(/INVALID_PROPERTY_VALUE/);
});
test("a mutable decoded plan cannot hide changes behind a prior cache admission", () => {
  const raw = JSON.parse(JSON.stringify({ root: plan(fallbackVar(alpha, 1)) })), empty = assignVars({}, {}), first = resolveAssignedStyles(raw, empty);
  raw.root.declarations[0].value.terminal.value = .5;
  expect(resolveAssignedStyles(raw, empty).root).toEqual({ opacity: .5 });
  expect(first.root).toEqual({ opacity: 1 });
  raw.root.declarations[0].value.variables[0].domain = { kind: "color" };
  expect(() => resolveAssignedStyles(raw, empty)).toThrow(/LOCAL_VAR/);
});
test("unused theme getters are untouched and reached identity metadata getters are rejected", () => {
  const vars = createTokenContract({ accent: token.color() }, { owner: "@fixture/metadata-ingress", name: "Colors", version: 1 }), accent = createVar("color", id("Card.guarded"));
  const styles = { root: createLocalStylePlan(["view"], [{ property: "backgroundColor", value: fallbackVar(accent, vars.accent) }]) };
  let reads = 0;
  const unneeded = Object.defineProperty({}, "tokens", { enumerable: true, get() { reads++; return {}; } });
  expect(resolveAssignedStyles(styles, assignVars({ accent }, { accent: "blue" }), unneeded as never).root).toEqual({ backgroundColor: "blue" });
  expect(reads).toBe(0);
  const theme = createTokenTheme(vars, { accent: "red" }), contract = {};
  Object.defineProperty(contract, Symbol.for("crumbs.css.theme-contract-identity.v1"), { value: { get key() { reads++; return "@fixture/metadata-ingress#Colors@1"; }, identity: { owner: "@fixture/metadata-ingress", name: "Colors", version: 1 }, signature: "fake" } });
  expect(() => resolveAssignedStyles(styles, assignVars({}, {}), { ...theme, contract })).toThrow(/INVALID_THEME_CONTRACT/);
  expect(reads).toBe(0);
});
test("existing map resolver rejects a newly introduced plan before an older cached result", () => {
  const styles: Record<string, unknown> = { root: { opacity: 1 } }, theme = { contract: {}, values: {}, tokens: {} };
  resolveThemeStyles(styles, theme);
  styles.root = plan(alpha);
  expect(() => resolveThemeStyles(styles, theme)).toThrow(/LOCAL_STYLE_PLAN_REQUIRED/);
});
test("decoded theme terminals cannot gain private token authority or forge public identity",()=>{
 const vars=createTokenContract({shown:token.color(),hidden:token.color()},{identity:{owner:"@fixture/private-terminal",name:"Colors",version:1},visibility:{public:[["shown"]]}})
 const accent=createVar("color",id("Card.privateTerminal")),theme=createTokenTheme(vars,{shown:"red",hidden:"blue"})
 const raw=JSON.parse(JSON.stringify(createLocalStylePlan(["view"],[{property:"backgroundColor",value:fallbackVar(accent,vars.shown)}])))
 raw.declarations[0].value.terminal.reference.varName=String(vars.hidden).slice(4,-1)
 expect(()=>resolveAssignedStyles({root:raw},assignVars({},{}),theme)).toThrow(/INVALID_LOCAL_VAR/)
 const wrongId=JSON.parse(JSON.stringify(createLocalStylePlan(["view"],[{property:"backgroundColor",value:fallbackVar(accent,vars.shown)}])))
 wrongId.declarations[0].value.terminal.publicId="forged"
 expect(()=>resolveAssignedStyles({root:wrongId},assignVars({},{}),theme)).toThrow(/INVALID_LOCAL_VAR/)
})

test("older cached arrays and nested maps cannot hide newly introduced local plans", () => {
  const theme = { contract: {}, values: {}, tokens: {} };
  const array: unknown[] = [{ opacity: 1 }];
  resolveThemeTokens(array, theme);
  array[0] = plan(alpha);
  expect(() => resolveThemeTokens(array, theme)).toThrow(/LOCAL_STYLE_PLAN_REQUIRED/);
  const nested: {group:{root:unknown}} = {group:{root:{opacity:1}}};
  resolveThemeStyles(nested, theme);
  nested.group.root = plan(alpha);
  expect(() => resolveThemeStyles(nested, theme)).toThrow(/LOCAL_STYLE_PLAN_REQUIRED/);
});
test("native property errors include resolution phase, export, property and variable", () => {
  const length = createVar('length', id('Card.border'));
  const styles = Object.freeze({cardBorder:createLocalStylePlan(['view'],[{property:'borderTopWidth',value:length}])});
  expect(() => resolveAssignedStyles(styles, assignVars({length},{length:'20%'}))).toThrow(/resolution.cardBorder.borderTopWidth.*Card.border/);
});
