//#region src/conditions/values.d.ts
/**
 * Condition names are ordered so responsive tuples have a finite, reviewable
 * meaning. `default` must be the first name and represents the unqualified
 * branch.
 */
type NativeConditionNameList = readonly ["default", ...string[]];
type NativeConditionalRecord<TValue, TConditions extends readonly string[]> = Readonly<Partial<Record<TConditions[number], TValue | null | undefined>>> & {
  readonly length?: never;
};
/** A bounded tuple whose positions correspond to the configured condition names. */
type NativeConditionalTuple<TValue, TConditions extends readonly string[]> = { readonly [K in keyof TConditions]: TValue | null | undefined };
type NativeConditionalScalar<TValue> = TValue extends readonly unknown[] ? never : TValue;
type NativeConditionalValue<TValue, TConditions extends NativeConditionNameList> = NativeConditionalScalar<TValue> | NativeConditionalRecord<TValue, TConditions> | NativeConditionalTuple<TValue, TConditions>;
type NativeNormalizedConditionalValue<TValue, TConditions extends readonly string[]> = Readonly<Partial<Record<TConditions[number], TValue>>>;
type NativeConditionDefinitions<TConditions extends NativeConditionNameList> = Readonly<Record<TConditions[number], NativeConditionMatcher>>;
declare const NATIVE_RESPONSIVE_CONDITION_NAMES: readonly ["default", "compact", "medium", "expanded"];
declare const NATIVE_RESPONSIVE_CONDITION_MATCHERS: Readonly<{
  readonly default: Readonly<{}>;
  readonly compact: Readonly<{
    widthBucket: "compact";
  }>;
  readonly medium: Readonly<{
    widthBucket: "medium";
  }>;
  readonly expanded: Readonly<{
    widthBucket: "expanded";
  }>;
}>;
type NativeNormalizeValueFn<TConditions extends NativeConditionNameList> = {
  <TValue>(value: NativeConditionalRecord<TValue, TConditions>): NativeNormalizedConditionalValue<TValue, TConditions>;
  <TValue>(value: NativeConditionalTuple<TValue, TConditions>): NativeNormalizedConditionalValue<TValue, TConditions>;
  <TValue>(value: NativeConditionalScalar<TValue>): NativeNormalizedConditionalValue<TValue, TConditions>;
};
/**
 * Create a finite conditional-value normalizer. Scalar values become the
 * `default` branch; records and bounded tuples are emitted in configured
 * condition order with nullish entries omitted.
 */
declare function createNativeNormalizeValueFn<const TConditions extends NativeConditionNameList>(conditions: TConditions): NativeNormalizeValueFn<TConditions>;
type NativeConditionValueMapper<TValue, TOutput, TCondition extends string> = (value: TValue, condition: TCondition) => TOutput;
type NativeMapValueFn<TConditions extends NativeConditionNameList> = {
  <TValue, TOutput>(value: NativeConditionalRecord<TValue, TConditions>, mapper: NativeConditionValueMapper<TValue, TOutput, TConditions[number]>): NativeNormalizedConditionalValue<TOutput, TConditions>;
  <TValue, TOutput>(value: NativeConditionalTuple<TValue, TConditions>, mapper: NativeConditionValueMapper<TValue, TOutput, TConditions[number]>): NativeNormalizedConditionalValue<TOutput, TConditions>;
  <TValue, TOutput>(value: NativeConditionalScalar<TValue>, mapper: NativeConditionValueMapper<TValue, TOutput, TConditions[number]>): NativeNormalizedConditionalValue<TOutput, TConditions>;
};
/**
 * Create a mapper that first canonicalises a conditional value and then maps
 * only present entries. The condition name is provided for diagnostics or
 * domain-specific mapping while output order stays deterministic.
 */
declare function createNativeMapValueFn<const TConditions extends NativeConditionNameList>(conditions: TConditions): NativeMapValueFn<TConditions>;
/**
 * Attach finite matchers to a normalized value so it can be consumed by the
 * M6.1 condition resolver. Missing values do not create branches, preserving
 * fallback behaviour for snapshots with no matching declaration.
 */
declare function mapNativeConditionValueToBranches<TValue, const TConditions extends NativeConditionNameList>(value: NativeConditionalRecord<TValue, TConditions>, definitions: NativeConditionDefinitions<TConditions>): ReadonlyArray<NativeConditionBranch<TValue>>;
declare function mapNativeConditionValueToBranches<TValue, const TConditions extends NativeConditionNameList>(value: NativeConditionalTuple<TValue, TConditions>, definitions: NativeConditionDefinitions<TConditions>): ReadonlyArray<NativeConditionBranch<TValue>>;
declare function mapNativeConditionValueToBranches<TValue, const TConditions extends NativeConditionNameList>(value: NativeConditionalScalar<TValue>, definitions: NativeConditionDefinitions<TConditions>): ReadonlyArray<NativeConditionBranch<TValue>>;
//#endregion
//#region src/conditions/index.d.ts
type NativePlatform = "android" | "ios" | "macos" | "visionos" | "web" | "windows" | "unknown";
type NativeWidthBucket = "compact" | "medium" | "expanded";
type NativeHeightBucket = "short" | "regular" | "tall";
type NativeOrientation = "portrait" | "landscape";
type NativeDirection = "ltr" | "rtl";
type NativeFontScaleBucket = "normal" | "large" | "extraLarge";
type NativeMotionPreference = "full" | "reduced";
type NativeContrastPreference = "normal" | "more" | "less";
type NativeConditionSnapshot = Readonly<{
  readonly platform: NativePlatform;
  readonly widthBucket: NativeWidthBucket;
  readonly heightBucket: NativeHeightBucket;
  readonly orientation: NativeOrientation;
  readonly direction: NativeDirection;
  readonly fontScaleBucket: NativeFontScaleBucket;
  readonly motion: NativeMotionPreference;
  readonly contrast: NativeContrastPreference;
}>;
/**
 * Native readings are deliberately transient inputs. They are reduced to the
 * finite snapshot above before they can participate in style identity or
 * cache keys.
 */
type NativeConditionInput = Readonly<{
  readonly platform?: NativePlatform;
  readonly width?: number;
  readonly height?: number;
  readonly isRTL?: boolean;
  readonly fontScale?: number;
  readonly reducedMotion?: boolean;
  readonly contrast?: NativeContrastPreference;
}>;
declare const NATIVE_CONDITION_BREAKPOINTS: Readonly<{
  readonly widthMediumMin: 600;
  readonly widthExpandedMin: 840;
  readonly heightRegularMin: 600;
  readonly heightTallMin: 900;
  readonly fontScaleLargeMin: 1.15;
  readonly fontScaleExtraLargeMin: 1.3;
}>;
declare const defaultNativeConditionSnapshot: Readonly<{
  readonly platform: NativePlatform;
  readonly widthBucket: NativeWidthBucket;
  readonly heightBucket: NativeHeightBucket;
  readonly orientation: NativeOrientation;
  readonly direction: NativeDirection;
  readonly fontScaleBucket: NativeFontScaleBucket;
  readonly motion: NativeMotionPreference;
  readonly contrast: NativeContrastPreference;
}>;
declare function normalizeNativeConditionInput(input?: NativeConditionInput): NativeConditionSnapshot;
/**
 * A stable identity for the finite condition space. Width and height never
 * appear in this key, so continuous resize events cannot create an unbounded
 * cache.
 */
declare function nativeConditionSnapshotKey(snapshot: NativeConditionSnapshot): string;
type NativeConditionMatcher = Partial<NativeConditionSnapshot>;
type NativeConditionBranch<TValue> = Readonly<{
  readonly when?: NativeConditionMatcher;
  readonly value: TValue;
}>;
type NativeConditionBranchDecision = Readonly<{
  readonly matcher: NativeConditionMatcher;
  readonly declarationOrder: number;
  readonly specificity: number;
  readonly matched: boolean;
  readonly selected: boolean;
}>;
type NativeConditionBranchTrace<TValue> = Readonly<{
  readonly value: TValue;
  readonly decisions: ReadonlyArray<NativeConditionBranchDecision>;
}>;
/** @internal Collect branch evidence using the condition resolver's selection rules. */
declare function traceNativeConditionBranches<TValue>(branches: readonly NativeConditionBranch<TValue>[], snapshot: NativeConditionSnapshot, fallback: TValue): NativeConditionBranchTrace<TValue>;
/**
 * Resolve finite condition branches by specificity. A branch matching more
 * axes wins; branches with equal specificity use later declaration order.
 * An empty matcher is the explicit default branch, while `fallback` covers
 * snapshots with no matching branch.
 */
declare function createNativeConditionResolver<TValue>(branches: readonly NativeConditionBranch<TValue>[], fallback: TValue): (snapshot: NativeConditionSnapshot) => TValue;
type NativeConditionSource = Readonly<{
  readonly read: () => NativeConditionInput;
  readonly subscribe: (listener: (patch: NativeConditionInput) => void) => () => void;
}>;
type NativeConditionStoreStats = Readonly<{
  readonly listeners: number;
  readonly activeSources: number;
  readonly starts: number;
  readonly stops: number;
  readonly disposed: boolean;
}>;
type NativeConditionStore = Readonly<{
  readonly getSnapshot: () => NativeConditionSnapshot;
  readonly subscribe: (listener: () => void) => () => void;
  readonly update: (patch: NativeConditionInput) => boolean;
  readonly getStats: () => NativeConditionStoreStats;
  readonly dispose: () => void;
}>;
type NativeConditionStoreOptions = Readonly<{
  readonly initial?: NativeConditionInput;
  readonly sources?: readonly NativeConditionSource[];
}>;
/**
 * Build an immutable-snapshot condition store. Native sources are attached
 * only while at least one consumer is subscribed and are always detached on
 * the final unsubscribe or explicit disposal.
 */
declare function createNativeConditionStore(options?: NativeConditionStoreOptions): NativeConditionStore;
declare function useNativeConditionSnapshot(store: NativeConditionStore): NativeConditionSnapshot;
//#endregion
export { NativeConditionNameList as A, mapNativeConditionValueToBranches as B, nativeConditionSnapshotKey as C, NATIVE_RESPONSIVE_CONDITION_MATCHERS as D, useNativeConditionSnapshot as E, NativeMapValueFn as F, NativeNormalizeValueFn as I, NativeNormalizedConditionalValue as L, NativeConditionalRecord as M, NativeConditionalTuple as N, NATIVE_RESPONSIVE_CONDITION_NAMES as O, NativeConditionalValue as P, createNativeMapValueFn as R, defaultNativeConditionSnapshot as S, traceNativeConditionBranches as T, NativeOrientation as _, NativeConditionInput as a, createNativeConditionResolver as b, NativeConditionSource as c, NativeConditionStoreStats as d, NativeContrastPreference as f, NativeMotionPreference as g, NativeHeightBucket as h, NativeConditionBranchTrace as i, NativeConditionValueMapper as j, NativeConditionDefinitions as k, NativeConditionStore as l, NativeFontScaleBucket as m, NativeConditionBranch as n, NativeConditionMatcher as o, NativeDirection as p, NativeConditionBranchDecision as r, NativeConditionSnapshot as s, NATIVE_CONDITION_BREAKPOINTS as t, NativeConditionStoreOptions as u, NativePlatform as v, normalizeNativeConditionInput as w, createNativeConditionStore as x, NativeWidthBucket as y, createNativeNormalizeValueFn as z };