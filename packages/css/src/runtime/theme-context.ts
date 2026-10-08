import { createContext, use, useMemo, useSyncExternalStore } from "react";
import type { NativeTheme } from "../theme-contract";
import { createThemeSelectorStore, type ThemeStore, type ThemeSelectorStore } from "./theme-store";
export type NativeThemeContextValue = NativeTheme<Record<string, unknown>>;
export type NativeThemeStore = ThemeStore<NativeThemeContextValue>;
const key = Symbol.for("crumbs.css.theme-store-context.v1");
function sharedContext(){
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,key)
 if(descriptor&&"value" in descriptor)return descriptor.value as ReturnType<typeof createContext<NativeThemeStore|null>>
 const value=createContext<NativeThemeStore|null>(null)
 Object.defineProperty(globalThis,key,{value,enumerable:false,configurable:false,writable:false})
 return value
}
export const ThemeStoreContext=sharedContext()
/** Select the existing provider store; literal local styles also work without it. */
export function useOptionalThemeSelection<T>(selector: (theme: NativeThemeContextValue | undefined) => T): T {
  const parent = use(ThemeStoreContext);
  const selected = useMemo<ThemeSelectorStore<T>>(() => {
    if (parent)
      return createThemeSelectorStore(parent, selector);
    const snapshot = selector(undefined);
    return { getSnapshot: () => snapshot, subscribe: () => () => undefined, dispose: () => undefined };
  }, [parent, selector]);
  return useSyncExternalStore(selected.subscribe, selected.getSnapshot, selected.getSnapshot);
}
