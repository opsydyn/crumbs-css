/**
 * Lean runtime theme surface for common component consumers.
 *
 * The compatibility `@opsydyn/crumbs-css/theme` entrypoint retains token
 * scopes, dependency plans and recipe controls. Keeping those APIs out of
 * this entrypoint lets common theme reads ship a smaller independent graph.
 */
export {
  createNativeMapValueFn,
  createNativeNormalizeValueFn,
  createThemeTokenReference,
  createNativeConditionResolver,
  createNativeConditionStore,
  defaultNativeConditionSnapshot,
  isThemeTokenReference,
  mapNativeConditionValueToBranches,
  nativeConditionSnapshotKey,
  NATIVE_CONDITION_BREAKPOINTS,
  NATIVE_RESPONSIVE_CONDITION_MATCHERS,
  NATIVE_RESPONSIVE_CONDITION_NAMES,
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
  NativeConditionDefinitions,
  NativeConditionBranch,
  NativeConditionInput,
  NativeConditionMatcher,
  NativeConditionNameList,
  NativeConditionSnapshot,
  NativeConditionSource,
  NativeConditionStore,
  NativeConditionStoreOptions,
  NativeConditionStoreStats,
  NativeConditionValueMapper,
  NativeContrastPreference,
  NativeConditionalRecord,
  NativeConditionalTuple,
  NativeConditionalValue,
  NativeMapValueFn,
  NativeNormalizedConditionalValue,
  NativeNormalizeValueFn,
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
