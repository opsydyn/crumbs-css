import { useCallback, useMemo } from "react";
import { useOptionalThemeSelection, type NativeThemeContextValue } from "../runtime/theme-context";
import { createAssignedStyleSelector } from "./selector";
import type { NativeVarAssignments, ResolvedAssignedStyles } from "./model";
export function useAssignedStyles<const S extends Readonly<Record<string, unknown>>>(styles: S, assignments: NativeVarAssignments): ResolvedAssignedStyles<S> {
  const resolve = useMemo(() => createAssignedStyleSelector(styles), [styles]);
  const select = useCallback((theme: NativeThemeContextValue | undefined) => resolve(assignments, theme), [assignments, resolve]);
  return useOptionalThemeSelection(select);
}
