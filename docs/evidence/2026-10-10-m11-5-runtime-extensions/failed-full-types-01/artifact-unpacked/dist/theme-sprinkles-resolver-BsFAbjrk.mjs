import { a as validateRecipeResolverCacheSize, n as createBoundedRecipeSelectionCache, u as NativeSprinklesLookupPlanType } from "./recipe-resolution-plan-DpLMvWAH.mjs";
//#region src/runtime/sprinkles-resolution-plan.ts
const nativePrimitiveKinds = new Set([
	"view",
	"text",
	"image"
]);
function createSprinklesResolutionPlan(lookup) {
	if (!isRecord(lookup) || lookup.$$type !== "crumbs.css.sprinkles-lookup-plan") throw new TypeError("Invalid native Sprinkles lookup plan type");
	if (lookup.version !== 1) throw new TypeError(`Unsupported native Sprinkles lookup plan version ${String(lookup.version)}`);
	const primitives = validatePrimitives(lookup.primitives);
	const properties = validateProperties(lookup.properties);
	const shorthands = validateShorthands(lookup.shorthands, properties);
	const selectionKeys = Object.freeze([...Object.keys(properties), ...Object.keys(shorthands)]);
	return Object.freeze({
		$$type: NativeSprinklesLookupPlanType,
		version: 1,
		primitives,
		properties,
		shorthands,
		selectionKeys
	});
}
function resolveSprinklesLookupPlan(plan, selection = {}) {
	validateSprinklesSelection(plan, selection);
	const styles = [];
	for (const name of Object.keys(selection)) {
		const selectedScale = selection[name];
		if (selectedScale === void 0 || selectedScale === null || selectedScale === false) continue;
		const targets = getSelectionTargets(plan, name);
		if (targets === void 0) continue;
		for (const target of targets) {
			const style = plan.properties[target]?.[selectedScale];
			if (style === void 0) throw new TypeError(`Native Sprinkles runtime plan is missing ${target}.${String(selectedScale)}`);
			styles.push(style);
		}
	}
	return Object.freeze(styles);
}
/** Validate a runtime selection before consulting a resolver cache. */
function validateSprinklesSelection(plan, selection) {
	if (!isRecord(selection)) throw new TypeError("Native Sprinkles runtime selection must be a record");
	for (const name of Object.keys(selection)) {
		const selectedScale = selection[name];
		if (selectedScale === void 0 || selectedScale === null || selectedScale === false) continue;
		if (typeof selectedScale !== "string") throw new TypeError(`Native Sprinkles runtime selection ${name} must use a scale name`);
		const targets = getSelectionTargets(plan, name);
		if (targets === void 0) throw new TypeError(`Unknown native Sprinkles runtime selection ${name}`);
		for (const target of targets) {
			const scale = plan.properties[target];
			if (scale === void 0 || !Object.hasOwn(scale, selectedScale)) throw new TypeError(`Native Sprinkles runtime scale ${JSON.stringify(selectedScale)} is not defined for ${target}`);
			if (scale[selectedScale] === void 0) throw new TypeError(`Native Sprinkles runtime plan is missing ${target}.${selectedScale}`);
		}
	}
}
function canonicalSprinklesSelectionKey(selection) {
	return Object.keys(selection).filter((name) => selection[name] !== void 0 && selection[name] !== null && selection[name] !== false).map((name) => {
		const value = selection[name];
		return `${name.length}:${name}=${typeof value === "string" ? `s${value.length}:${value}` : String(value)}`;
	}).join("|");
}
function getSelectionTargets(plan, name) {
	return Object.hasOwn(plan.properties, name) ? [name] : Object.hasOwn(plan.shorthands, name) ? plan.shorthands[name] : void 0;
}
function validatePrimitives(value) {
	if (!Array.isArray(value) || value.length === 0) throw new TypeError("Native Sprinkles lookup plan requires a primitive domain");
	const seen = /* @__PURE__ */ new Set();
	for (const primitive of value) {
		if (typeof primitive !== "string" || !nativePrimitiveKinds.has(primitive)) throw new TypeError(`Unknown native Sprinkles primitive kind ${JSON.stringify(primitive)}`);
		if (seen.has(primitive)) throw new TypeError(`Duplicate native Sprinkles primitive kind ${JSON.stringify(primitive)}`);
		seen.add(primitive);
	}
	return Object.freeze([...value]);
}
function validateProperties(value) {
	if (!isRecord(value)) throw new TypeError("Native Sprinkles lookup plan properties must be a record");
	const properties = {};
	for (const [property, scaleValue] of Object.entries(value)) {
		if (!isRecord(scaleValue)) throw new TypeError(`Native Sprinkles lookup plan scale for ${property} must be a record`);
		const scale = {};
		for (const [name, style] of Object.entries(scaleValue)) {
			if (!isRuntimeStyleReference(style)) throw new TypeError(`Native Sprinkles lookup plan entry ${property}.${name} must be a style reference`);
			scale[name] = style;
		}
		properties[property] = Object.freeze(scale);
	}
	return Object.freeze(properties);
}
function validateShorthands(value, properties) {
	if (!isRecord(value)) throw new TypeError("Native Sprinkles lookup plan shorthands must be a record");
	const shorthands = {};
	for (const [name, targetValue] of Object.entries(value)) {
		if (!Array.isArray(targetValue) || targetValue.length === 0 || targetValue.some((target) => typeof target !== "string")) throw new TypeError(`Native Sprinkles lookup plan shorthand ${name} must target one or more properties`);
		const targets = [...targetValue];
		if (new Set(targets).size !== targets.length) throw new TypeError(`Native Sprinkles lookup plan shorthand ${name} contains duplicate targets`);
		for (const target of targets) if (!Object.hasOwn(properties, target)) throw new TypeError(`Native Sprinkles lookup plan shorthand ${name} targets missing property ${target}`);
		shorthands[name] = Object.freeze(targets);
	}
	return Object.freeze(shorthands);
}
function isRuntimeStyleReference(value) {
	return typeof value === "object" && value !== null || typeof value === "number" || typeof value === "string";
}
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
//#endregion
//#region src/runtime/theme-sprinkles-resolver.ts
/**
* Create a bounded runtime selector for a generated Sprinkles lookup plan.
* Static utility authoring stays in `createSprinkles`; this resolver only
* selects already-compiled atomic references and preserves authored order.
*/
function createSprinklesResolver(lookup, options = {}) {
	const plan = createSprinklesResolutionPlan(lookup);
	const cache = createBoundedRecipeSelectionCache(validateRecipeResolverCacheSize(options.cacheSize ?? 32));
	let disposed = false;
	const resolve = ((selection = {}) => {
		if (disposed) throw new Error("Sprinkles resolver has been disposed");
		validateSprinklesSelection(plan, selection);
		const key = canonicalSprinklesSelectionKey(selection);
		const cached = cache.get(key);
		if (cached.hit) return cached.value;
		const resolved = resolveSprinklesLookupPlan(plan, selection);
		cache.set(key, resolved);
		return resolved;
	});
	Object.defineProperties(resolve, {
		plan: {
			value: plan,
			enumerable: true
		},
		getCacheStats: {
			value: () => Object.freeze({
				...cache.stats(),
				disposed
			}),
			enumerable: true
		},
		clearCache: {
			value: () => cache.clear(),
			enumerable: true
		},
		dispose: {
			value: () => {
				if (disposed) return;
				cache.clear();
				disposed = true;
			},
			enumerable: true
		}
	});
	return resolve;
}
//#endregion
export { createSprinklesResolver as t };
