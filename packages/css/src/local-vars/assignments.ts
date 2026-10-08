import { NativeStylesDiagnosticCode as Code } from "../diagnostics";
import { NativeLocalVarType, NativeVarAssignmentsType, type NativeLocalVarShape, type NativeLocalVarValues, type NativeVarAssignments } from "./model";
import { copyLocalData, exactLocalRecord, readLocalVar, localError, admitVarAssignments } from "./admission";
export function assignVars<const S extends NativeLocalVarShape>(shape: S, values: NativeLocalVarValues<S>): NativeVarAssignments {
  const s = copyLocalData(shape, Code.InvalidLocalAssignments), v = copyLocalData(values, Code.InvalidLocalAssignments);
  const bindings: {
    variable: unknown;
    value: unknown;
  }[] = [];
  function visit(node: unknown, value: unknown, path: string): void {
    if (typeof node !== "object" || node === null || Array.isArray(node))
      localError(Code.InvalidLocalAssignments, path, "invalid shape");
    const n = node as Record<string, unknown>;
    if (n.$$type === NativeLocalVarType) {
      bindings.push({ variable: readLocalVar(n, path), value });
      return;
    }
    const fields = Object.keys(n);
    const val = exactLocalRecord(value, fields, Code.InvalidLocalAssignments, path);
    for (const key of fields)
      visit(n[key], val[key], `${path}.${key}`);
  }
  visit(s, v, "assignVars");
  return admitVarAssignments({ $$type: NativeVarAssignmentsType, version: 1, bindings });
}
