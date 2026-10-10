import { a as NativeLocalFallback, c as NativeLocalVarShape, d as ResolvedAssignedStyles, l as NativeLocalVarValues, s as NativeLocalVar, u as NativeVarAssignments } from "./model-DAuWjF1q.mjs";
import { L as NativeTheme } from "./domains-DjWDvNbl.mjs";

//#region src/local-vars/assignments.d.ts
declare function assignVars<const S extends NativeLocalVarShape>(shape: S, values: NativeLocalVarValues<S>): NativeVarAssignments;
//#endregion
//#region src/local-vars/resolver.d.ts
type Styles = Readonly<Record<string, unknown>>;
declare function resolveAssignedStyles<const S extends Styles, TContract extends Record<string, unknown> = Record<string, unknown>>(styles: S, assignments: NativeVarAssignments, theme?: NativeTheme<TContract>): ResolvedAssignedStyles<S>;
//#endregion
//#region src/local-vars/react.d.ts
declare function useAssignedStyles<const S extends Readonly<Record<string, unknown>>>(styles: S, assignments: NativeVarAssignments): ResolvedAssignedStyles<S>;
//#endregion
export { type NativeLocalFallback, type NativeLocalVar, type NativeLocalVarShape, type NativeLocalVarValues, type NativeVarAssignments, type ResolvedAssignedStyles, assignVars, resolveAssignedStyles, useAssignedStyles };