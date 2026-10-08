import { expect, test } from "bun:test";
import { createVar, fallbackVar } from "../src/local-vars/authoring";
import { assignVars } from "../src/local-vars/assignments";
import { createLocalStylePlan } from "../src/compiler/local-vars";
import { resolveAssignedStyles } from "../src/local-vars/resolver";
import { createAssignedStyleSelector } from "../src/local-vars/selector";
const id = (name: string) => ({ owner: "@fixture/cache", name, version: 1 });
const a = createVar("opacity", id("Card.a")), b = createVar("opacity", id("Card.b")), unused = createVar("opacity", id("Card.unused"));
const staticStyle = Object.freeze({ paddingLeft: 12 }), styles = Object.freeze({ a: createLocalStylePlan(["view"], [{ property: "opacity", value: fallbackVar(a, 1) }]), b: createLocalStylePlan(["view"], [{ property: "opacity", value: fallbackVar(b, 1) }]), static: staticStyle });
test("identical immutable inputs reuse the map and static export", () => {
  const assignments = assignVars({ a, b }, { a: .25, b: .75 }), first = resolveAssignedStyles(styles, assignments);
  expect(resolveAssignedStyles(styles, assignments)).toBe(first);
  expect(first.static).toBe(staticStyle);
  expect(Object.isFrozen(first.a)).toBe(true);
});
test("bounded selectors reuse unaffected exports and whole unused updates", () => {
  const select = createAssignedStyleSelector(styles), first = select(assignVars({ a, b }, { a: .25, b: .75 }));
  const changed = select(assignVars({ a, b }, { a: .5, b: .75 }));
  expect(changed.a).not.toBe(first.a);
  expect(changed.b).toBe(first.b);
  expect(select(assignVars({ a, b, unused }, { a: .5, b: .75, unused: .9 }))).toBe(changed);
  const bad = JSON.parse(JSON.stringify(assignVars({ a }, { a: 1 })));
  bad.bindings[0].value = NaN;
  expect(() => select(bad)).toThrow(/INVALID_LOCAL_ASSIGNMENTS/);
  expect(select(assignVars({ a, b }, { a: .5, b: .75 }))).toBe(changed);
});
test("a prewarmed shared cache does not replace a hook's unaffected export identity", () => {
  const select = createAssignedStyleSelector(styles), next = assignVars({ a, b }, { a: .5, b: .75 });
  resolveAssignedStyles(styles, next);
  const first = select(assignVars({ a, b }, { a: .25, b: .75 }));
  expect(select(next).b).toBe(first.b);
});
test("frozen compiler-marked maps retain identical-input identity",()=>{
 const marked={...styles};Object.defineProperty(marked,Symbol.for("crumbs.css.style-map"),{value:true,enumerable:true});Object.freeze(marked)
 const snapshot=assignVars({a,b},{a:.25,b:.75}),first=resolveAssignedStyles(marked,snapshot)
 expect(resolveAssignedStyles(marked,snapshot)).toBe(first)
})
