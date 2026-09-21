/**
 * Lean runtime theme surface for common component consumers.
 *
 * The compatibility `@opsydyn/crumbs-css/theme` entrypoint retains token
 * scopes, dependency plans and recipe controls. Keeping those APIs out of
 * this entrypoint lets common theme reads ship a smaller independent graph.
 */
export {
  createThemeTokenReference,
  isThemeTokenReference,
  NativeThemeTokenReferenceType,
  ThemeProvider,
  resolveThemeStyles,
  resolveThemeTokens,
  useTheme,
  useThemeSelector,
  useThemedStyle,
  useThemedStyles,
} from "./theme-runtime"

export type {
  NativeThemeTokenReference,
  ResolvedThemeStyles,
} from "./theme-runtime"
