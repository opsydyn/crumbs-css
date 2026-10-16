import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { transform } from "../src/transformer";
const root = resolve(import.meta.dir, ".."),
  file = resolve(root, "fixtures/source-map.css.ts"),
  upstream = resolve(root, "fixtures/upstream-source-map.cjs");
type Mapped = {
  code: string;
  map: (number | string)[][];
  output: { data: { map: (number | string)[][] } }[];
};
describe("authored native source maps", () => {
  it("maps generated exports and style-table values to real authored declarations", async () => {
    const source = readFileSync(file),
      result = (await transform(
        { upstreamTransformerPath: upstream },
        root,
        file,
        source,
        { dev: true, platform: "ios" },
      )) as Mapped;
    const lines = result.code.split("\n");
    expect(result.output[0]!.data.map).toEqual(result.map);
    for (const [name, want] of [
      ["title", 4],
      ["caption", 8],
    ] as const) {
      const line = lines.findIndex((line) =>
        line.startsWith("export const " + name + " ="),
      );
      const column = lines[line]!.indexOf(name);
      expect(
        result.map
          .find((row) => row[0] === line + 1 && row[1] === column)
          ?.slice(2, 4),
      ).toEqual([want, 13]);
      const className = result.code.match(
        new RegExp("export const " + name + ' = _s\\["([^"]+)"'),
      )![1]!;
      const keyLine = lines.findIndex((line) =>
        line.includes('"' + className + '":'),
      );
      const keyColumn = lines[keyLine]!.indexOf('"' + className + '":') + 1;
      expect(
        result.map
          .find((row) => row[0] === keyLine + 1 && row[1] === keyColumn)
          ?.slice(2, 4),
      ).toEqual([want, 13]);
    }
    const authored = source.toString().split("\n");
    for (const row of result.map) {
      expect(Number(row[2])).toBeLessThanOrEqual(authored.length);
      expect(Number(row[3])).toBeLessThanOrEqual(
        authored[Number(row[2]) - 1]!.length,
      );
    }
  });
  it("preserves ordinary-module source maps verbatim", async () => {
    const file = resolve(root, "fixtures/ordinary.ts"),
      source = Buffer.from("export const value = 1;");
    const result = (await transform(
      { upstreamTransformerPath: upstream },
      root,
      file,
      source,
      { dev: true, platform: "ios" },
    )) as Mapped;
    expect(result.map[0]).toEqual([1, 0, 1, 0, "export"]);
  });
});

it("anchors aliased and nested exports, skips type-only declarations and preserves unmapped segments", async () => {
  const { remapNativeSourceMap } = await import(
    "../src/compiler/native-source-map"
  );
  const authored =
    "export type OnlyType = string;\nconst local = 1;\nexport { local as renamed };\nexport const group = {};";
  const generated =
    'const _s = {"group_class":{opacity:1}};\nexport const renamed = 1;\nexport const group = {root:_s["group_class"]};\nconst helper = true;';
  const map = [
    [1, 13, 1, 13],
    [2, 13, 2, 13, "renamed"],
    [3, 13, 3, 13],
    [4, 0, 4, 0],
    [4, 4],
  ];
  expect(remapNativeSourceMap(map, generated, authored)).toEqual([
    [1, 13, 4, 13],
    [2, 13, 3, 9],
    [3, 13, 4, 13],
    [4, 0, 1, 0],
    [4, 4],
  ]);
  expect(remapNativeSourceMap(undefined, generated, authored)).toBeUndefined();
});

it("remaps SDK 58 encoded VLQ coordinates as well as legacy Metro tuples", async () => {
  const { remapNativeSourceMap } = await import(
    "../src/compiler/native-source-map"
  );
  const authored = "export const x=1;",
    generated = "\n\n\n\n\n\n\n\n\nexport const x=1;";
  expect(
    remapNativeSourceMap({ mappings: "AASA", names: [] }, generated, authored),
  ).toEqual({ mappings: "AAAA", names: [] });
});


it.each([
  ["decorators", "compat.css.ts", "ts", "function mark(_: unknown) {}\n@mark class Helper {}\nexport const title = 1;"],
  ["legacy import assertions", "compat.css.ts", "ts", 'import data from "./data.json" assert { type: "json" };\nexport const title = data;'],
  ["import attributes", "compat.css.ts", "ts", 'import data from "./data.json" with { type: "json" };\nexport const title = data;'],
  ["TSX", "compat.css.tsx", "tsx", "const helper = <View />;\nexport const title = helper;"],
  ["JSX", "compat.css.jsx", "jsx", "const helper = <View />;\nexport const title = helper;"],
  ["TS angle assertions", "compat.css.ts", "ts", "const helper = <number>1;\nexport const title = helper;"],
] as const)("preserves esbuild-supported %s during source remapping", async (_label, filename, loader, authored) => {
  const integrationRequire = createRequire(import.meta.resolve("@vanilla-extract/integration"));
  const { transform: compile } = integrationRequire("esbuild");
  const { remapNativeSourceMap } = await import("../src/compiler/native-source-map");
  // The existing compiler accepts this syntax before source mapping runs.
  await compile(authored, { loader, sourcefile: filename });
  const generated = "export const title = 1;";
  const point = authored.slice(0, authored.indexOf("export const title")).split("\n");
  expect(remapNativeSourceMap([[1, 13, 1, 13]], generated, authored, filename)).toEqual([[1, 13, point.length, 13]]);
});
