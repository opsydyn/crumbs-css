import { expect, mock, test } from "bun:test";
import { dirname, resolve } from "node:path";
import * as ReactNativeWeb from "react-native-web";
mock.module("react-native", () => ReactNativeWeb);
(globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;
await Bun.plugin({ name: "local-vars-installed-styles", setup(builder) { builder.onResolve({ filter: /[.]styles$/ }, args => ({ path: resolve(dirname(args.importer), args.path + ".web.js") })); } });
const React = await import("react");
const { default: Renderer, act } = await import("react-test-renderer");
const focusedFirst = process.env.CRUMBS_IMPORT_ORDER !== "compatibility-first";
const focused = focusedFirst ? await import("@opsydyn/crumbs-css/theme/core") : undefined;
const compatibility = await import("@opsydyn/crumbs-css/theme");
const core = focused ?? await import("@opsydyn/crumbs-css/theme/core");
const { assignVars, useAssignedStyles, resolveAssignedStyles } = await import("@opsydyn/crumbs-css/theme/vars");
const { accent, alpha, card, literal } = await import("../src/local-vars.styles");
const { localLight, localDark, localThemeVars } = await import("../src/local-theme");
const styles = Object.freeze({ card }), literalStyles = Object.freeze({ literal });
let seen: Record<string, unknown> = {};
let activeSubscriptions=0
const wrapped=new WeakSet<object>()
type ObservedStore={subscribe:(listener:()=>void)=>()=>void}
const context=(globalThis as unknown as Record<symbol,React.Context<ObservedStore|null>>)[Symbol.for("crumbs.css.theme-store-context.v1")]!
function ObserveStore(){
 const store=React.use(context)
 if(store&&!wrapped.has(store)){
  wrapped.add(store);const subscribe=store.subscribe
  store.subscribe=listener=>{activeSubscriptions++;const unsubscribe=subscribe(listener);return ()=>{activeSubscriptions--;unsubscribe()}}
 }
 return null
}

function Reader({ id, assignments, source = styles }: {
  id: string;
  assignments: ReturnType<typeof assignVars>;
  source?: Readonly<Record<string, unknown>>;
}) {
  const result = useAssignedStyles(source, assignments);
  seen[id] = result;
  return React.createElement("span", null, id);
}
test("installed local Hook works without a provider and shares focused/compatibility scopes", async () => {
  let renderer;
  const empty = assignVars({}, {}), a = assignVars({ accent, alpha }, { accent: "#2457d6", alpha: .25 }), b = assignVars({ accent, alpha }, { accent: "#c42f73", alpha: .75 });
  const app = (snapshot = a, theme = localLight, Provider = core.ThemeProvider,literalAssignments=empty) => React.createElement(React.Fragment, null, React.createElement(Reader, { id: "literal", source: literalStyles, assignments: literalAssignments }), React.createElement(Provider, { theme },React.createElement(ObserveStore), React.createElement(Reader, { id: "a", assignments: snapshot }), React.createElement(Reader, { id: "b", assignments: b })));
  await act(() => { renderer = Renderer.create(app()); });
  expect((seen.literal as {
    literal: {
      opacity: number;
    };
  }).literal.opacity).toBe(1);
  const initialB = seen.b, firstA = seen.a,initialLiteral=seen.literal;
  expect(activeSubscriptions).toBe(2)
  await act(()=>renderer!.update(app(a,localLight,core.ThemeProvider,assignVars({accent},{accent:"red"}))))
  expect(seen.literal).toBe(initialLiteral)

  await act(() => renderer!.update(app(assignVars({ alpha }, { alpha: .5 }))));
  expect(seen.b).toBe(initialB);
  expect((seen.a as {
    card: {
      backgroundColor: string;
      opacity: number;
    };
  }).card).toMatchObject({ backgroundColor: "#16804a", opacity: .5 });
  await act(() => renderer!.update(app(empty, localDark, compatibility.ThemeProvider)));
  expect((seen.a as {
    card: {
      backgroundColor: string;
      opacity: number;
    };
  }).card).toMatchObject({ backgroundColor: "#9a65de", opacity: 1 });
  expect(seen.a).not.toBe(firstA);
  // A public scoped theme reaches the same provider store.
  await act(() => renderer!.update(React.createElement(compatibility.TokenThemeProvider, { contract: localThemeVars, theme: localLight }, React.createElement(compatibility.TokenThemeScopeProvider, { contract: localThemeVars, context: "brand", values: { accent: "#c42f73" } }, React.createElement(Reader, { id: "scope", assignments: empty })))));
  expect((seen.scope as {
    card: {
      backgroundColor: string;
    };
  }).card.backgroundColor).toBe("#c42f73");
  await act(() => renderer!.unmount());
  expect(activeSubscriptions).toBe(0)
  await expect((async()=>{await act(()=>{Renderer.create(React.createElement(Reader,{id:"missing",assignments:empty}))})})()).rejects.toThrow(/Missing native theme/)

  expect(() => resolveAssignedStyles(styles, empty)).toThrow(/Missing native theme/);
  // No unused provider read: a populated branch accepts an absent theme.
  expect(resolveAssignedStyles(styles, a).card).toMatchObject({ backgroundColor: "#2457d6", opacity: .25 });
});
