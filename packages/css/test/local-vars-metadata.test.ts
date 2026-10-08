import { expect, test } from "bun:test";
import { compileLocal } from "./local-vars-compiler.test";
test("companion metadata records locals separately and preserves native module v2 shape", async () => {
  const { exports } = await compileLocal(`export const alpha=createVar("opacity",{owner:"@fixture/metadata",name:"Card.alpha",version:1});export const root=viewStyle({opacity:alpha});`);
  const metadata = exports.__crumbsLocalVars as {
    definitions: unknown[];
    uses: {
      localVars: string[];
    }[];
  };
  expect(metadata.definitions).toHaveLength(1);
  expect(metadata.uses[0]?.localVars).toEqual(["crumbs.css.local-var:@fixture/metadata#Card.alpha@1"]);
  expect(Object.keys(exports.__crumbsModule as object).sort()).toEqual(["$$type", "conditions", "dependencyPlan", "tokens", "version"]);
  expect((exports.__crumbsModule as {
    version: number;
  }).version).toBe(2);
});
test("companion name is reserved only when the module uses local variables", async () => {
  await expect(compileLocal(`export const __crumbsLocalVars=1;export const root=viewStyle({opacity:1});`)).resolves.toBeDefined();
  await expect(compileLocal(`export const __crumbsLocalVars=1;const alpha=createVar("opacity",{owner:"@fixture/metadata",name:"Card.collision",version:1});export const root=viewStyle({opacity:alpha});`)).rejects.toThrow(/reserved/);
});
