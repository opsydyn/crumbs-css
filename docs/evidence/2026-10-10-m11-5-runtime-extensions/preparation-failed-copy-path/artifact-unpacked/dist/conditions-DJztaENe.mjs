import { useSyncExternalStore } from "react";
//#region src/conditions/values.ts
const NATIVE_RESPONSIVE_CONDITION_NAMES = [
	"default",
	"compact",
	"medium",
	"expanded"
];
const NATIVE_RESPONSIVE_CONDITION_MATCHERS = Object.freeze({
	default: Object.freeze({}),
	compact: Object.freeze({ widthBucket: "compact" }),
	medium: Object.freeze({ widthBucket: "medium" }),
	expanded: Object.freeze({ widthBucket: "expanded" })
});
function isRecord$1(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function validateConditionNames(conditions) {
	if (conditions.length === 0 || conditions[0] !== "default") throw new TypeError("native condition names must start with \"default\"");
	if (conditions.some((condition) => typeof condition !== "string" || condition.length === 0)) throw new TypeError("native condition names must be non-empty strings");
	if (new Set(conditions).size !== conditions.length) throw new TypeError("native condition names must be unique");
	return Object.freeze([...conditions]);
}
function canonicalize(conditions, value) {
	const conditionSet = new Set(conditions);
	const output = {};
	const add = (condition, candidate) => {
		if (candidate === null || candidate === void 0) return;
		output[condition] = candidate;
	};
	if (Array.isArray(value)) {
		if (value.length > conditions.length) throw new TypeError(`responsive tuple has at most ${conditions.length} entries`);
		for (let index = 0; index < value.length; index += 1) add(conditions[index], value[index]);
	} else if (isRecord$1(value)) {
		for (const key of Object.keys(value)) if (!conditionSet.has(key)) throw new TypeError(`Unsupported native condition name: ${key}`);
		for (const condition of conditions) if (Object.prototype.hasOwnProperty.call(value, condition)) add(condition, value[condition]);
	} else add("default", value);
	return Object.freeze(output);
}
/**
* Create a finite conditional-value normalizer. Scalar values become the
* `default` branch; records and bounded tuples are emitted in configured
* condition order with nullish entries omitted.
*/
function createNativeNormalizeValueFn(conditions) {
	const names = validateConditionNames(conditions);
	return ((value) => canonicalize(names, value));
}
/**
* Create a mapper that first canonicalises a conditional value and then maps
* only present entries. The condition name is provided for diagnostics or
* domain-specific mapping while output order stays deterministic.
*/
function createNativeMapValueFn(conditions) {
	const names = validateConditionNames(conditions);
	return ((value, mapper) => {
		const normalized = canonicalize(names, value);
		const mapped = {};
		for (const condition of names) if (Object.prototype.hasOwnProperty.call(normalized, condition)) mapped[condition] = mapper(normalized[condition], condition);
		return Object.freeze(mapped);
	});
}
function mapNativeConditionValueToBranches(value, definitions) {
	const normalized = createNativeNormalizeValueFn(Object.keys(definitions))(value);
	const names = Object.keys(definitions);
	if (names.length === 0 || names[0] !== "default") throw new TypeError("native condition definitions must start with \"default\"");
	if (new Set(names).size !== names.length) throw new TypeError("native condition definitions must be unique");
	for (const name of names) if (!isRecord$1(definitions[name])) throw new TypeError(`Condition matcher for ${name} must be an object`);
	const branches = [];
	for (const name of names) if (Object.prototype.hasOwnProperty.call(normalized, name)) branches.push({
		when: definitions[name],
		value: normalized[name]
	});
	return Object.freeze(branches);
}
//#endregion
//#region src/conditions/index.ts
const NATIVE_CONDITION_BREAKPOINTS = Object.freeze({
	widthMediumMin: 600,
	widthExpandedMin: 840,
	heightRegularMin: 600,
	heightTallMin: 900,
	fontScaleLargeMin: 1.15,
	fontScaleExtraLargeMin: 1.3
});
const NATIVE_PLATFORMS = [
	"android",
	"ios",
	"macos",
	"visionos",
	"web",
	"windows",
	"unknown"
];
const WIDTH_BUCKETS = [
	"compact",
	"medium",
	"expanded"
];
const HEIGHT_BUCKETS = [
	"short",
	"regular",
	"tall"
];
const ORIENTATIONS = ["portrait", "landscape"];
const DIRECTIONS = ["ltr", "rtl"];
const FONT_SCALE_BUCKETS = [
	"normal",
	"large",
	"extraLarge"
];
const MOTION_PREFERENCES = ["full", "reduced"];
const CONTRAST_PREFERENCES = [
	"normal",
	"more",
	"less"
];
const CONDITION_KEYS = [
	"platform",
	"widthBucket",
	"heightBucket",
	"orientation",
	"direction",
	"fontScaleBucket",
	"motion",
	"contrast"
];
const DEFAULT_INPUT = Object.freeze({
	platform: "unknown",
	width: 0,
	height: 0,
	isRTL: false,
	fontScale: 1,
	reducedMotion: false,
	contrast: "normal"
});
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isOneOf(values, value) {
	return typeof value === "string" && values.includes(value);
}
function assertInputKeys(input) {
	if (!isRecord(input)) throw new TypeError("native condition input must be an object");
	const allowed = new Set([
		"platform",
		"width",
		"height",
		"isRTL",
		"fontScale",
		"reducedMotion",
		"contrast"
	]);
	for (const key of Object.keys(input)) if (!allowed.has(key)) throw new TypeError(`Unsupported native condition input: ${key}`);
}
function finiteNonNegative(name, value) {
	if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new TypeError(`${name} must be a finite non-negative number`);
	return value;
}
function finitePositive(name, value) {
	if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) throw new TypeError(`${name} must be a finite positive number`);
	return value;
}
function contrastPreference(value) {
	if (!isOneOf(CONTRAST_PREFERENCES, value)) throw new TypeError("contrast must be one of normal, more, or less");
	return value;
}
function applyInputPatch(previous, patch) {
	assertInputKeys(patch);
	const next = {
		platform: previous.platform,
		width: previous.width,
		height: previous.height,
		isRTL: previous.isRTL,
		fontScale: previous.fontScale,
		reducedMotion: previous.reducedMotion,
		contrast: previous.contrast
	};
	if ("platform" in patch) {
		if (!isOneOf(NATIVE_PLATFORMS, patch.platform)) throw new TypeError(`platform must be one of ${NATIVE_PLATFORMS.join(", ")}`);
		next.platform = patch.platform;
	}
	if ("width" in patch) next.width = finiteNonNegative("width", patch.width);
	if ("height" in patch) next.height = finiteNonNegative("height", patch.height);
	if ("isRTL" in patch) {
		if (typeof patch.isRTL !== "boolean") throw new TypeError("isRTL must be a boolean");
		next.isRTL = patch.isRTL;
	}
	if ("fontScale" in patch) next.fontScale = finitePositive("fontScale", patch.fontScale);
	if ("reducedMotion" in patch) {
		if (typeof patch.reducedMotion !== "boolean") throw new TypeError("reducedMotion must be a boolean");
		next.reducedMotion = patch.reducedMotion;
	}
	if ("contrast" in patch) next.contrast = contrastPreference(patch.contrast);
	return Object.freeze(next);
}
function widthBucket(width) {
	if (width < NATIVE_CONDITION_BREAKPOINTS.widthMediumMin) return "compact";
	if (width < NATIVE_CONDITION_BREAKPOINTS.widthExpandedMin) return "medium";
	return "expanded";
}
function heightBucket(height) {
	if (height < NATIVE_CONDITION_BREAKPOINTS.heightRegularMin) return "short";
	if (height < NATIVE_CONDITION_BREAKPOINTS.heightTallMin) return "regular";
	return "tall";
}
function fontScaleBucket(fontScale) {
	if (fontScale < NATIVE_CONDITION_BREAKPOINTS.fontScaleLargeMin) return "normal";
	if (fontScale < NATIVE_CONDITION_BREAKPOINTS.fontScaleExtraLargeMin) return "large";
	return "extraLarge";
}
function snapshotFromInput(input) {
	return Object.freeze({
		platform: input.platform,
		widthBucket: widthBucket(input.width),
		heightBucket: heightBucket(input.height),
		orientation: input.width > input.height ? "landscape" : "portrait",
		direction: input.isRTL ? "rtl" : "ltr",
		fontScaleBucket: fontScaleBucket(input.fontScale),
		motion: input.reducedMotion ? "reduced" : "full",
		contrast: input.contrast
	});
}
const defaultNativeConditionSnapshot = snapshotFromInput(DEFAULT_INPUT);
function normalizeNativeConditionInput(input = {}) {
	return snapshotFromInput(applyInputPatch(DEFAULT_INPUT, input));
}
/**
* A stable identity for the finite condition space. Width and height never
* appear in this key, so continuous resize events cannot create an unbounded
* cache.
*/
function nativeConditionSnapshotKey(snapshot) {
	return [
		snapshot.platform,
		snapshot.widthBucket,
		snapshot.heightBucket,
		snapshot.orientation,
		snapshot.direction,
		snapshot.fontScaleBucket,
		snapshot.motion,
		snapshot.contrast
	].join("|");
}
function assertMatcherValue(key, value) {
	if (!(key === "platform" && isOneOf(NATIVE_PLATFORMS, value) || key === "widthBucket" && isOneOf(WIDTH_BUCKETS, value) || key === "heightBucket" && isOneOf(HEIGHT_BUCKETS, value) || key === "orientation" && isOneOf(ORIENTATIONS, value) || key === "direction" && isOneOf(DIRECTIONS, value) || key === "fontScaleBucket" && isOneOf(FONT_SCALE_BUCKETS, value) || key === "motion" && isOneOf(MOTION_PREFERENCES, value) || key === "contrast" && isOneOf(CONTRAST_PREFERENCES, value))) throw new TypeError(`Invalid native condition matcher value for ${key}`);
}
function prepareMatcher(matcher) {
	if (!isRecord(matcher)) throw new TypeError("native condition matcher must be an object");
	for (const key of Object.keys(matcher)) {
		if (!CONDITION_KEYS.includes(key)) throw new TypeError(`Unsupported native condition matcher: ${key}`);
		assertMatcherValue(key, matcher[key]);
	}
	return Object.freeze({ ...matcher });
}
function prepareBranches(branches) {
	return branches.map((branch) => {
		if (!isRecord(branch)) throw new TypeError("native condition branch must be an object");
		const matcher = prepareMatcher(branch.when ?? {});
		return Object.freeze({
			matcher,
			value: branch.value
		});
	});
}
function matchingBranchIndex(prepared, snapshot) {
	let winner = -1;
	let winnerSpecificity = -1;
	for (let index = 0; index < prepared.length; index += 1) {
		const matcher = prepared[index].matcher;
		const keys = Object.keys(matcher);
		if (keys.every((key) => snapshot[key] === matcher[key]) && keys.length >= winnerSpecificity) {
			winner = index;
			winnerSpecificity = keys.length;
		}
	}
	return winner;
}
/** @internal Collect branch evidence using the condition resolver's selection rules. */
function traceNativeConditionBranches(branches, snapshot, fallback) {
	const prepared = prepareBranches(branches);
	const selectedIndex = matchingBranchIndex(prepared, snapshot);
	return Object.freeze({
		value: selectedIndex < 0 ? fallback : prepared[selectedIndex].value,
		decisions: Object.freeze(prepared.map(({ matcher }, declarationOrder) => {
			const keys = Object.keys(matcher);
			const matched = keys.every((key) => snapshot[key] === matcher[key]);
			return Object.freeze({
				matcher,
				declarationOrder,
				specificity: keys.length,
				matched,
				selected: declarationOrder === selectedIndex
			});
		}))
	});
}
/**
* Resolve finite condition branches by specificity. A branch matching more
* axes wins; branches with equal specificity use later declaration order.
* An empty matcher is the explicit default branch, while `fallback` covers
* snapshots with no matching branch.
*/
function createNativeConditionResolver(branches, fallback) {
	const prepared = prepareBranches(branches);
	return (snapshot) => {
		const selectedIndex = matchingBranchIndex(prepared, snapshot);
		return selectedIndex < 0 ? fallback : prepared[selectedIndex].value;
	};
}
/**
* Build an immutable-snapshot condition store. Native sources are attached
* only while at least one consumer is subscribed and are always detached on
* the final unsubscribe or explicit disposal.
*/
function createNativeConditionStore(options = {}) {
	const sources = [...options.sources ?? []];
	let input = applyInputPatch(DEFAULT_INPUT, options.initial ?? {});
	for (const source of sources) input = applyInputPatch(input, source.read());
	let snapshot = snapshotFromInput(input);
	let disposed = false;
	let active = false;
	let starts = 0;
	let stops = 0;
	let sourceUnsubscribers = [];
	const listeners = /* @__PURE__ */ new Set();
	const update = (patch) => {
		if (disposed) throw new Error("Native condition store has been disposed");
		input = applyInputPatch(input, patch);
		const next = snapshotFromInput(input);
		if (nativeConditionSnapshotKey(snapshot) === nativeConditionSnapshotKey(next)) return false;
		snapshot = next;
		for (const listener of [...listeners]) if (listeners.has(listener)) listener();
		return true;
	};
	const deactivate = () => {
		if (!active) return;
		for (const unsubscribe of sourceUnsubscribers.reverse()) unsubscribe();
		sourceUnsubscribers = [];
		active = false;
		stops += 1;
	};
	const activate = () => {
		if (active || disposed) return;
		const pending = [];
		try {
			for (const source of sources) pending.push(source.subscribe(update));
			sourceUnsubscribers = pending;
			active = true;
			starts += 1;
			for (const source of sources) update(source.read());
		} catch (error) {
			for (const unsubscribe of pending.reverse()) unsubscribe();
			sourceUnsubscribers = [];
			if (active) {
				active = false;
				stops += 1;
			}
			throw error;
		}
	};
	return {
		getSnapshot: () => snapshot,
		subscribe(listener) {
			if (disposed) return () => void 0;
			listeners.add(listener);
			if (listeners.size === 1) try {
				activate();
			} catch (error) {
				listeners.delete(listener);
				throw error;
			}
			let subscribed = true;
			return () => {
				if (!subscribed) return;
				subscribed = false;
				listeners.delete(listener);
				if (listeners.size === 0) deactivate();
			};
		},
		update,
		getStats: () => Object.freeze({
			listeners: listeners.size,
			activeSources: active ? sources.length : 0,
			starts,
			stops,
			disposed
		}),
		dispose() {
			if (disposed) return;
			deactivate();
			disposed = true;
			listeners.clear();
		}
	};
}
function useNativeConditionSnapshot(store) {
	return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
//#endregion
export { nativeConditionSnapshotKey as a, useNativeConditionSnapshot as c, createNativeMapValueFn as d, createNativeNormalizeValueFn as f, defaultNativeConditionSnapshot as i, NATIVE_RESPONSIVE_CONDITION_MATCHERS as l, createNativeConditionResolver as n, normalizeNativeConditionInput as o, mapNativeConditionValueToBranches as p, createNativeConditionStore as r, traceNativeConditionBranches as s, NATIVE_CONDITION_BREAKPOINTS as t, NATIVE_RESPONSIVE_CONDITION_NAMES as u };
