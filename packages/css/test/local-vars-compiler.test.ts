import { expect, test } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { transformCssTsToStyleSheet } from "../src/transformer";
import { assignVars } from "../src/local-vars/assignments";
import { resolveAssignedStyles } from "../src/local-vars/resolver";
const native = resolve(import.meta.dir, "../src/native-style.ts"), authoring = resolve(import.meta.dir, "../src/local-vars/authoring.ts");
export async function compileLocal(body: string, useStyleSheet = true) {
  const dir = mkdtempSync(join(tmpdir(), "crumbs-local-")), file = join(dir, "case.css.ts");
  try {
    const source = `import {style,viewStyle,textStyle,imageStyle,recipe,styleVariants} from ${JSON.stringify(native)};import {createVar,fallbackVar} from ${JSON.stringify(authoring)};${body}`;
    symlinkSync(resolve(import.meta.dir, "../node_modules"), join(dir, "node_modules"), "dir");
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "@fixture/local-compiler", version: "1.0.0" }));
    writeFileSync(file, source);
    const code = await transformCssTsToStyleSheet(file, dir, { useStyleSheet, includeStyleExplanations: false });
    const calls: unknown[] = [];
    const exports: Record<string, unknown> = {};
    new Function("exports", "StyleSheet", code.replace(/^import .*;$/gm, "").replace(/export const (\w+) =/g, "exports.$1 ="))(exports, { create(s: unknown) { calls.push(s); return s; } });
    return { code, exports, calls };
  }
  finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const defs = `export const alpha=createVar("opacity",{owner:"@fixture/compiler",name:"Card.alpha",version:1});export const padding=createVar("length",{owner:"@fixture/compiler",name:"Card.padding",version:1});`;
for (const useStyleSheet of [true, false])
  test("local exports are frozen and never reach StyleSheet.create " + useStyleSheet, async () => {
    const { exports, calls } = await compileLocal(defs + `export const localVars={nested:{alpha}};export const styles={root:viewStyle({opacity:fallbackVar(alpha,1),transform:[{scale:2}]})};`, useStyleSheet);
    const map = exports.styles as Record<string, Record<string, unknown>>;
    expect(map.root?.$$type).toBe("crumbs.css.local-style-plan");
    expect(Object.isFrozen(map)).toBe(true);
    expect(Object.isFrozen(exports.localVars)).toBe(true);
    expect(Object.isFrozen(map.root?.declarations)).toBe(true);
    expect(JSON.stringify(calls)).not.toContain("crumbs.css.local-");
  });
test("last-write composition keeps shorthand/local order and shadowed required locals", async () => {
  const { exports } = await compileLocal(defs + `const base=viewStyle({padding});export const forward=viewStyle([base,{paddingLeft:12}]);export const reverse=viewStyle([{paddingLeft:12},base]);export const shadowed=viewStyle([{opacity:alpha},{opacity:1}]);`);
  const f = exports.forward as {
    declarations: {
      property: string;
      value: unknown;
    }[];
  }, r = exports.reverse as typeof f, shadowed = exports.shadowed as typeof f;
  expect(f.declarations.find(d => d.property === "paddingLeft")?.value).toBe(12);
  expect((r.declarations.find(d => d.property === "paddingLeft")?.value as {
    $$type: string;
  }).$$type).toBe("crumbs.css.local-var");
  expect(shadowed.declarations).toEqual([{ property: "opacity", value: 1 }]);
});
test("compiler rejects local values in the wrong primitive or structured property", async () => {
  await expect(compileLocal(`const color=createVar("color",{owner:"@fixture/compiler",name:"Bad.color",version:1});export const bad=viewStyle({color} as never);`)).rejects.toThrow();
  await expect(compileLocal(defs + `export const bad=viewStyle({transform:[{scale:alpha}]} as never);`)).rejects.toThrow();
});
test("a marked primitive map receives its marker before freezing", async () => {
  const { exports } = await compileLocal(defs + `export const marked=styleVariants({root:viewStyle({opacity:alpha})});`);
  const marked = exports.marked as Record<string, unknown>;
  expect(Object.getOwnPropertyDescriptor(marked, Symbol.for("crumbs.css.style-map"))?.value).toBe(true);
  expect(Object.isFrozen(marked)).toBe(true);
});
test("unexported shadowed operands still emit a portable frozen plan", async () => {
  const { exports } = await compileLocal(`const alpha=createVar("opacity",{owner:"@fixture/shadow",name:"Card.alpha",version:1});export const root=viewStyle([{opacity:alpha},{opacity:1}]);`);
  expect((exports.root as {
    declarations: unknown;
  }).declarations).toEqual([{ property: "opacity", value: 1 }]);
});
test("recipes reject local operands rather than emitting partially resolvable recipes", async () => {
  await expect(compileLocal(defs + `export const bad=recipe({variants:{},base:{opacity:alpha}} as never);`)).rejects.toThrow(/local/i);
});
test("changed and removed definitions do not retain stale compiled identities", async () => {
  const body = (version: number) => `export const alpha=createVar("opacity",{owner:"@fixture/refresh",name:"Card.alpha",version:${version}});export const stable=createVar("color",{owner:"@fixture/refresh",name:"Card.stable",version:1});export const root=viewStyle({opacity:fallbackVar(alpha,1)});`;
  const a = await compileLocal(body(1)), b = await compileLocal(body(2)), again = await compileLocal(body(1)), removed = await compileLocal(`export const stable=createVar("color",{owner:"@fixture/refresh",name:"Card.stable",version:1});export const root=viewStyle({opacity:1});`);
  expect(b.exports.stable).toEqual(a.exports.stable);
  expect(again.exports.alpha).toEqual(a.exports.alpha);
  expect((b.exports.alpha as {
    identity: {
      version: number;
    };
  }).identity.version).toBe(2);
  expect(removed.exports.alpha).toBeUndefined();
  expect(JSON.stringify(b.exports.__crumbsLocalVars)).not.toContain('Card.alpha@1');
});
test("conflicting captured identities fail across separate style declarations", async () => {
  await expect(compileLocal(`const a=createVar("opacity",{owner:"@fixture/collision",name:"Card.same",version:1});const b=createVar("length",{owner:"@fixture/collision",name:"Card.same",version:1});export const first=viewStyle({opacity:a});export const second=viewStyle({width:b});`)).rejects.toThrow(/LOCAL_VAR_CONFLICT/);
});
test("same-path imported definition edit/remove/restore has fresh-transform parity", async () => {
  const dir = mkdtempSync(join(tmpdir(), "crumbs-local-refresh-")), file = join(dir, "case.css.ts"), dependency = join(dir, "vars.ts");
  const source = `import {viewStyle,fallbackVar} from ${JSON.stringify(native)};import {alpha,stable} from './vars';export {stable};export const root=viewStyle({opacity:fallbackVar(alpha,1)});`;
  const defs = (version: number) => `import {createVar} from ${JSON.stringify(authoring)};export const alpha=createVar('opacity',{owner:'@fixture/refresh-import',name:'Card.alpha',version:${version}});export const stable=createVar('color',{owner:'@fixture/refresh-import',name:'Card.stable',version:1});`;
  try {
    symlinkSync(resolve(import.meta.dir, "../node_modules"), join(dir, "node_modules"), "dir");
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "@fixture/refresh-import", version: "1.0.0" }));
    writeFileSync(file, source);
    writeFileSync(dependency, defs(1));
    const transform = () => transformCssTsToStyleSheet(file, dir, { useStyleSheet: false, includeStyleExplanations: false });
    const first = await transform();
    expect(await transform()).toBe(first);
    writeFileSync(dependency, defs(2));
    const changed = await transform();
    expect(changed).not.toBe(first);
    expect(changed).toContain('Card.alpha@2');
    expect(changed).not.toContain('Card.alpha@1');
    writeFileSync(dependency, defs(1).replace(/export const alpha=.*?;export const stable/s, 'export const stable'));
    writeFileSync(file, `import {viewStyle} from ${JSON.stringify(native)};import {stable} from './vars';export {stable};export const root=viewStyle({opacity:1});`);
    const removed = await transform();
    expect(removed).not.toContain('Card.alpha');
    expect(removed).not.toContain('crumbs.css.local-style-plan');
    writeFileSync(dependency, defs(1));
    writeFileSync(file, source);
    expect(await transform()).toBe(first);
  }
  finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("null-prototype local export maps freeze the final object and memoise resolution", async () => {
  const { exports } = await compileLocal(defs + `export const styles=Object.assign(Object.create(null),{root:viewStyle({opacity:fallbackVar(alpha,1)})});`);
  const styles = exports.styles as Record<string, unknown>;
  expect(Object.getPrototypeOf(styles)).toBe(null);
  expect(Object.isFrozen(styles)).toBe(true);
  const empty = assignVars({}, {});
  expect(resolveAssignedStyles(styles, empty)).toBe(resolveAssignedStyles(styles, empty));
});

test("generic local styles intersect structured-property primitive domains", async () => {
  const view = await compileLocal(defs + `export const root=style({opacity:alpha,boxShadow:[{offsetX:0,offsetY:1,color:'black'}]});`);
  const text = await compileLocal(defs + `export const root=style({opacity:alpha,fontVariant:['small-caps']});`);
  expect((view.exports.root as {primitiveDomain:unknown}).primitiveDomain).toEqual(['view']);
  expect((text.exports.root as {primitiveDomain:unknown}).primitiveDomain).toEqual(['text']);
});

test("compiler rejects custom prototypes spoofing the evaluator native constructor", async () => {
  await expect(compileLocal(defs + `const fake=Object.assign(Object.create({constructor:Object,inherited:'not plain'}),alpha);export const root=viewStyle({opacity:fake} as never);`)).rejects.toThrow(/INVALID_LOCAL_VAR/);
});
