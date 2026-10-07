import { ThemeProvider, useThemedStyles, type ResolvedThemeStyles } from "../dist/theme-react.mjs"
import type { NativeTheme } from "../src/native-style"

declare const theme: NativeTheme<{ readonly color: string }>
const providerProps: Parameters<typeof ThemeProvider<{ readonly color: string }>>[0] = { theme }
const resolved: ResolvedThemeStyles<{ readonly root: { readonly opacity: number } }> = {
  root: { opacity: 1 },
}
const hook: typeof useThemedStyles = useThemedStyles
void providerProps
void resolved
void hook
