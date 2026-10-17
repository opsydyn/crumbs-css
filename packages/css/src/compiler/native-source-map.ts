import { decode, encode } from "@jridgewell/sourcemap-codec";
import { parse } from "@babel/parser";

type Point = { readonly line: number; readonly column: number };
type AstNode = {
  readonly type: string;
  readonly loc?: { readonly start: Point; readonly end: Point } | null;
  readonly [key: string]: unknown;
};
type Range = {
  readonly start: Point;
  readonly end: Point;
  readonly authored: Point;
};
const fallback: Point = { line: 1, column: 0 };
const before = (a: Point, b: Point) =>
  a.line < b.line || (a.line === b.line && a.column < b.column);
const node = (value: unknown): value is AstNode =>
  value !== null &&
  typeof value === "object" &&
  typeof (value as AstNode).type === "string";
const list = (value: unknown): readonly AstNode[] =>
  Array.isArray(value) ? value.filter(node) : [];
function name(value: unknown): string | undefined {
  if (!node(value)) return undefined;
  if (value.type === "Identifier" && typeof value.name === "string")
    return value.name;
  if (value.type === "StringLiteral" && typeof value.value === "string")
    return value.value;
  return undefined;
}
function visit(value: AstNode, fn: (value: AstNode) => void): void {
  fn(value);
  for (const child of Object.values(value)) {
    if (node(child)) visit(child, fn);
    else if (Array.isArray(child))
      for (const item of child) if (node(item)) visit(item, fn);
  }
}
function body(source: string, filename: string): readonly AstNode[] {
  return parse(source, {
    sourceType: "module",
    plugins: ["typescript", "decorators-legacy", "importAttributes", "deprecatedImportAssert", ...(/\.[jt]sx$/.test(filename) ? ["jsx" as const] : [])],
  })
    .program.body as unknown as readonly AstNode[];
}
function exportsOf(statement: AstNode): readonly {
  readonly name: string;
  readonly value: AstNode;
  readonly point: Point;
}[] {
  if (
    statement.type !== "ExportNamedDeclaration" ||
    statement.exportKind === "type"
  )
    return [];
  const declaration = statement.declaration;
  if (node(declaration) && declaration.type === "VariableDeclaration") {
    return list(declaration.declarations).flatMap((item) => {
      const key = name(item.id);
      return key === undefined || !node(item.id) || !item.id.loc
        ? []
        : [{ name: key, value: item, point: item.id.loc.start }];
    });
  }
  return list(statement.specifiers).flatMap((item) => {
    const key = name(item.exported);
    return key === undefined || !item.loc
      ? []
      : [{ name: key, value: item, point: item.loc.start }];
  });
}

/** Export-level provenance, not fabricated property-level precision for evaluated styles.
 * Metro maps the upstream input, which is generated JS. Replace those original
 * coordinates with authored export/import anchors; synthetic helpers use file start.
 * Generated coordinates and unmapped segments are preserved across Babel/Rust.
 */
export function remapNativeSourceMap(
  map: unknown,
  generated: string,
  authored: string,
  filename = "style.css.ts",
): unknown {
  if (
    map !== null &&
    typeof map === "object" &&
    "mappings" in map &&
    typeof map.mappings === "string"
  ) {
    const lines = decode(map.mappings);
    const raw = lines.flatMap((segments, line) =>
      segments.map((segment) =>
        segment.length < 4
          ? [line + 1, segment[0]]
          : [line + 1, segment[0], segment[2]! + 1, segment[3]],
      ),
    );
    const remapped = remapNativeSourceMap(
      raw,
      generated,
      authored,
      filename,
    ) as number[][];
    let index = 0;
    const rewritten = lines.map((segments) =>
      segments.map((segment) => {
        const point = remapped[index++]!;
        return segment.length < 4
          ? ([segment[0]] as [number])
          : ([segment[0], segment[1], point[2]! - 1, point[3]!] as [
              number,
              number,
              number,
              number,
            ]);
      }),
    );
    return { ...map, mappings: encode(rewritten), names: [] };
  }
  if (!Array.isArray(map) || map.length === 0) return map;
  const source = body(authored, filename),
    output = body(generated, "generated.js");
  const exportPoints = new Map(
    source.flatMap(exportsOf).map((item) => [item.name, item.point]),
  );
  const importPoints = new Map(
    source.flatMap((item) =>
      item.type === "ImportDeclaration" && item.loc && name(item.source)
        ? [[name(item.source)!, item.loc.start] as const]
        : [],
    ),
  );
  const ranges: Range[] = [],
    classPoints = new Map<string, Point>();
  const add = (value: AstNode, point: Point) => {
    if (value.loc)
      ranges.push({
        start: value.loc.start,
        end: value.loc.end,
        authored: point,
      });
  };
  for (const statement of output) {
    if (statement.type === "ImportDeclaration")
      add(
        statement,
        importPoints.get(name(statement.source) ?? "") ?? fallback,
      );
    for (const item of exportsOf(statement)) {
      const point = exportPoints.get(item.name) ?? fallback;
      add(item.value, point);
      visit(item.value, (value) => {
        if (value.type === "MemberExpression" && name(value.object) === "_s") {
          const key = name(value.property);
          if (key !== undefined && !classPoints.has(key))
            classPoints.set(key, point);
        }
      });
    }
  }
  for (const statement of output)
    visit(statement, (value) => {
      if (
        value.type !== "VariableDeclarator" ||
        name(value.id) !== "_s" ||
        !node(value.init)
      )
        return;
      const init =
        value.init.type === "CallExpression"
          ? list(value.init.arguments)[0]
          : value.init;
      if (init?.type !== "ObjectExpression") return;
      for (const property of list(init.properties)) {
        const point = classPoints.get(name(property.key) ?? "");
        if (point !== undefined) add(property, point);
      }
    });
  ranges.sort(
    (a, b) => a.start.line - b.start.line || a.start.column - b.start.column,
  );
  return map.map((segment) => {
    if (
      !Array.isArray(segment) ||
      segment.length < 4 ||
      typeof segment[2] !== "number" ||
      typeof segment[3] !== "number"
    )
      return segment;
    const point = { line: segment[2], column: segment[3] };
    let lo = 0,
      hi = ranges.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (before(point, ranges[mid]!.start)) hi = mid;
      else lo = mid + 1;
    }
    const candidate = ranges[lo - 1];
    const anchor =
      candidate && before(point, candidate.end) ? candidate.authored : fallback;
    // Generated helper names are not authored bindings.
    return [segment[0], segment[1], anchor.line, anchor.column];
  });
}

export function remapNativeTransformMaps(
  result: Record<string, unknown>,
  generated: string,
  authored: string,
  filename = "style.css.ts",
): Record<string, unknown> {
  const output = Array.isArray(result.output)
    ? result.output.map((item) => {
        if (
          item === null ||
          typeof item !== "object" ||
          item.data === null ||
          typeof item.data !== "object" ||
          item.data.map === undefined
        )
          return item;
        return {
          ...item,
          data: {
            ...item.data,
            map: remapNativeSourceMap(item.data.map, generated, authored, filename),
          },
        };
      })
    : result.output;
  return {
    ...result,
    ...(result.map === undefined
      ? {}
      : { map: remapNativeSourceMap(result.map, generated, authored, filename) }),
    ...(output === undefined ? {} : { output }),
  };
}
