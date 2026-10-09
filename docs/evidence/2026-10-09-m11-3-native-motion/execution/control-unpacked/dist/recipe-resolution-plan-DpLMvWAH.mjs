//#region src/native-tags.ts
const NativeRecipeType = "crumbs.css.recipe";
const NativeRecipeClassType = "crumbs.css.class";
const NativeComponentRecipeType = "crumbs.css.component-recipe";
const NativeComponentRecipeExtensionType = "crumbs.css.component-recipe-extension";
const NativeSprinklesLookupPlanType = "crumbs.css.sprinkles-lookup-plan";
//#endregion
//#region src/runtime/recipe-resolution-plan.ts
const RecipeResolutionPlanType = "crumbs.css.recipe-resolution-plan";
const MAX_RECIPE_RESOLVER_CACHE_SIZE = 1024;
function createRecipeResolutionPlan(recipe) {
	const variants = Object.entries(recipe.variants ?? {}).map(([name, values]) => ({
		name,
		values: Object.freeze({ ...values })
	}));
	const variantOrder = variants.map(({ name }) => name);
	const defaultSelection = Object.freeze({ ...recipe.defaultVariants });
	const compoundMatchers = (recipe.compoundVariants ?? []).map((compoundVariant) => {
		const requirements = Object.freeze(Object.entries(compoundVariant.variants ?? {}));
		return {
			requirements,
			matches: (selection) => requirements.every(([name, value]) => selection[name] === value),
			style: compoundVariant.style
		};
	});
	const selectionKeySet = new Set([
		...variantOrder,
		...Object.keys(defaultSelection),
		...compoundMatchers.flatMap(({ requirements }) => requirements.map(([name]) => name))
	]);
	const selectionKeys = [...variantOrder, ...[...selectionKeySet].filter((name) => !variantOrder.includes(name)).sort((left, right) => left.localeCompare(right))];
	return Object.freeze({
		$$type: RecipeResolutionPlanType,
		version: 1,
		recipe,
		variantOrder: Object.freeze(variantOrder),
		selectionKeys: Object.freeze(selectionKeys),
		defaultSelection,
		variants: Object.freeze(variants.map((variant) => Object.freeze(variant))),
		compoundMatchers: Object.freeze(compoundMatchers.map((matcher) => Object.freeze(matcher)))
	});
}
function resolveRecipeResolutionPlan(plan, selection = {}, reportInvalidVariant) {
	const selected = {
		...plan.defaultSelection,
		...selection
	};
	const styles = [];
	if (plan.recipe.base !== void 0) styles.push(plan.recipe.base);
	for (const variant of plan.variants) {
		const selectedValue = selected[variant.name];
		if (selectedValue === void 0) continue;
		const valueName = String(selectedValue);
		if (!Object.prototype.hasOwnProperty.call(variant.values, valueName)) {
			reportInvalidVariant?.(variant.name, selectedValue, variant.values);
			continue;
		}
		styles.push(variant.values[valueName]);
	}
	for (const compound of plan.compoundMatchers) if (compound.matches(selected)) styles.push(compound.style);
	return Object.freeze(styles);
}
function canonicalRecipeSelectionKey(plan, selection = {}) {
	const selected = {
		...plan.defaultSelection,
		...selection
	};
	return plan.selectionKeys.map((name) => {
		const hasValue = Object.prototype.hasOwnProperty.call(selected, name);
		return `${name.length}:${name}=${hasValue ? encodeRecipeSelectionValue(selected[name]) : "missing"}`;
	}).join("|");
}
function createBoundedRecipeSelectionCache(capacity) {
	const entries = /* @__PURE__ */ new Map();
	let hits = 0;
	let misses = 0;
	let evictions = 0;
	return {
		get(key) {
			if (!entries.has(key)) {
				misses += 1;
				return { hit: false };
			}
			const value = entries.get(key);
			entries.delete(key);
			entries.set(key, value);
			hits += 1;
			return {
				hit: true,
				value
			};
		},
		set(key, value) {
			if (capacity === 0) return;
			if (entries.has(key)) entries.delete(key);
			else if (entries.size >= capacity) {
				const oldest = entries.keys().next().value;
				if (oldest !== void 0) entries.delete(oldest);
				evictions += 1;
			}
			entries.set(key, value);
		},
		clear() {
			entries.clear();
		},
		stats() {
			return Object.freeze({
				capacity,
				size: entries.size,
				hits,
				misses,
				evictions
			});
		}
	};
}
function validateRecipeResolverCacheSize(cacheSize) {
	if (!Number.isFinite(cacheSize) || !Number.isInteger(cacheSize)) throw new RangeError("Recipe resolver cacheSize must be a finite integer");
	if (cacheSize < 0 || cacheSize > 1024) throw new RangeError(`Recipe resolver cacheSize must be between 0 and ${MAX_RECIPE_RESOLVER_CACHE_SIZE}`);
	return cacheSize;
}
function encodeRecipeSelectionValue(value) {
	switch (typeof value) {
		case "undefined": return "u";
		case "boolean": return value ? "b1" : "b0";
		case "string": return `s${value.length}:${value}`;
		case "number":
			if (Number.isNaN(value)) return "n:NaN";
			if (Object.is(value, -0)) return "n:-0";
			return `n:${String(value)}`;
		case "bigint": return `i:${String(value)}`;
		case "symbol": return `y:${String(value)}`;
		default: return `o:${String(value)}`;
	}
}
//#endregion
export { validateRecipeResolverCacheSize as a, NativeRecipeClassType as c, resolveRecipeResolutionPlan as i, NativeRecipeType as l, createBoundedRecipeSelectionCache as n, NativeComponentRecipeExtensionType as o, createRecipeResolutionPlan as r, NativeComponentRecipeType as s, canonicalRecipeSelectionKey as t, NativeSprinklesLookupPlanType as u };
