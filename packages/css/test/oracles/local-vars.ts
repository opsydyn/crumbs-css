export type OracleOperand = {
  kind: "literal";
  value: unknown;
} | {
  kind: "local";
  id: string;
} | {
  kind: "fallback";
  ids: readonly string[];
  terminal: OracleOperand;
} | {
  kind: "theme";
  id: string;
};
export type OracleDeclaration = {
  property: string;
  value: OracleOperand;
};
export function evaluateLocalStyle(declarations: readonly OracleDeclaration[], assignments: ReadonlyMap<string, string | number>, themeValues: ReadonlyMap<string, string | number>): Readonly<Record<string, unknown>> {
  const winners = new Map<string, OracleOperand>();
  for (const d of declarations) {
    winners.delete(d.property);
    winners.set(d.property, d.value);
  }
  function value(v: OracleOperand): unknown { switch (v.kind) {
    case "literal": return v.value;
    case "local":
      if (!assignments.has(v.id))
        throw Error("missing local");
      return assignments.get(v.id);
    case "theme":
      if (!themeValues.has(v.id))
        throw Error("missing theme");
      return themeValues.get(v.id);
    case "fallback":
      for (const id of v.ids)
        if (assignments.has(id))
          return assignments.get(id);
      return value(v.terminal);
  } }
  return Object.freeze(Object.fromEntries([...winners].map(([k, v]) => [k, value(v)])));
}
