import { expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { readEmittedGraph } from "../bench/effect-boundary-audit";
const root = resolve(import.meta.dir, "..");
it("publishes the opt-in variable runtime in both formats and declarations", async () => {
  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  expect(pkg.exports["./theme/vars"]).toEqual({ types: "./dist/theme-vars.d.mts", import: "./dist/theme-vars.mjs", require: "./dist/theme-vars.cjs" });
  for (const suffix of ["mjs", "cjs"]) {
    const api = await import(resolve(root, `dist/theme-vars.${suffix}`));
    expect(Object.keys(api).filter(k => k !== "default").sort()).toEqual(["assignVars", "resolveAssignedStyles", "useAssignedStyles"]);
    const graph = readEmittedGraph(resolve(root, `dist/theme-vars.${suffix}`));
    expect(graph.externals).toEqual(["react"]);
    for (const file of graph.files)
      expect(readFileSync(file, "utf8")).not.toMatch(/from ["'](?:effect|@vanilla-extract|css-to-react-native)/);
  }
  for (const entry of ["theme", "theme-core", "theme-token"]) {
    for (const suffix of ["mjs", "cjs"]) {
      const graph = readEmittedGraph(resolve(root, `dist/${entry}.${suffix}`));
      for (const file of graph.files)
        expect(readFileSync(file, "utf8")).not.toMatch(/function (?:assignVars|resolveAssignedState|resolveAssignedStyles)\(/);
    }
  }
  const dts = readFileSync(resolve(root, "dist/theme-vars.d.mts"), "utf8");
  for (const name of ["NativeLocalVar", "NativeLocalFallback", "NativeLocalVarShape", "NativeLocalVarValues", "NativeVarAssignments", "ResolvedAssignedStyles"])
    expect(dts).toContain(name);
});
