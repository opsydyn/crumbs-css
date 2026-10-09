import { a as validateRecipeResolverCacheSize, i as resolveRecipeResolutionPlan, n as createBoundedRecipeSelectionCache, o as NativeComponentRecipeExtensionType, r as createRecipeResolutionPlan, t as canonicalRecipeSelectionKey } from "./recipe-resolution-plan-DpLMvWAH.mjs";
//#region src/diagnostics.ts
const NativeStylesDiagnosticCode = {
	InvalidMotionDefinition: "CRUMBS_CSS_INVALID_MOTION_DEFINITION",
	MotionUnsupportedVersion: "CRUMBS_CSS_MOTION_UNSUPPORTED_VERSION",
	InvalidMotionOptions: "CRUMBS_CSS_INVALID_MOTION_OPTIONS",
	InvalidMotionTarget: "CRUMBS_CSS_INVALID_MOTION_TARGET",
	MotionNotActive: "CRUMBS_CSS_MOTION_NOT_ACTIVE",
	MotionUnsupportedPlatform: "CRUMBS_CSS_MOTION_UNSUPPORTED_PLATFORM",
	MotionDriverFailed: "CRUMBS_CSS_MOTION_DRIVER_FAILED",
	InvalidContainerDefinition: "CRUMBS_CSS_INVALID_CONTAINER_DEFINITION",
	ContainerUnsupportedVersion: "CRUMBS_CSS_CONTAINER_UNSUPPORTED_VERSION",
	InvalidContainerMeasurement: "CRUMBS_CSS_INVALID_CONTAINER_MEASUREMENT",
	InvalidContainerValues: "CRUMBS_CSS_INVALID_CONTAINER_VALUES",
	ContainerProviderRequired: "CRUMBS_CSS_CONTAINER_PROVIDER_REQUIRED",
	ContainerContractMismatch: "CRUMBS_CSS_CONTAINER_CONTRACT_MISMATCH",
	ContainerOwnerInUse: "CRUMBS_CSS_CONTAINER_OWNER_IN_USE",
	ContainerReentrantUpdate: "CRUMBS_CSS_CONTAINER_REENTRANT_UPDATE",
	InvalidLocalVar: "CRUMBS_CSS_INVALID_LOCAL_VAR",
	InvalidLocalAssignments: "CRUMBS_CSS_INVALID_LOCAL_ASSIGNMENTS",
	LocalVarConflict: "CRUMBS_CSS_LOCAL_VAR_CONFLICT",
	LocalVarDomainMismatch: "CRUMBS_CSS_LOCAL_VAR_DOMAIN_MISMATCH",
	LocalVarRequired: "CRUMBS_CSS_LOCAL_VAR_REQUIRED",
	LocalVarUnsupportedVersion: "CRUMBS_CSS_LOCAL_VAR_UNSUPPORTED_VERSION",
	LocalStylePlanRequired: "CRUMBS_CSS_LOCAL_STYLE_PLAN_REQUIRED",
	LocalVarInvalidPropertyValue: "CRUMBS_CSS_LOCAL_VAR_INVALID_PROPERTY_VALUE",
	CssVariableDropped: "CRUMBS_CSS_VARIABLE_DROPPED",
	DroppedDeclaration: "CRUMBS_CSS_DROPPED_DECLARATION",
	InvalidRecipeVariant: "CRUMBS_CSS_INVALID_RECIPE_VARIANT",
	InvalidThemeTokenReference: "CRUMBS_CSS_INVALID_THEME_TOKEN_REFERENCE",
	MissingThemeToken: "CRUMBS_CSS_MISSING_THEME_TOKEN",
	ThemeTokenCollision: "CRUMBS_CSS_THEME_TOKEN_COLLISION",
	TokenContractIdentityCollision: "CRUMBS_CSS_TOKEN_CONTRACT_IDENTITY_COLLISION",
	TokenAliasMissingTarget: "CRUMBS_CSS_TOKEN_ALIAS_MISSING_TARGET",
	TokenAliasDomainMismatch: "CRUMBS_CSS_TOKEN_ALIAS_DOMAIN_MISMATCH",
	TokenAliasCycle: "CRUMBS_CSS_TOKEN_ALIAS_CYCLE",
	TokenAliasFallbackDomainMismatch: "CRUMBS_CSS_TOKEN_ALIAS_FALLBACK_DOMAIN_MISMATCH",
	TokenAliasOverride: "CRUMBS_CSS_TOKEN_ALIAS_OVERRIDE",
	TokenThemeProviderMismatch: "CRUMBS_CSS_TOKEN_THEME_PROVIDER_MISMATCH",
	TokenThemeScopeProviderMismatch: "CRUMBS_CSS_TOKEN_THEME_SCOPE_PROVIDER_MISMATCH",
	TokenThemeScopeInvalid: "CRUMBS_CSS_TOKEN_THEME_SCOPE_INVALID",
	TokenThemePatchInvalid: "CRUMBS_CSS_TOKEN_THEME_PATCH_INVALID",
	TokenThemePatchContractMismatch: "CRUMBS_CSS_TOKEN_THEME_PATCH_CONTRACT_MISMATCH",
	TokenThemeFocusInvalid: "CRUMBS_CSS_TOKEN_THEME_FOCUS_INVALID",
	TokenThemeExternalContractMismatch: "CRUMBS_CSS_TOKEN_THEME_EXTERNAL_CONTRACT_MISMATCH",
	TokenThemeExternalTokenMismatch: "CRUMBS_CSS_TOKEN_THEME_EXTERNAL_TOKEN_MISMATCH",
	TokenThemeTokenContractMismatch: "CRUMBS_CSS_TOKEN_THEME_TOKEN_CONTRACT_MISMATCH",
	InvalidThemeContract: "CRUMBS_CSS_INVALID_THEME_CONTRACT",
	PartialRecipePayload: "CRUMBS_CSS_PARTIAL_RECIPE_PAYLOAD",
	UnsupportedAtRule: "CRUMBS_CSS_UNSUPPORTED_AT_RULE",
	UnsupportedMedia: "CRUMBS_CSS_UNSUPPORTED_MEDIA",
	UnsupportedSelector: "CRUMBS_CSS_UNSUPPORTED_SELECTOR",
	UnsupportedStructuredValue: "CRUMBS_CSS_UNSUPPORTED_STRUCTURED_VALUE",
	UnsupportedExport: "CRUMBS_CSS_UNSUPPORTED_EXPORT"
};
function formatNativeStylesDiagnostic(code, message) {
	return `[crumbs-css:${code}] ${message}`;
}
//#endregion
//#region src/components/contracts.ts
const PACKAGE_NAME$1 = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
const CONTRACT_NAME = /^[A-Za-z][A-Za-z0-9._-]*$/;
const componentContractIdentities = sharedRegistry(Symbol.for("crumbs.css.component-contract-identities.v1"), () => /* @__PURE__ */ new Map());
/** Validate and normalize public component metadata before it enters a descriptor. */
function validateNativeComponentContract(value, surface, stateVariants, options = {}) {
	const contractEntries = dataRecordEntries$1(value, "component contract");
	assertExactKeys$1(contractEntries, ["identity", "public"], ["extensionPoints"], "component contract");
	const rawContract = Object.fromEntries(contractEntries);
	const identity = validateIdentity$1(rawContract.identity);
	const publicEntries = dataRecordEntries$1(rawContract.public, "component contract public surface");
	assertExactKeys$1(publicEntries, ["slots", "variants"], [], "component contract public surface");
	const rawPublic = Object.fromEntries(publicEntries);
	const publicSlots = readStringList(rawPublic.slots, "public component slots");
	assertUniqueMembers(publicSlots, "public component slots");
	const actualSlots = new Set(Object.keys(surface.slots));
	for (const slot of publicSlots) if (!actualSlots.has(slot)) throw new TypeError("Component contract declares unknown public slot " + JSON.stringify(slot) + ".");
	const publicVariantEntries = dataRecordEntries$1(rawPublic.variants, "component contract public variants");
	const normalizedVariantEntries = [];
	for (const [axis, rawValues] of publicVariantEntries) {
		if (axis.length === 0) throw new TypeError("Public component variant axis names must be non-empty.");
		if (!Object.hasOwn(surface.variants, axis)) throw new TypeError("Component contract declares unknown public variant axis " + JSON.stringify(axis) + ".");
		const actualValues = surface.variants[axis];
		if (actualValues === void 0) throw new TypeError("Component recipe variant surface is missing " + JSON.stringify(axis) + ".");
		const values = readStringList(rawValues, "public values for variant " + JSON.stringify(axis));
		assertUniqueMembers(values, "public values for variant " + JSON.stringify(axis));
		for (const variantValue of values) if (!Object.hasOwn(actualValues, variantValue)) throw new TypeError("Component contract declares unknown public value " + JSON.stringify(variantValue) + " for variant " + JSON.stringify(axis) + ".");
		normalizedVariantEntries.push([axis, Object.freeze(values)]);
	}
	const publicVariants = Object.fromEntries(normalizedVariantEntries);
	const normalizedPublic = Object.freeze({
		slots: Object.freeze(publicSlots),
		variants: Object.freeze(publicVariants)
	});
	const extensionPoints = rawContract.extensionPoints === void 0 ? void 0 : validateExtensionPoints(rawContract.extensionPoints, normalizedPublic);
	validatePublicStateProjection(normalizedPublic, stateVariants);
	const normalized = Object.freeze({
		identity,
		public: normalizedPublic,
		...extensionPoints === void 0 ? {} : { extensionPoints }
	});
	const key = nativeComponentContractIdentityKey(identity);
	const signature = nativeComponentContractSignature(normalized);
	assertContractIdentityAvailable(key, signature);
	if (options.registerIdentity !== false) componentContractIdentities.set(key, signature);
	return normalized;
}
function nativeComponentContractIdentityKey(identity) {
	return identity.owner + "#" + identity.name + "@" + identity.version;
}
/** Canonical signature ignores declaration order because these lists are sets. */
function nativeComponentContractSignature(contract) {
	const publicVariants = Object.entries(contract.public.variants).sort(([left], [right]) => compareText$1(left, right)).map(([axis, values]) => encode(axis) + "=" + encodeSet(values)).join(";");
	const extensionPoints = contract.extensionPoints;
	return [
		"slots=" + encodeSet(contract.public.slots),
		"variants=" + publicVariants,
		"defaults=" + encodeSet(extensionPoints?.defaults ?? []),
		"variantValues=" + encodeSet(extensionPoints?.variantValues ?? []),
		"compoundVariants=" + (extensionPoints?.compoundVariants === true ? "1" : "0"),
		"slotStyles=" + encodeSet(extensionPoints?.slotStyles ?? [])
	].join("|");
}
function validateIdentity$1(value) {
	const entries = dataRecordEntries$1(value, "component contract identity");
	assertExactKeys$1(entries, [
		"owner",
		"name",
		"version"
	], [], "component contract identity");
	const identity = Object.fromEntries(entries);
	if (typeof identity.owner !== "string" || !PACKAGE_NAME$1.test(identity.owner) || typeof identity.name !== "string" || !CONTRACT_NAME.test(identity.name) || typeof identity.version !== "number" || !Number.isSafeInteger(identity.version) || identity.version <= 0) throw new TypeError("Invalid component contract identity. Expected { owner: package-name, name: identifier, version: positive-safe-integer }.");
	return Object.freeze({
		owner: identity.owner,
		name: identity.name,
		version: identity.version
	});
}
function validateExtensionPoints(value, publicSurface) {
	const entries = dataRecordEntries$1(value, "component contract extension points");
	assertExactKeys$1(entries, [], [
		"defaults",
		"variantValues",
		"compoundVariants",
		"slotStyles"
	], "component contract extension points");
	const raw = Object.fromEntries(entries);
	const publicAxes = new Set(Object.keys(publicSurface.variants));
	const publicSlots = new Set(publicSurface.slots);
	const defaults = raw.defaults === void 0 ? void 0 : validateExtensionAxisList(raw.defaults, "defaults", publicAxes);
	const variantValues = raw.variantValues === void 0 ? void 0 : validateExtensionAxisList(raw.variantValues, "variantValues", publicAxes);
	const slotStyles = raw.slotStyles === void 0 ? void 0 : readStringList(raw.slotStyles, "extension permission slotStyles").map((slot) => {
		if (!publicSlots.has(slot)) throw new TypeError("Extension permission slotStyles names non-public slot " + JSON.stringify(slot) + ".");
		return slot;
	});
	if (slotStyles !== void 0) assertUniqueMembers(slotStyles, "extension permission slotStyles");
	if (raw.compoundVariants !== void 0 && raw.compoundVariants !== true) throw new TypeError("Extension permission compoundVariants must be true when declared.");
	return Object.freeze({
		...defaults === void 0 ? {} : { defaults: Object.freeze(defaults) },
		...variantValues === void 0 ? {} : { variantValues: Object.freeze(variantValues) },
		...raw.compoundVariants === true ? { compoundVariants: true } : {},
		...slotStyles === void 0 ? {} : { slotStyles: Object.freeze(slotStyles) }
	});
}
function validateExtensionAxisList(value, permission, publicAxes) {
	const axes = readStringList(value, "extension permission " + permission);
	assertUniqueMembers(axes, "extension permission " + permission);
	for (const axis of axes) if (!publicAxes.has(axis)) throw new TypeError("Extension permission " + permission + " names non-public variant axis " + JSON.stringify(axis) + ".");
	return axes;
}
function validatePublicStateProjection(publicSurface, stateVariants) {
	if (stateVariants === void 0) return;
	const discriminators = dataRecordEntries$1(stateVariants, "component recipe stateVariants");
	if (discriminators.length !== 1) return;
	const [discriminator, rawCases] = discriminators[0];
	if (!Object.hasOwn(publicSurface.variants, discriminator)) return;
	const publicDiscriminatorValues = publicSurface.variants[discriminator];
	const publicValues = new Set(publicDiscriminatorValues);
	const cases = dataRecordEntries$1(rawCases, "public state cases for " + JSON.stringify(discriminator));
	for (const [caseName, rawConstraints] of cases) {
		if (!publicValues.has(caseName)) throw new TypeError("Public state contract for " + JSON.stringify(discriminator) + " omits state case " + JSON.stringify(caseName) + ".");
		const constraints = dataRecordEntries$1(rawConstraints, "public state " + JSON.stringify(caseName) + " constraints");
		for (const [axis, rawAllowedValues] of constraints) {
			if (!Object.hasOwn(publicSurface.variants, axis)) throw new TypeError("Public state " + JSON.stringify(caseName) + " depends on private variant axis " + JSON.stringify(axis) + ".");
			const publicAxisValues = publicSurface.variants[axis];
			const allowedValues = readStateValues(rawAllowedValues, caseName, axis);
			const publicValueSet = new Set(publicAxisValues);
			for (const allowedValue of allowedValues) if (!publicValueSet.has(String(allowedValue))) throw new TypeError("Public state " + JSON.stringify(caseName) + " requires private value " + JSON.stringify(allowedValue) + " for variant " + JSON.stringify(axis) + ".");
		}
	}
}
function readStateValues(value, caseName, axis) {
	return readArray(value, "public state " + JSON.stringify(caseName) + " constraint " + JSON.stringify(axis)).map((entry) => {
		if (typeof entry !== "string" && typeof entry !== "boolean") throw new TypeError("Public state constraint for " + JSON.stringify(axis) + " must contain only strings or booleans.");
		return entry;
	});
}
function readStringList(value, context) {
	return readArray(value, context).map((entry) => {
		if (typeof entry !== "string" || entry.length === 0) throw new TypeError(context + " must contain non-empty strings.");
		return entry;
	});
}
function readArray(value, context) {
	if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) throw new TypeError(context + " must be an array.");
	if (Object.getOwnPropertySymbols(value).length > 0) throw new TypeError(context + " cannot contain symbol properties.");
	const keys = Reflect.ownKeys(value);
	for (const key of keys) {
		if (key === "length") continue;
		if (typeof key !== "string" || !/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length) throw new TypeError(context + " must contain only indexed values.");
	}
	const descriptors = Object.create(null);
	for (const key of keys) descriptors[String(key)] = Object.getOwnPropertyDescriptor(value, key);
	const result = [];
	for (let index = 0; index < value.length; index += 1) {
		const descriptor = descriptors[String(index)];
		if (descriptor === void 0 || !("value" in descriptor) || !descriptor.enumerable) throw new TypeError(context + " must contain dense enumerable data values.");
		result.push(descriptor.value);
	}
	return result;
}
function dataRecordEntries$1(value, context) {
	if (typeof value !== "object" || value === null || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new TypeError(context + " must be a plain data record.");
	const entries = [];
	for (const key of Reflect.ownKeys(value)) {
		if (typeof key !== "string") throw new TypeError(context + " cannot contain symbol keys.");
		const descriptor = Object.getOwnPropertyDescriptor(value, key);
		if (descriptor === void 0 || !("value" in descriptor) || !descriptor.enumerable) throw new TypeError(context + " must contain enumerable data properties.");
		entries.push([key, descriptor.value]);
	}
	return entries;
}
function assertExactKeys$1(entries, required, optional, context) {
	const keys = new Set(entries.map(([key]) => key));
	for (const key of required) if (!keys.has(key)) throw new TypeError(context + " is missing " + JSON.stringify(key) + ".");
	for (const key of keys) if (!required.includes(key) && !optional.includes(key)) throw new TypeError(context + " has unknown property " + JSON.stringify(key) + ".");
}
function assertUniqueMembers(values, context) {
	const seen = /* @__PURE__ */ new Set();
	for (const value of values) {
		if (seen.has(value)) throw new TypeError(context + " contains duplicate entry " + JSON.stringify(value) + ".");
		seen.add(value);
	}
}
function encodeSet(values) {
	return [...values].sort(compareText$1).map(encode).join(",");
}
function encode(value) {
	return value.length + ":" + value;
}
function compareText$1(left, right) {
	return left < right ? -1 : left > right ? 1 : 0;
}
function assertContractIdentityAvailable(key, signature) {
	const previous = componentContractIdentities.get(key);
	if (previous !== void 0 && previous !== signature) throw new Error("Component contract identity " + JSON.stringify(key) + " was registered with a different public surface or extension permissions. Increment the contract version.");
}
function sharedRegistry(key, create) {
	const root = globalThis;
	const descriptor = Object.getOwnPropertyDescriptor(root, key);
	if (descriptor !== void 0 && "value" in descriptor) return descriptor.value;
	const value = create();
	Object.defineProperty(root, key, {
		value,
		enumerable: false,
		configurable: false,
		writable: false
	});
	return value;
}
//#endregion
//#region src/components/extension-contract.ts
const PACKAGE_NAME = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
const IDENTITY_NAME = /^[A-Za-z][A-Za-z0-9._-]*$/;
const NativeRecipeClassSymbol = Symbol.for("crumbs.css.recipe-class-reference");
const EMPTY_EXTENSION_PLAN = Object.freeze({
	extensions: Object.freeze([]),
	defaultVariants: Object.freeze({}),
	variants: Object.freeze({}),
	compoundVariants: Object.freeze([]),
	slotOverrides: Object.freeze([]),
	selectionKeys: Object.freeze([]),
	privateOwnerValues: Object.freeze({})
});
/** Validate a complete base-to-leaf chain and precompute immutable merge data. */
function validateNativeComponentRecipeExtensionChain(baseValue, extensionValues) {
	return validateExtensionChain(baseValue, extensionValues, "descriptor");
}
/** Validate and normalize one standalone serialized extension descriptor. */
function validateNativeComponentRecipeExtensionDescriptor(value) {
	return normalizeExtensionDescriptor(value, 0, "descriptor");
}
function validateExtensionChain(baseValue, extensionValues, mode) {
	const rawExtensions = dataArray(extensionValues, "component recipe extensions");
	if (rawExtensions.length === 0) return EMPTY_EXTENSION_PLAN;
	const base = validateComponentBase(baseValue);
	const contract = validateNativeComponentContract(base.contract, {
		slots: base.slots,
		variants: variantSurface(base.variants)
	}, base.stateVariants);
	const componentIdentity = contract.identity;
	const publicAxes = new Set(Object.keys(contract.public.variants));
	const stateDiscriminator = getStateDiscriminator(base.stateVariants);
	const publicSlots = new Set(contract.public.slots);
	const extensionPoints = contract.extensionPoints;
	const defaultAxes = new Set(extensionPoints?.defaults ?? []);
	const variantAxes = new Set(extensionPoints?.variantValues ?? []);
	const permittedSlots = new Set(extensionPoints?.slotStyles ?? []);
	const availableValues = /* @__PURE__ */ new Map();
	const occupiedValues = /* @__PURE__ */ new Map();
	for (const [axis, values] of Object.entries(contract.public.variants)) {
		availableValues.set(axis, new Set(values));
		occupiedValues.set(axis, new Set(dataRecordEntries(base.variants[axis], `component recipe variant ${JSON.stringify(axis)}`).map(([value]) => value)));
	}
	const seenIdentities = new Set([nativeComponentContractIdentityKey(componentIdentity)]);
	const normalizedExtensions = [];
	const mergedDefaults = { ...base.defaultVariants };
	const extensionDefaults = {};
	const addedVariantEntries = /* @__PURE__ */ new Map();
	const compounds = [];
	const slotOverrides = [];
	let previousIdentity;
	for (let index = 0; index < rawExtensions.length; index += 1) {
		const descriptor = normalizeExtensionDescriptor(rawExtensions[index], index, mode);
		const extensionKey = nativeComponentContractIdentityKey(descriptor.identity);
		if (seenIdentities.has(extensionKey)) throw new TypeError(`Component recipe extension identity ${JSON.stringify(extensionKey)} collides with the base or an earlier extension.`);
		seenIdentities.add(extensionKey);
		if (!sameIdentity(descriptor.componentIdentity, componentIdentity)) throw new TypeError("Component recipe extension component identity does not match the supplied base recipe.");
		if (previousIdentity === void 0) {
			if (descriptor.parentExtensionIdentity !== void 0) throw new TypeError("The first component recipe extension cannot declare a parent extension identity.");
		} else if (descriptor.parentExtensionIdentity === void 0 || !sameIdentity(descriptor.parentExtensionIdentity, previousIdentity)) throw new TypeError("Component recipe extension parent identity must match the immediately preceding extension.");
		const normalizedVariants = validateAddedVariants(descriptor.variants, mode, variantAxes, publicAxes, publicSlots, permittedSlots, stateDiscriminator, availableValues, occupiedValues, addedVariantEntries, `extension ${JSON.stringify(extensionKey)}`);
		const normalizedDefaults = validateDefaultChanges(descriptor.defaultVariants, defaultAxes, publicAxes, availableValues, `extension ${JSON.stringify(extensionKey)}`);
		Object.assign(mergedDefaults, normalizedDefaults);
		Object.assign(extensionDefaults, normalizedDefaults);
		assertStateDefaultsRemainValid(base.stateVariants, mergedDefaults, extensionKey);
		const normalizedCompounds = validateCompoundVariants(descriptor.compoundVariants, extensionPoints?.compoundVariants === true, publicAxes, availableValues, publicSlots, permittedSlots, mode, `extension ${JSON.stringify(extensionKey)}`);
		const normalizedOverrides = validateSlotStyles(descriptor.slotOverrides, publicSlots, permittedSlots, mode, `extension ${JSON.stringify(extensionKey)} slot overrides`);
		const normalizedDescriptor = Object.freeze({
			$$type: NativeComponentRecipeExtensionType,
			version: 1,
			identity: descriptor.identity,
			componentIdentity: descriptor.componentIdentity,
			...descriptor.parentExtensionIdentity === void 0 ? {} : { parentExtensionIdentity: descriptor.parentExtensionIdentity },
			defaultVariants: normalizedDefaults,
			variants: normalizedVariants,
			compoundVariants: normalizedCompounds,
			slotOverrides: normalizedOverrides
		});
		normalizedExtensions.push(normalizedDescriptor);
		compounds.push(...normalizedCompounds);
		if (Object.keys(normalizedOverrides).length > 0) slotOverrides.push(normalizedOverrides);
		previousIdentity = descriptor.identity;
	}
	const variants = Object.fromEntries([...addedVariantEntries.entries()].map(([axis, entries]) => [axis, Object.freeze(Object.fromEntries(entries))]));
	const privateOwnerValues = Object.fromEntries([...occupiedValues.entries()].map(([axis, values]) => [axis, Object.freeze(Object.fromEntries([...values].filter((value) => !availableValues.get(axis).has(value)).map((value) => [value, true])))]));
	return Object.freeze({
		extensions: Object.freeze(normalizedExtensions),
		defaultVariants: Object.freeze(extensionDefaults),
		variants: Object.freeze(variants),
		compoundVariants: Object.freeze(compounds),
		slotOverrides: Object.freeze(slotOverrides),
		selectionKeys: Object.freeze([...publicAxes].sort(compareText)),
		privateOwnerValues: Object.freeze(privateOwnerValues)
	});
}
function validateComponentBase(value) {
	const entries = dataRecordEntries(value, "component recipe base");
	const base = Object.fromEntries(entries);
	if (base.$$type !== "crumbs.css.component-recipe" || base.version !== 3) throw new TypeError("Component recipe extensions require a version 3 contract-bearing base recipe");
	const slots = dataRecordEntries(base.slots, "component recipe base slots");
	const variants = dataRecordEntries(base.variants, "component recipe base variants");
	const defaults = dataRecordEntries(base.defaultVariants, "component recipe base default variants");
	if (base.contract === void 0) throw new TypeError("Version 3 component recipes require contract metadata");
	const normalizedDefaults = normalizeSelection(Object.fromEntries(defaults), "component recipe base default variants");
	return {
		...base,
		contract: base.contract,
		slots: Object.freeze(Object.fromEntries(slots)),
		variants: Object.freeze(Object.fromEntries(variants)),
		defaultVariants: normalizedDefaults
	};
}
function variantSurface(variants) {
	return Object.fromEntries(dataRecordEntries(variants, "component recipe base variants").map(([axis, values]) => [axis, Object.fromEntries(dataRecordEntries(values, `component recipe variant ${JSON.stringify(axis)}`).map(([value]) => [value, true]))]));
}
function normalizeExtensionDescriptor(value, index, mode) {
	const entries = dataRecordEntries(value, `component recipe extension ${index}`);
	assertExactKeys(entries, [
		"$$type",
		"version",
		"identity",
		"componentIdentity",
		"defaultVariants",
		"variants",
		"compoundVariants",
		"slotOverrides"
	], ["parentExtensionIdentity"], `component recipe extension ${index}`);
	const record = Object.fromEntries(entries);
	if (record.$$type !== "crumbs.css.component-recipe-extension") throw new TypeError(`Component recipe extension ${index} has an unsupported descriptor type`);
	if (record.version !== 1) throw new TypeError(`Unsupported component recipe extension version ${String(record.version)}`);
	const identity = validateIdentity(record.identity, `component recipe extension ${index} identity`);
	const componentIdentity = validateIdentity(record.componentIdentity, `component recipe extension ${index} component identity`);
	const parentExtensionIdentity = record.parentExtensionIdentity === void 0 ? void 0 : validateIdentity(record.parentExtensionIdentity, `component recipe extension ${index} parent identity`);
	const defaultVariants = normalizeSelection(record.defaultVariants, `component recipe extension ${index} defaults`);
	const variants = dataRecordEntries(record.variants, `component recipe extension ${index} variants`);
	const normalizedVariantEntries = [];
	for (const [axis, rawValues] of variants) {
		const values = dataRecordEntries(rawValues, `component recipe extension ${index} variant ${JSON.stringify(axis)}`);
		const normalizedValues = [];
		for (const [valueName, rawStyles] of values) normalizedValues.push([valueName, validateRawSlotStyleRecord(rawStyles, mode, `extension ${index} variant ${JSON.stringify(axis)} value ${JSON.stringify(valueName)}`)]);
		normalizedVariantEntries.push([axis, Object.freeze(Object.fromEntries(normalizedValues))]);
	}
	const compoundVariants = dataArray(record.compoundVariants, `component recipe extension ${index} compound variants`).map((compound, compoundIndex) => {
		const compoundEntries = dataRecordEntries(compound, `component recipe extension ${index} compound ${compoundIndex}`);
		assertExactKeys(compoundEntries, ["variants", "styles"], [], `component recipe extension ${index} compound ${compoundIndex}`);
		const compoundRecord = Object.fromEntries(compoundEntries);
		return Object.freeze({
			variants: normalizeSelection(compoundRecord.variants, `component recipe extension ${index} compound ${compoundIndex} selection`),
			styles: validateRawSlotStyleRecord(compoundRecord.styles, mode, `extension ${index} compound ${compoundIndex}`)
		});
	});
	const slotOverrides = validateRawSlotStyleRecord(record.slotOverrides, mode, `component recipe extension ${index} slot overrides`);
	return Object.freeze({
		$$type: NativeComponentRecipeExtensionType,
		version: 1,
		identity,
		componentIdentity,
		...parentExtensionIdentity === void 0 ? {} : { parentExtensionIdentity },
		defaultVariants,
		variants: Object.freeze(Object.fromEntries(normalizedVariantEntries)),
		compoundVariants: Object.freeze(compoundVariants),
		slotOverrides
	});
}
function validateAddedVariants(value, mode, permittedAxes, publicAxes, publicSlots, permittedSlots, stateDiscriminator, availableValues, occupiedValues, addedVariantEntries, context) {
	const axes = dataRecordEntries(value, context + " variants");
	const result = [];
	for (const [axis, rawValues] of axes) {
		if (!publicAxes.has(axis)) throw new TypeError(`${context} cannot add private or unknown variant axis ${JSON.stringify(axis)}`);
		if (!permittedAxes.has(axis)) throw new TypeError(`${context} variant axis ${JSON.stringify(axis)} is not permitted by extensionPoints.variantValues`);
		if (axis === stateDiscriminator) throw new TypeError(`${context} cannot add values to state discriminator ${JSON.stringify(axis)} because its owner state constraints are sealed`);
		const values = dataRecordEntries(rawValues, context + ` variant ${JSON.stringify(axis)}`);
		if (values.length === 0) throw new TypeError(`${context} must add at least one value to variant ${JSON.stringify(axis)}`);
		const seenValues = occupiedValues.get(axis);
		const normalizedValues = [];
		const targetEntries = addedVariantEntries.get(axis) ?? [];
		for (const [valueName, rawStyles] of values) {
			if (seenValues.has(valueName)) throw new TypeError(`${context} variant value ${JSON.stringify(valueName)} for ${JSON.stringify(axis)} already exists in the base or extension chain`);
			const styles = validateSlotStyles(rawStyles, publicSlots, permittedSlots, mode, `${context} variant ${JSON.stringify(axis)} value ${JSON.stringify(valueName)}`);
			seenValues.add(valueName);
			availableValues.get(axis).add(valueName);
			normalizedValues.push([valueName, styles]);
			targetEntries.push([valueName, styles]);
		}
		addedVariantEntries.set(axis, targetEntries);
		result.push([axis, Object.freeze(Object.fromEntries(normalizedValues))]);
	}
	return Object.freeze(Object.fromEntries(result));
}
function validateDefaultChanges(value, permittedAxes, publicAxes, availableValues, context) {
	const entries = dataRecordEntries(value, context + " defaults");
	const normalized = [];
	for (const [axis, selectedValue] of entries) {
		if (!publicAxes.has(axis)) throw new TypeError(`${context} cannot change private or unknown default axis ${JSON.stringify(axis)}`);
		if (!permittedAxes.has(axis)) throw new TypeError(`${context} default axis ${JSON.stringify(axis)} is not permitted by extensionPoints.defaults`);
		if (typeof selectedValue !== "string" && typeof selectedValue !== "boolean") throw new TypeError(`${context} default for ${JSON.stringify(axis)} must be a string or boolean data value`);
		if (!availableValues.get(axis)?.has(String(selectedValue))) throw new TypeError(`${context} default for ${JSON.stringify(axis)} selects an unavailable public value ${JSON.stringify(selectedValue)}`);
		normalized.push([axis, selectedValue]);
	}
	return Object.freeze(Object.fromEntries(normalized));
}
function validateCompoundVariants(value, permitted, publicAxes, availableValues, publicSlots, permittedSlots, mode, context) {
	const compounds = dataArray(value, context + " compound variants");
	if (compounds.length > 0 && !permitted) throw new TypeError(`${context} compounds require extensionPoints.compoundVariants permission`);
	return Object.freeze(compounds.map((compound, index) => {
		const entries = dataRecordEntries(compound, `${context} compound ${index}`);
		assertExactKeys(entries, ["variants", "styles"], [], `${context} compound ${index}`);
		const record = Object.fromEntries(entries);
		const selectors = normalizeSelection(record.variants, `${context} compound ${index} selection`);
		if (Object.keys(selectors).length === 0) throw new TypeError(`${context} compound ${index} must select at least one public variant`);
		for (const [axis, value] of Object.entries(selectors)) if (!publicAxes.has(axis) || !availableValues.get(axis)?.has(String(value))) throw new TypeError(`${context} compound ${index} selects an unknown or unavailable public value ${JSON.stringify(value)} for ${JSON.stringify(axis)}`);
		const styles = validateSlotStyles(record.styles, publicSlots, permittedSlots, mode, `${context} compound ${index}`);
		return Object.freeze({
			variants: selectors,
			styles
		});
	}));
}
function validateSlotStyles(value, publicSlots, permittedSlots, mode, context) {
	const entries = dataRecordEntries(value, context + " slot styles");
	const normalized = [];
	for (const [slot, style] of entries) {
		if (!publicSlots.has(slot)) throw new TypeError(`${context} cannot style private or unknown slot ${JSON.stringify(slot)}`);
		if (!permittedSlots.has(slot)) throw new TypeError(`${context} slot ${JSON.stringify(slot)} is not permitted by extensionPoints.slotStyles`);
		normalized.push([slot, mode === "descriptor" ? normalizeDescriptorStyle(style, context + ` style for ${JSON.stringify(slot)}`) : assertStyleInputData(style, context + ` style for ${JSON.stringify(slot)}`)]);
	}
	return Object.freeze(Object.fromEntries(normalized));
}
function validateRawSlotStyleRecord(value, mode, context) {
	const entries = dataRecordEntries(value, context + " slot styles");
	return Object.freeze(Object.fromEntries(entries.map(([slot, style]) => [slot, mode === "descriptor" ? normalizeDescriptorStyle(style, context + ` style for ${JSON.stringify(slot)}`) : assertStyleInputData(style, context + ` style for ${JSON.stringify(slot)}`)])));
}
function normalizeDescriptorStyle(value, context) {
	return cloneAndFreezeDescriptorStyle(value, context);
}
function cloneAndFreezeDescriptorStyle(value, context, ancestors = /* @__PURE__ */ new Set()) {
	if (typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") throw new TypeError(`${context} must contain only plain data values`);
	if (typeof value === "number" && !Number.isFinite(value)) throw new TypeError(`${context} cannot contain non-finite numbers`);
	if (typeof value !== "object" || value === null) return value;
	if (isNativeClassReference(value)) return normalizeClassReference(value, context);
	if (ancestors.has(value)) throw new TypeError(`${context} cannot contain a cycle`);
	ancestors.add(value);
	try {
		if (Array.isArray(value)) return Object.freeze(dataArray(value, context).map((entry, index) => cloneAndFreezeDescriptorStyle(entry, `${context}[${index}]`, ancestors)));
		const entries = dataRecordEntries(value, context);
		return Object.freeze(Object.fromEntries(entries.map(([key, entry]) => [key, cloneAndFreezeDescriptorStyle(entry, `${context}.${key}`, ancestors)])));
	} finally {
		ancestors.delete(value);
	}
}
function normalizeClassReference(value, context) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TypeError(`${context} must be a plain native class reference`);
	const prototype = Object.getPrototypeOf(value);
	if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${context} must be a plain native class reference`);
	const keys = Reflect.ownKeys(value);
	const stringKeys = keys.filter((key) => typeof key === "string");
	const symbols = keys.filter((key) => typeof key === "symbol");
	if (stringKeys.length !== 2 || !stringKeys.includes("$$type") || !stringKeys.includes("className") || symbols.length > 0 && (symbols.length !== 1 || symbols[0] !== NativeRecipeClassSymbol)) throw new TypeError(`${context} must be a plain native class reference`);
	const tag = Object.getOwnPropertyDescriptor(value, "$$type");
	const className = Object.getOwnPropertyDescriptor(value, "className");
	if (tag === void 0 || !("value" in tag) || tag.enumerable !== true || tag.value !== "crumbs.css.class" || className === void 0 || !("value" in className) || className.enumerable !== true || typeof className.value !== "string" || className.value.length === 0) throw new TypeError(`${context} must be a plain native class reference`);
	if (symbols.length === 1) {
		const marker = Object.getOwnPropertyDescriptor(value, NativeRecipeClassSymbol);
		if (marker === void 0 || !("value" in marker) || marker.value !== true) throw new TypeError(`${context} has an invalid native class reference marker`);
	}
	const reference = {
		$$type: "crumbs.css.class",
		className: className.value
	};
	Object.defineProperty(reference, NativeRecipeClassSymbol, {
		value: true,
		enumerable: true
	});
	return Object.freeze(reference);
}
function assertStyleInputData(value, context, ancestors = /* @__PURE__ */ new Set()) {
	if (typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") throw new TypeError(`${context} must contain only plain data values`);
	if (typeof value === "number" && !Number.isFinite(value)) throw new TypeError(`${context} cannot contain non-finite numbers`);
	if (typeof value !== "object" || value === null) return value;
	if (isNativeClassReference(value)) return value;
	if (ancestors.has(value)) throw new TypeError(`${context} cannot contain a cycle`);
	ancestors.add(value);
	try {
		if (Array.isArray(value)) {
			dataArray(value, context).forEach((entry, index) => assertStyleInputData(entry, `${context}[${index}]`, ancestors));
			return value;
		}
		const entries = dataRecordEntries(value, context);
		for (const [key, entry] of entries) assertStyleInputData(entry, `${context}.${key}`, ancestors);
		return value;
	} finally {
		ancestors.delete(value);
	}
}
function isNativeClassReference(value) {
	try {
		normalizeClassReference(value, "native class reference");
		return true;
	} catch {
		return false;
	}
}
function getStateDiscriminator(value) {
	if (value === void 0) return void 0;
	const entries = dataRecordEntries(value, "component recipe state variants");
	if (entries.length !== 1) throw new TypeError("Component recipe stateVariants must define exactly one discriminator");
	return entries[0][0];
}
function assertStateDefaultsRemainValid(stateVariants, defaults, extensionKey) {
	if (stateVariants === void 0) return;
	const discriminators = dataRecordEntries(stateVariants, "component recipe state variants");
	if (discriminators.length !== 1) throw new TypeError("Component recipe stateVariants must define exactly one discriminator");
	const [discriminator, rawCases] = discriminators[0];
	const selectedState = defaults[discriminator];
	if (typeof selectedState !== "string" && typeof selectedState !== "boolean") throw new TypeError(`Extension ${JSON.stringify(extensionKey)} leaves the default state discriminator unset`);
	const selectedCase = dataRecordEntries(rawCases, `component recipe state ${JSON.stringify(discriminator)}`).find(([caseName]) => caseName === String(selectedState))?.[1];
	if (selectedCase === void 0) throw new TypeError(`Extension ${JSON.stringify(extensionKey)} default selects an unknown state ${JSON.stringify(selectedState)}`);
	for (const [axis, rawValues] of dataRecordEntries(selectedCase, `component recipe state ${JSON.stringify(selectedState)} constraints`)) {
		const selectedValue = defaults[axis];
		if (!dataArray(rawValues, `component recipe state ${JSON.stringify(selectedState)} constraint ${JSON.stringify(axis)}`).some((value) => value === selectedValue)) throw new TypeError(`Extension ${JSON.stringify(extensionKey)} defaults violate owner state constraint ${JSON.stringify(axis)}`);
	}
}
function normalizeSelection(value, context) {
	const entries = dataRecordEntries(value, context);
	const normalized = [];
	for (const [axis, selectedValue] of entries) {
		if (typeof selectedValue !== "string" && typeof selectedValue !== "boolean") throw new TypeError(`${context} values must be strings or booleans`);
		normalized.push([axis, selectedValue]);
	}
	return Object.freeze(Object.fromEntries(normalized));
}
function validateIdentity(value, context) {
	const entries = dataRecordEntries(value, context);
	assertExactKeys(entries, [
		"owner",
		"name",
		"version"
	], [], context);
	const identity = Object.fromEntries(entries);
	if (typeof identity.owner !== "string" || !PACKAGE_NAME.test(identity.owner) || typeof identity.name !== "string" || !IDENTITY_NAME.test(identity.name) || typeof identity.version !== "number" || !Number.isSafeInteger(identity.version) || identity.version <= 0) throw new TypeError(`${context} must have a package owner, identifier name, and positive safe integer version`);
	return Object.freeze({
		owner: identity.owner,
		name: identity.name,
		version: identity.version
	});
}
function sameIdentity(left, right) {
	return nativeComponentContractIdentityKey(left) === nativeComponentContractIdentityKey(right);
}
function dataRecordEntries(value, context) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TypeError(`${context} must be a plain data record`);
	const prototype = Object.getPrototypeOf(value);
	if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${context} must be a plain data record`);
	const entries = [];
	for (const key of Reflect.ownKeys(value)) {
		if (typeof key !== "string") throw new TypeError(`${context} cannot contain symbol keys`);
		const descriptor = Object.getOwnPropertyDescriptor(value, key);
		if (descriptor === void 0 || !("value" in descriptor) || !descriptor.enumerable) throw new TypeError(`${context}.${key} must be an enumerable data property`);
		entries.push([key, descriptor.value]);
	}
	return entries;
}
function dataArray(value, context) {
	if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) throw new TypeError(`${context} must be an array`);
	for (const key of Reflect.ownKeys(value)) {
		if (key === "length") continue;
		if (typeof key !== "string") throw new TypeError(`${context} cannot contain symbol properties`);
		if (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length) throw new TypeError(`${context} must contain only indexed data values`);
	}
	const descriptors = Object.getOwnPropertyDescriptors(value);
	const result = [];
	for (let index = 0; index < value.length; index += 1) {
		const descriptor = descriptors[String(index)];
		if (descriptor === void 0 || !("value" in descriptor) || !descriptor.enumerable) throw new TypeError(`${context} must contain dense enumerable data values`);
		result.push(descriptor.value);
	}
	return result;
}
function assertExactKeys(entries, required, optional, context) {
	const keys = new Set(entries.map(([key]) => key));
	for (const key of required) if (!keys.has(key)) throw new TypeError(`${context} is missing ${JSON.stringify(key)}`);
	for (const key of keys) if (!required.includes(key) && !optional.includes(key)) throw new TypeError(`${context} has unknown field ${JSON.stringify(key)}`);
}
function compareText(left, right) {
	return left < right ? -1 : left > right ? 1 : 0;
}
//#endregion
//#region src/runtime/component-recipe-resolution-plan.ts
const ComponentRecipeResolutionPlanType = "crumbs.css.component-recipe-resolution-plan";
/** Build one shared plan for all slots without expanding variant products. */
function createComponentRecipeResolutionPlan(recipe, options = {}) {
	if (recipe.$$type !== "crumbs.css.component-recipe" || recipe.version !== 1 && recipe.version !== 2 && recipe.version !== 3) throw new TypeError("Unsupported component recipe descriptor version");
	const slots = validateComponentSlots(recipe.slots);
	const slotOrder = Object.keys(slots);
	const base = validateSlotRecord(recipe.base ?? {}, slots, "base");
	const variants = Object.entries(recipe.variants ?? {}).map(([name, values]) => {
		const normalizedValues = Object.fromEntries(Object.entries(values).map(([value, styles]) => [value, validateSlotRecord(styles, slots, `variant ${JSON.stringify(name)} value ${JSON.stringify(value)}`)]));
		return Object.freeze({
			name,
			values: Object.freeze(normalizedValues)
		});
	});
	const variantOrder = variants.map(({ name }) => name);
	const defaultSelection = Object.freeze({ ...recipe.defaultVariants });
	const compoundMatchers = (recipe.compoundVariants ?? []).map((compound, index) => {
		const requirements = Object.freeze(Object.entries(compound.variants ?? {}));
		for (const [name, value] of requirements) {
			if (typeof value !== "string" && typeof value !== "boolean") throw new TypeError(`Component recipe compound variant ${index} selections must be strings or booleans`);
			const variant = variants.find((entry) => entry.name === name);
			if (variant === void 0) throw new TypeError(`Component recipe compound variant ${index} references unknown variant ${JSON.stringify(name)}`);
			if (!Object.hasOwn(variant.values, String(value))) throw new TypeError(`Component recipe compound variant ${index} references unknown value ${JSON.stringify(value)} for variant ${JSON.stringify(name)}`);
		}
		return Object.freeze({
			requirements,
			matches: (selection) => requirements.every(([name, value]) => selection[name] === value),
			styles: validateSlotRecord(compound.styles, slots, `compound variant ${index}`)
		});
	});
	for (const [name, value] of Object.entries(defaultSelection)) {
		const variant = variants.find((entry) => entry.name === name);
		if (typeof value !== "string" && typeof value !== "boolean" || variant === void 0 || !Object.hasOwn(variant.values, String(value))) throw new TypeError(`Component recipe default value ${JSON.stringify(value)} is not defined for variant ${JSON.stringify(name)}`);
	}
	const stateConstraint = recipe.version === 2 || recipe.version === 3 ? validateStateConstraint(recipe.stateVariants, variants, defaultSelection) : void 0;
	if (recipe.version === 3) {
		if (recipe.contract === void 0) throw new TypeError("Version 3 component recipes require contract metadata");
		const variantSurface = Object.fromEntries(variants.map((variant) => [variant.name, Object.fromEntries(Object.keys(variant.values).map((value) => [value, true]))]));
		validateNativeComponentContract(recipe.contract, {
			slots,
			variants: variantSurface
		}, recipe.stateVariants);
	} else if (recipe.contract !== void 0) throw new TypeError("Component contract metadata requires component recipe version 3");
	const extensionPlan = validateNativeComponentRecipeExtensionChain(recipe, options.extensions === void 0 ? [] : options.extensions);
	const effectiveDefaults = Object.freeze({
		...defaultSelection,
		...extensionPlan.defaultVariants
	});
	const mergedVariants = variants.map((variant) => {
		const addedValues = extensionPlan.variants[variant.name];
		return addedValues === void 0 ? variant : Object.freeze({
			name: variant.name,
			values: Object.freeze({
				...variant.values,
				...addedValues
			})
		});
	});
	const extensionCompoundMatchers = extensionPlan.compoundVariants.map((compound, index) => {
		const requirements = Object.freeze(Object.entries(compound.variants));
		return Object.freeze({
			requirements,
			matches: (selection) => requirements.every(([name, value]) => selection[name] === value),
			styles: validateSlotRecord(compound.styles, slots, `extension compound variant ${index}`)
		});
	});
	const extensionOverrides = extensionPlan.slotOverrides.map((styles, index) => validateSlotRecord(styles, slots, `extension slot overrides ${index}`));
	const hasExtensions = extensionPlan.extensions.length > 0;
	const selectionKeySet = new Set([
		...hasExtensions ? variantOrder.filter((name) => extensionPlan.selectionKeys.includes(name)) : variantOrder,
		...Object.keys(effectiveDefaults).filter((name) => !hasExtensions || extensionPlan.selectionKeys.includes(name)),
		...compoundMatchers.flatMap(({ requirements }) => requirements.map(([name]) => name)),
		...extensionCompoundMatchers.flatMap(({ requirements }) => requirements.map(([name]) => name))
	]);
	const selectionKeys = hasExtensions ? variantOrder.filter((name) => extensionPlan.selectionKeys.includes(name)) : [...variantOrder, ...[...selectionKeySet].filter((name) => !variantOrder.includes(name)).sort((left, right) => left.localeCompare(right))];
	return Object.freeze({
		$$type: ComponentRecipeResolutionPlanType,
		version: 1,
		recipe,
		slotOrder: Object.freeze(slotOrder),
		variantOrder: Object.freeze(variantOrder),
		selectionKeys: Object.freeze(selectionKeys),
		defaultSelection: effectiveDefaults,
		base,
		variants: Object.freeze(mergedVariants),
		compoundMatchers: Object.freeze([...compoundMatchers, ...extensionCompoundMatchers]),
		...stateConstraint === void 0 ? {} : { stateConstraint },
		...hasExtensions ? { extensionPlan: Object.freeze({
			...extensionPlan,
			slotOverrides: Object.freeze(extensionOverrides)
		}) } : {}
	});
}
function resolveComponentRecipeResolutionPlan(plan, selection = {}, reportInvalidVariant, reportInvalidState) {
	validateComponentRecipeExtensionSelection(plan, selection);
	const selected = {
		...plan.defaultSelection,
		...selection
	};
	const collected = Object.fromEntries(plan.slotOrder.map((slot) => [slot, []]));
	for (const slot of plan.slotOrder) {
		const baseStyle = plan.base[slot];
		if (baseStyle !== void 0) collected[slot].push(baseStyle);
	}
	if (plan.stateConstraint !== void 0 && !matchesComponentRecipeSelectedState(plan.stateConstraint, selected)) {
		reportInvalidState?.(plan.stateConstraint.discriminator, selected, plan.stateConstraint);
		return freezeCollectedSlotStyles(plan.slotOrder, collected);
	}
	const stateDiscriminator = plan.recipe.version === 3 ? plan.stateConstraint?.discriminator : void 0;
	for (const variant of plan.variants) {
		if (variant.name === stateDiscriminator) continue;
		const selectedValue = selected[variant.name];
		if (selectedValue === void 0) continue;
		if (typeof selectedValue !== "string" && typeof selectedValue !== "boolean") {
			reportInvalidVariant?.(variant.name, selectedValue, variant.values);
			continue;
		}
		const valueName = String(selectedValue);
		if (!Object.hasOwn(variant.values, valueName)) {
			reportInvalidVariant?.(variant.name, selectedValue, variant.values);
			continue;
		}
		appendSlotStyles(collected, variant.values[valueName]);
	}
	if (stateDiscriminator !== void 0) {
		const variant = plan.variants.find((entry) => entry.name === stateDiscriminator);
		const selectedValue = selected[stateDiscriminator];
		if (variant !== void 0 && selectedValue !== void 0 && (typeof selectedValue === "string" || typeof selectedValue === "boolean")) {
			const valueName = String(selectedValue);
			if (Object.hasOwn(variant.values, valueName)) appendSlotStyles(collected, variant.values[valueName]);
		}
	}
	for (const compound of plan.compoundMatchers) if (compound.matches(selected)) appendSlotStyles(collected, compound.styles);
	for (const override of plan.extensionPlan?.slotOverrides ?? []) appendSlotStyles(collected, override);
	return freezeCollectedSlotStyles(plan.slotOrder, collected);
}
/** Reject private and unknown keys before resolver cache lookup. */
function validateComponentRecipeExtensionSelection(plan, selection) {
	if (plan.extensionPlan === void 0) return;
	if (Object.getOwnPropertySymbols(selection).length > 0) throw new TypeError("Component recipe extension resolver received an unknown symbol selection key");
	for (const key of Object.keys(selection)) {
		if (!plan.selectionKeys.includes(key)) throw new TypeError(`Component recipe extension resolver received unknown or private selection key ${JSON.stringify(key)}`);
		const selectedValue = selection[key];
		const privateValues = plan.extensionPlan?.privateOwnerValues[key];
		if ((typeof selectedValue === "string" || typeof selectedValue === "boolean") && privateValues !== void 0 && Object.hasOwn(privateValues, String(selectedValue))) throw new TypeError(`Component recipe extension resolver received private owner value ${JSON.stringify(selectedValue)} for selection key ${JSON.stringify(key)}`);
	}
}
function validateStateConstraint(value, variants, defaults) {
	if (value === void 0) return void 0;
	const discriminators = stateRecordEntries(value, "Component recipe stateVariants");
	if (discriminators.length !== 1) throw new TypeError("Component recipe stateVariants must define exactly one discriminator");
	const [discriminator, rawCases] = discriminators[0];
	const discriminatorVariant = variants.find((variant) => variant.name === discriminator);
	if (discriminatorVariant === void 0) throw new TypeError(`Component recipe stateVariants references unknown discriminator variant ${JSON.stringify(discriminator)}`);
	const cases = stateRecordEntries(rawCases, `Component recipe stateVariants discriminator ${JSON.stringify(discriminator)}`);
	const expectedCaseNames = Object.keys(discriminatorVariant.values);
	const actualCaseNames = new Set(cases.map(([name]) => name));
	const missingCase = expectedCaseNames.find((name) => !actualCaseNames.has(name));
	if (missingCase !== void 0) throw new TypeError(`Component recipe stateVariants is missing state case ${JSON.stringify(missingCase)}`);
	const extraCase = cases.find(([name]) => !Object.hasOwn(discriminatorVariant.values, name))?.[0];
	if (extraCase !== void 0) throw new TypeError(`Component recipe stateVariants has unknown state case ${JSON.stringify(extraCase)}`);
	if (!Object.hasOwn(defaults, discriminator)) throw new TypeError(`Component recipe defaultVariants must define discriminator ${JSON.stringify(discriminator)} for stateVariants`);
	const defaultCaseName = String(defaults[discriminator]);
	let defaultConstraints = [];
	const normalizedCases = cases.map(([caseName, rawConstraints]) => {
		const constraints = stateRecordEntries(rawConstraints, `Component recipe state ${JSON.stringify(caseName)} constraints`);
		const normalizedConstraints = [];
		for (const [axis, rawAllowedValues] of constraints) {
			if (axis === discriminator) throw new TypeError(`Component recipe state ${JSON.stringify(caseName)} cannot constrain its discriminator ${JSON.stringify(discriminator)}`);
			const variant = variants.find((entry) => entry.name === axis);
			if (variant === void 0) throw new TypeError(`Component recipe state ${JSON.stringify(caseName)} references unknown constrained variant ${JSON.stringify(axis)}`);
			const allowedValues = validateStateConstraintValues(rawAllowedValues, variant.values, caseName, axis);
			normalizedConstraints.push([axis, allowedValues]);
		}
		if (caseName === defaultCaseName) defaultConstraints = normalizedConstraints;
		return Object.freeze({
			value: caseName,
			constraints: Object.freeze(normalizedConstraints)
		});
	});
	for (const [axis, allowedValues] of defaultConstraints) {
		if (!Object.hasOwn(defaults, axis)) throw new TypeError(`Component recipe defaultVariants must define constrained variant ${JSON.stringify(axis)} for its default state`);
		if (!allowedValues.includes(defaults[axis])) throw new TypeError(`Component recipe default selection for state ${JSON.stringify(defaultCaseName)} violates constraint ${JSON.stringify(axis)}`);
	}
	return Object.freeze({
		discriminator,
		cases: Object.freeze(normalizedCases)
	});
}
function validateStateConstraintValues(value, variantValues, caseName, axis) {
	const context = `Component recipe state ${JSON.stringify(caseName)} allowed values for variant ${JSON.stringify(axis)}`;
	if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) throw new TypeError(`${context} must be a non-empty array`);
	const descriptors = Object.getOwnPropertyDescriptors(value);
	if (Object.getOwnPropertySymbols(value).length > 0) throw new TypeError(`${context} cannot contain symbol properties`);
	for (const key of Reflect.ownKeys(value)) {
		if (key === "length") continue;
		if (typeof key !== "string" || !/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length) throw new TypeError(`${context} must contain only tuple values`);
	}
	if (value.length === 0) throw new TypeError(`${context} must be non-empty`);
	const values = [];
	const seen = /* @__PURE__ */ new Set();
	for (let index = 0; index < value.length; index += 1) {
		const descriptor = descriptors[String(index)];
		if (descriptor === void 0 || !("value" in descriptor) || !descriptor.enumerable) throw new TypeError(`${context} must contain dense enumerable data values`);
		const allowedValue = descriptor.value;
		if (typeof allowedValue !== "string" && typeof allowedValue !== "boolean") throw new TypeError(`${context} values must be strings or booleans`);
		if (!Object.hasOwn(variantValues, String(allowedValue))) throw new TypeError(`${context} has unknown value ${JSON.stringify(allowedValue)} for variant ${JSON.stringify(axis)}`);
		const key = typeof allowedValue === "boolean" ? `b:${allowedValue ? 1 : 0}` : `s:${allowedValue.length}:${allowedValue}`;
		if (seen.has(key)) throw new TypeError(`${context} contains duplicate allowed value ${JSON.stringify(allowedValue)}`);
		seen.add(key);
		values.push(allowedValue);
	}
	return Object.freeze(values);
}
/** @internal Shared state gate for resolution and explanation traces. */
function matchesComponentRecipeSelectedState(constraint, selection) {
	const discriminatorValue = selection[constraint.discriminator];
	if (typeof discriminatorValue !== "string" && typeof discriminatorValue !== "boolean") return false;
	const selectedCase = constraint.cases.find(({ value }) => value === String(discriminatorValue));
	if (selectedCase === void 0) return false;
	return selectedCase.constraints.every(([axis, allowedValues]) => allowedValues.includes(selection[axis]));
}
function freezeCollectedSlotStyles(slotOrder, collected) {
	return Object.freeze(Object.fromEntries(slotOrder.map((slot) => [slot, Object.freeze(collected[slot] ?? [])])));
}
function stateRecordEntries(value, context) {
	assertStateRecord(value, context);
	return Object.entries(value);
}
function assertStateRecord(value, context) {
	if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${context} must be a plain record`);
	const prototype = Object.getPrototypeOf(value);
	if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${context} must be a plain record`);
	if (Object.getOwnPropertySymbols(value).length > 0) throw new TypeError(`${context} cannot contain symbol properties`);
	for (const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) if (!("value" in descriptor) || !descriptor.enumerable) throw new TypeError(`${context}.${name} must be an enumerable data property`);
}
function appendSlotStyles(collected, branch) {
	for (const [slot, style] of Object.entries(branch)) {
		const target = collected[slot];
		if (target === void 0) throw new TypeError(`Component recipe branch references unknown slot ${JSON.stringify(slot)}`);
		target.push(style);
	}
}
function validateComponentSlots(value) {
	assertRecord(value, "Component recipe slots");
	const entries = Object.entries(value);
	if (entries.length === 0) throw new TypeError("Component recipe must define at least one slot");
	for (const [slot, kind] of entries) {
		if (slot.length === 0) throw new TypeError("Component recipe slot names must be non-empty");
		if (kind !== "view" && kind !== "text" && kind !== "image") throw new TypeError(`Component recipe slot ${JSON.stringify(slot)} has an invalid primitive kind`);
	}
	return value;
}
function validateSlotRecord(value, slots, context) {
	assertRecord(value, `Component recipe ${context} slot styles`);
	const entries = Object.entries(value);
	for (const [slot, style] of entries) {
		if (!Object.hasOwn(slots, slot)) throw new TypeError(`Component recipe ${context} references unknown slot ${JSON.stringify(slot)}`);
		if (style === null || typeof style !== "object" || Array.isArray(style)) throw new TypeError(`Component recipe ${context} style for slot ${JSON.stringify(slot)} must be a record`);
	}
	return Object.freeze(Object.fromEntries(entries));
}
function assertRecord(value, context) {
	if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${context} must be a plain record`);
	const prototype = Object.getPrototypeOf(value);
	if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${context} must be a plain record`);
	for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) if (!("value" in descriptor) || !descriptor.enumerable) throw new TypeError(`${context} must contain enumerable data properties`);
}
//#endregion
//#region src/runtime/theme-recipe-resolvers.ts
const recipeDiagnosticWarnings = /* @__PURE__ */ new Set();
function resolveRecipeStyle(recipe, selection = {}) {
	warnForPartialRecipePayload(recipe);
	return resolveRecipeResolutionPlan(createRecipeResolutionPlan(recipe), selection, (variantName, selectedValue, variantValues) => warnForInvalidRecipeVariant(recipe, variantName, selectedValue, variantValues));
}
function createRecipeResolver(recipe, options = {}) {
	const plan = createRecipeResolutionPlan(recipe);
	const cache = createBoundedRecipeSelectionCache(validateRecipeResolverCacheSize(options.cacheSize ?? 32));
	let disposed = false;
	const resolve = ((selection = {}) => {
		if (disposed) throw new Error("Recipe resolver has been disposed");
		warnForPartialRecipePayload(recipe);
		const key = canonicalRecipeSelectionKey(plan, selection);
		const cached = cache.get(key);
		if (cached.hit) return cached.value;
		const resolved = resolveRecipeResolutionPlan(plan, selection, (variantName, selectedValue, variantValues) => warnForInvalidRecipeVariant(recipe, variantName, selectedValue, variantValues));
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
function resolveComponentRecipeStyles(recipe, selection = {}, options = {}) {
	warnForPartialComponentRecipePayload(recipe);
	return resolveComponentRecipeResolutionPlan(createComponentRecipeResolutionPlan(recipe, options), selection, (variantName, selectedValue, variantValues) => warnForInvalidComponentRecipeVariant(recipe, variantName, selectedValue, variantValues), (discriminator, normalizedSelection, constraint) => warnForInvalidComponentRecipeState(recipe, discriminator, normalizedSelection, constraint));
}
function createComponentRecipeResolver(recipe, options = {}) {
	const plan = createComponentRecipeResolutionPlan(recipe, options);
	const cache = createBoundedRecipeSelectionCache(validateRecipeResolverCacheSize(options.cacheSize ?? 32));
	let disposed = false;
	const resolve = ((selection = {}) => {
		if (disposed) throw new Error("Component recipe resolver has been disposed");
		warnForPartialComponentRecipePayload(recipe);
		const normalizedSelection = selection;
		validateComponentRecipeExtensionSelection(plan, normalizedSelection);
		const key = canonicalRecipeSelectionKey(plan, normalizedSelection);
		const cached = cache.get(key);
		if (cached.hit) return cached.value;
		const resolved = resolveComponentRecipeResolutionPlan(plan, normalizedSelection, (variantName, selectedValue, variantValues) => warnForInvalidComponentRecipeVariant(recipe, variantName, selectedValue, variantValues), (discriminator, normalizedStateSelection, constraint) => warnForInvalidComponentRecipeState(recipe, discriminator, normalizedStateSelection, constraint));
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
function warnForPartialRecipePayload(recipe) {
	if (recipe.variants !== void 0) return;
	warnOnce(`missing-variants:${recipeDiagnosticName(recipe)}`, formatNativeStylesDiagnostic(NativeStylesDiagnosticCode.PartialRecipePayload, `Invalid native recipe "${recipeDiagnosticName(recipe)}": missing variants map; using base fallback. This can happen when Metro serves stale transformed output.`));
}
function warnForPartialComponentRecipePayload(recipe) {
	if (recipe.variants !== void 0) return;
	const name = componentRecipeDiagnosticName(recipe);
	warnOnce(`missing-component-variants:${name}`, formatNativeStylesDiagnostic(NativeStylesDiagnosticCode.PartialRecipePayload, `Invalid native component recipe "${name}": missing variants map; using base fallback. This can happen when Metro serves stale transformed output.`));
}
function warnForInvalidComponentRecipeVariant(recipe, variantName, selectedValue, variantValues) {
	const supportedValues = Object.keys(variantValues ?? {}).join(", ") || "(none)";
	const name = componentRecipeDiagnosticName(recipe);
	warnOnce(`invalid-component-variant:${name}:${variantName}:${String(selectedValue)}`, formatNativeStylesDiagnostic(NativeStylesDiagnosticCode.InvalidRecipeVariant, `Invalid native component recipe "${name}": variant "${variantName}" does not define value "${String(selectedValue)}"; supported values: ${supportedValues}.`));
}
function warnForInvalidComponentRecipeState(recipe, discriminator, selection, constraint) {
	const name = componentRecipeDiagnosticName(recipe);
	const keys = Object.keys(selection).sort((left, right) => left.localeCompare(right));
	const selectionKey = keys.map((key) => `${key.length}:${key}=${componentDiagnosticValue(selection[key])}`).join("|");
	const describedSelection = keys.map((key) => `${JSON.stringify(key)}: ${componentDiagnosticValue(selection[key])}`).join(", ");
	const supportedCases = constraint.cases.map(({ value, constraints }) => {
		const requirements = constraints.map(([axis, values]) => `${axis}: ${values.map((value) => JSON.stringify(value)).join(" | ")}`).join(", ");
		return requirements === "" ? JSON.stringify(value) : `${JSON.stringify(value)} (${requirements})`;
	}).join("; ");
	warnOnce(`invalid-component-state:${name}:${discriminator}:${selectionKey}`, formatNativeStylesDiagnostic(NativeStylesDiagnosticCode.InvalidRecipeVariant, `Invalid native component recipe "${name}": state "${discriminator}" rejects normalized selection {${describedSelection}}; supported states: ${supportedCases}.`));
}
function componentDiagnosticValue(value) {
	if (value === null) return "null";
	switch (typeof value) {
		case "undefined": return "undefined";
		case "boolean": return String(value);
		case "string": return JSON.stringify(value);
		case "number": return Number.isNaN(value) ? "NaN" : String(value);
		case "bigint": return `${String(value)}n`;
		case "symbol": return String(value);
		case "function": return "[function]";
		case "object": return "[object]";
	}
	return "[unknown]";
}
function componentRecipeDiagnosticName(recipe) {
	return recipe.$$debugName ?? "anonymous";
}
function warnForInvalidRecipeVariant(recipe, variantName, selectedValue, variantValues) {
	const supportedValues = Object.keys(variantValues ?? {}).join(", ") || "(none)";
	warnOnce(`invalid-variant:${recipeDiagnosticName(recipe)}:${variantName}:${String(selectedValue)}`, formatNativeStylesDiagnostic(NativeStylesDiagnosticCode.InvalidRecipeVariant, `Invalid native recipe "${recipeDiagnosticName(recipe)}": variant "${variantName}" does not define value "${String(selectedValue)}"; supported values: ${supportedValues}.`));
}
function recipeDiagnosticName(recipe) {
	return recipe.$$debugName ?? "anonymous";
}
function warnOnce(key, message) {
	if (!shouldWarnInDev() || recipeDiagnosticWarnings.has(key)) return;
	recipeDiagnosticWarnings.add(key);
	console.warn(message);
}
function shouldWarnInDev() {
	const nativeDev = globalThis.__DEV__;
	if (nativeDev !== void 0) return nativeDev;
	if (typeof process === "undefined") return true;
	return process.env.NODE_ENV !== "production";
}
//#endregion
export { createComponentRecipeResolutionPlan as a, validateNativeComponentContract as c, resolveRecipeStyle as i, NativeStylesDiagnosticCode as l, createRecipeResolver as n, resolveComponentRecipeResolutionPlan as o, resolveComponentRecipeStyles as r, validateNativeComponentRecipeExtensionDescriptor as s, createComponentRecipeResolver as t, formatNativeStylesDiagnostic as u };
