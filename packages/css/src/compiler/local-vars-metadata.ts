import { localOperandCandidate, NativeLocalVarType, nativeLocalVarKey, type AnyLocalVar } from "../local-vars/model";
import { admitLocalOperand, assertLocalDefinitions } from "../local-vars/admission";
import { isThemeTokenReference } from "../theme-token";
import { ExportRecordType } from "../export-values";
export type NativeLocalVarsMetadata = {
  readonly $$type: "crumbs.css.local-vars-metadata";
  readonly version: 1;
  readonly definitions: readonly AnyLocalVar[];
  readonly uses: readonly {
    readonly exportPath: string;
    readonly property: string;
    readonly localVars: readonly string[];
    readonly tokens: readonly string[];
  }[];
};
export function createLocalVarsMetadata(classes: ReadonlyMap<string, Record<string, unknown>>, exports: ReadonlyMap<string, unknown>, captured: readonly AnyLocalVar[] = []): NativeLocalVarsMetadata | undefined {
  const definitions: AnyLocalVar[] = [...captured], uses: {
    exportPath: string;
    property: string;
    localVars: readonly string[];
    tokens: readonly string[];
  }[] = [];
  function operands(value: unknown, vars: AnyLocalVar[], tokens: Set<string>): void {
    if (localOperandCandidate(value)) {
      const v = admitLocalOperand(value);
      vars.push(...(v.$$type === NativeLocalVarType ? [v] : v.variables));
      if (v.$$type !== NativeLocalVarType && v.terminal.kind === "theme")
        tokens.add(v.terminal.reference.varName);
      return;
    }
    if (isThemeTokenReference(value)) {
      tokens.add(value.varName);
      return;
    }
    if (value && typeof value === "object")
      for (const item of Object.values(value))
        operands(item, vars, tokens);
  }
  function visit(value: unknown, path: string): void {
    if (value && typeof value === "object" && "$$type" in value && value.$$type === "crumbs.css.class" && "className" in value && typeof value.className === "string") {
      const style = classes.get(value.className);
      if (style)
        for (const [property, operand] of Object.entries(style)) {
          const vars: AnyLocalVar[] = [], tokens = new Set<string>();
          operands(operand, vars, tokens);
          definitions.push(...vars);
          if (vars.length)
            uses.push({ exportPath: path, property, localVars: Object.freeze([...new Set(vars.map(nativeLocalVarKey))].sort()), tokens: Object.freeze([...tokens].sort()) });
        }
      return;
    }
    if (localOperandCandidate(value)) {
      operands(value, definitions, new Set());
      return;
    }
    if (value && typeof value === "object" && "$$type" in value && value.$$type === ExportRecordType && "entries" in value) {
      for (const [key, item] of value.entries as readonly (readonly [
        string,
        unknown
      ])[])
        visit(item, `${path}.${key}`);
      return;
    }
    if (value && typeof value === "object")
      for (const [key, item] of Object.entries(value))
        visit(item, `${path}.${key}`);
  }
  for (const [name, value] of exports)
    visit(value, name);
  if (!definitions.length)
    return undefined;
  assertLocalDefinitions(definitions);
  const table = new Map(definitions.map(d => [nativeLocalVarKey(d), d]));
  return Object.freeze({ $$type: "crumbs.css.local-vars-metadata", version: 1, definitions: Object.freeze([...table].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, v]) => v)), uses: Object.freeze(uses.sort((a, b) => a.exportPath.localeCompare(b.exportPath) || a.property.localeCompare(b.property)).map(v => Object.freeze(v))) });
}
