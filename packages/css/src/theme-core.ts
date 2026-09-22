/**
 * Lean runtime theme surface for common component consumers.
 *
 * The compatibility `@opsydyn/crumbs-css/theme` entrypoint retains token
 * scopes, dependency plans and recipe controls. Keeping those APIs out of
 * this entrypoint lets common theme reads ship a smaller independent graph.
 */
export {
  createThemeTokenReference,
  createNativeConditionResolver,
  createNativeConditionStore,
  defaultNativeConditionSnapshot,
  isThemeTokenReference,
  nativeConditionSnapshotKey,
  NATIVE_CONDITION_BREAKPOINTS,
  normalizeNativeConditionInput,
  NativeThemeTokenReferenceType,
  ThemeProvider,
  resolveThemeStyles,
  resolveThemeTokens,
  useNativeConditionSnapshot,
  useTheme,
  useThemeSelector,
  useThemedStyle,
  useThemedStyles,
} from "./theme-runtime"

export type {
  NativeConditionBranch,
  NativeConditionInput,
  NativeConditionMatcher,
  NativeConditionSnapshot,
  NativeConditionSource,
  NativeConditionStore,
  NativeConditionStoreOptions,
  NativeConditionStoreStats,
  NativeContrastPreference,
  NativeDirection,
  NativeFontScaleBucket,
  NativeHeightBucket,
  NativeMotionPreference,
  NativeOrientation,
  NativePlatform,
  NativeWidthBucket,
  NativeThemeTokenReference,
  ResolvedThemeStyles,
} from "./theme-runtime"
