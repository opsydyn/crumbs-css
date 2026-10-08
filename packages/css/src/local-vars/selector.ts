import type { NativeTheme } from "../theme-contract";
import type { NativeVarAssignments, ResolvedAssignedStyles } from "./model";
import { resolveAssignedState, type AssignedResolutionState, type AssignedThemeSnapshot } from "./resolver";
export function createAssignedStyleSelector<const S extends Readonly<Record<string, unknown>>>(styles: S): (assignments: NativeVarAssignments, theme?: AssignedThemeSnapshot) => ResolvedAssignedStyles<S> {
  let committed: AssignedResolutionState | undefined;
  return (assignments, theme) => { const next = resolveAssignedState(styles, assignments, theme, committed); committed = next; return next.result as ResolvedAssignedStyles<S>; };
}
