import { createContext, createElement, use, useCallback, useLayoutEffect, useMemo, useState, useSyncExternalStore } from "react";
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
const componentContractIdentities = sharedRegistry$2(Symbol.for("crumbs.css.component-contract-identities.v1"), () => /* @__PURE__ */ new Map());
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
	const publicVariants = Object.entries(contract.public.variants).sort(([left], [right]) => compareText(left, right)).map(([axis, values]) => encode(axis) + "=" + encodeSet(values)).join(";");
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
	return [...values].sort(compareText).map(encode).join(",");
}
function encode(value) {
	return value.length + ":" + value;
}
function compareText(left, right) {
	return left < right ? -1 : left > right ? 1 : 0;
}
function assertContractIdentityAvailable(key, signature) {
	const previous = componentContractIdentities.get(key);
	if (previous !== void 0 && previous !== signature) throw new Error("Component contract identity " + JSON.stringify(key) + " was registered with a different public surface or extension permissions. Increment the contract version.");
}
function sharedRegistry$2(key, create) {
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
//#region src/native-tags.ts
const NativeRecipeType = "crumbs.css.recipe";
const NativeComponentRecipeType = "crumbs.css.component-recipe";
const NativeComponentRecipeExtensionType = "crumbs.css.component-recipe-extension";
//#endregion
//#region src/components/extension-contract.ts
const PACKAGE_NAME = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
const IDENTITY_NAME = /^[A-Za-z][A-Za-z0-9._-]*$/;
const NativeRecipeClassSymbol = Symbol.for("crumbs.css.recipe-class-reference");
Object.freeze({
	extensions: Object.freeze([]),
	defaultVariants: Object.freeze({}),
	variants: Object.freeze({}),
	compoundVariants: Object.freeze([]),
	slotOverrides: Object.freeze([]),
	selectionKeys: Object.freeze([]),
	privateOwnerValues: Object.freeze({})
});
/** Validate and normalize one standalone serialized extension descriptor. */
function validateNativeComponentRecipeExtensionDescriptor(value) {
	return normalizeExtensionDescriptor(value, 0, "descriptor");
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
const NativeStyleMapSymbol = Symbol.for("crumbs.css.style-map");
function markNativeStyleMap(map) {
	Object.defineProperty(map, NativeStyleMapSymbol, {
		value: true,
		enumerable: true
	});
	return map;
}
function isNativeStyleMap(value) {
	return typeof value === "object" && value !== null && Object.prototype.hasOwnProperty.call(value, NativeStyleMapSymbol) && value[NativeStyleMapSymbol] === true;
}
//#endregion
//#region src/theme-token.ts
const NativeThemeTokenReferenceType = "crumbs.css.theme-token";
const NATIVE_TOKEN_NAME = /^--crumbs-[A-Za-z0-9_-]+$/;
const domainContracts = sharedRegistry$1(Symbol.for("crumbs.css.theme-token-domain-contracts.v1"), () => /* @__PURE__ */ new WeakMap());
sharedRegistry$1(Symbol.for("crumbs.css.theme-contract-identities.v1"), () => /* @__PURE__ */ new Map());
sharedRegistry$1(Symbol.for("crumbs.css.theme-token-registry.v1"), () => /* @__PURE__ */ new Map());
function createThemeTokenReference(varName) {
	if (typeof varName !== "string" || !NATIVE_TOKEN_NAME.test(varName)) invalidReference("constructor");
	return {
		$$type: NativeThemeTokenReferenceType,
		varName
	};
}
/** @internal A domain contract owns token references through this local map. */
function isThemeTokenContract(contract) {
	return typeof contract === "object" && contract !== null && domainContracts.has(contract);
}
/** @internal Check token ownership without relying on the global var-name registry. */
function isThemeTokenOwnedByContract(contract, token) {
	return domainContracts.get(contract)?.has(String(token)) ?? false;
}
function sharedRegistry$1(key, create) {
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
function isThemeTokenReference(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	const prototype = Object.getPrototypeOf(value);
	if (prototype !== null && Object.getPrototypeOf(prototype) !== null) return false;
	if (Reflect.ownKeys(value).length !== 2) return false;
	const tag = Object.getOwnPropertyDescriptor(value, "$$type");
	const name = Object.getOwnPropertyDescriptor(value, "varName");
	return tag !== void 0 && "value" in tag && tag.enumerable === true && tag.value === "crumbs.css.theme-token" && name !== void 0 && "value" in name && name.enumerable === true && typeof name.value === "string" && NATIVE_TOKEN_NAME.test(name.value);
}
function isThemeTokenReferenceCandidate(value) {
	if (typeof value !== "object" || value === null) return false;
	for (let current = value; current !== null; current = Object.getPrototypeOf(current)) {
		const descriptor = Object.getOwnPropertyDescriptor(current, "$$type");
		if (descriptor !== void 0) return !("value" in descriptor) || descriptor.value === "crumbs.css.theme-token";
	}
	return false;
}
function assertThemeTokenReference(value, property) {
	if (!isThemeTokenReference(value)) invalidReference(`property "${property}"`);
}
function invalidReference(location) {
	throw new Error(formatNativeStylesDiagnostic(NativeStylesDiagnosticCode.InvalidThemeTokenReference, `Invalid native theme token reference at ${location}. Expected exactly own enumerable data fields $$type="${NativeThemeTokenReferenceType}" and varName matching --crumbs-[A-Za-z0-9_-]+. Regenerate artifacts or use createThemeTokenReference with a valid native token name.`));
}
sharedRegistry$1(Symbol.for("crumbs.css.local-terminal-domains.v1"), () => /* @__PURE__ */ new Map());
//#endregion
//#region src/runtime/theme-store.ts
/**
* A small immutable-snapshot store for React's useSyncExternalStore contract.
* Every notification observes the same committed snapshot; identical object
* identities do not notify.
*/
function createThemeStore(initial) {
	let snapshot = initial;
	let disposed = false;
	const listeners = /* @__PURE__ */ new Set();
	return {
		getSnapshot: () => snapshot,
		setSnapshot(next) {
			if (disposed) throw new Error("Theme store has been disposed");
			if (Object.is(snapshot, next)) return;
			snapshot = next;
			for (const listener of [...listeners]) if (listeners.has(listener)) listener();
		},
		subscribe(listener) {
			if (disposed) return () => void 0;
			listeners.add(listener);
			let active = true;
			return () => {
				if (!active) return;
				active = false;
				listeners.delete(listener);
			};
		},
		dispose() {
			if (disposed) return;
			disposed = true;
			listeners.clear();
		}
	};
}
/**
* Derive a selector-specific external store. The parent store is observed only
* while at least one selector consumer is subscribed, and listeners are
* notified only when the selected reference changes.
*/
function createThemeSelectorStore(parent, selector) {
	let selected = selector(parent.getSnapshot());
	let disposed = false;
	let parentUnsubscribe;
	const listeners = /* @__PURE__ */ new Set();
	const notifyFromParent = () => {
		const next = selector(parent.getSnapshot());
		if (Object.is(selected, next)) return;
		selected = next;
		for (const listener of [...listeners]) if (listeners.has(listener)) listener();
	};
	return {
		getSnapshot: () => {
			const next = selector(parent.getSnapshot());
			if (!Object.is(selected, next)) selected = next;
			return selected;
		},
		subscribe(listener) {
			if (disposed) return () => void 0;
			listeners.add(listener);
			if (listeners.size === 1) parentUnsubscribe = parent.subscribe(notifyFromParent);
			let active = true;
			return () => {
				if (!active) return;
				active = false;
				listeners.delete(listener);
				if (listeners.size === 0) {
					parentUnsubscribe?.();
					parentUnsubscribe = void 0;
				}
			};
		},
		dispose() {
			if (disposed) return;
			disposed = true;
			parentUnsubscribe?.();
			parentUnsubscribe = void 0;
			listeners.clear();
		}
	};
}
//#endregion
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
//#region src/runtime/theme-context.ts
const key = Symbol.for("crumbs.css.theme-store-context.v1");
function sharedContext() {
	const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
	if (descriptor && "value" in descriptor) return descriptor.value;
	const value = createContext(null);
	Object.defineProperty(globalThis, key, {
		value,
		enumerable: false,
		configurable: false,
		writable: false
	});
	return value;
}
const ThemeStoreContext = sharedContext();
sharedRegistry(Symbol.for("crumbs.css.token-theme-context.v2"), () => createContext(null));
const themeResolutionCache = sharedRegistry(Symbol.for("crumbs.css.theme-resolution-cache.v1"), () => /* @__PURE__ */ new WeakMap());
function useThemeStore(theme) {
	const [store] = useState(() => createThemeStore(theme));
	useLayoutEffect(() => {
		store.setSnapshot(theme);
	}, [store, theme]);
	return store;
}
function useThemeStoreSelector(store, selector) {
	const selectedStore = useMemo(() => createThemeSelectorStore(store, selector), [selector, store]);
	return useSyncExternalStore(selectedStore.subscribe, selectedStore.getSnapshot, selectedStore.getSnapshot);
}
const identityThemeSelector = (theme) => theme;
function ThemeProvider({ children, theme }) {
	const store = useThemeStore(theme);
	return createElement(ThemeStoreContext.Provider, { value: store }, children);
}
function useTheme() {
	const store = use(ThemeStoreContext);
	if (store === null) throw new Error("useTheme must be used within a ThemeProvider from @opsydyn/crumbs-css/theme");
	return useThemeStoreSelector(store, identityThemeSelector);
}
function useThemeSelector(selector) {
	const store = use(ThemeStoreContext);
	if (store === null) throw new Error("useThemeSelector must be used within a ThemeProvider from @opsydyn/crumbs-css/theme");
	return useThemeStoreSelector(store, selector);
}
function useThemedStyle(style) {
	return useThemeSelector(useCallback((theme) => resolveThemeTokens(style, theme), [style]));
}
function useThemedStyles(styles) {
	return useThemeSelector(useCallback((theme) => resolveThemeStyles(styles, theme), [styles]));
}
function resolveThemeStyles(styles, theme) {
	assertNoLocalStylePlan(styles);
	const cached = getCachedResolution(theme, styles, "styles");
	if (cached.hit) return cached.value;
	const resolved = {};
	let changed = false;
	for (const [key, style] of Object.entries(styles)) {
		const next = resolveStyleExport(style, theme);
		resolved[key] = next;
		if (next !== style) changed = true;
	}
	const result = changed ? resolved : styles;
	setCachedResolution(theme, styles, "styles", result);
	return result;
}
function resolveThemeTokens(style, theme) {
	assertNoLocalStylePlan(style);
	const cached = getCachedResolution(theme, style, "tokens");
	if (cached.hit) return cached.value;
	if (isNativeComponentRecipe(style)) {
		const resolved = resolveComponentRecipeThemeTokens(style, theme);
		setCachedResolution(theme, style, "tokens", resolved);
		return resolved;
	}
	if (isNativeComponentRecipeExtension(style)) {
		const resolved = resolveComponentRecipeExtensionThemeTokens(style, theme);
		setCachedResolution(theme, style, "tokens", resolved);
		return resolved;
	}
	const flattened = flattenStyle(style);
	if (flattened === void 0) {
		setCachedResolution(theme, style, "tokens", void 0);
		return;
	}
	const entries = Object.entries(flattened);
	let changed = Array.isArray(style);
	let resolved = Array.isArray(style) ? {} : void 0;
	for (const [index, entry] of entries.entries()) {
		const [key, value] = entry;
		assertNoLocalStylePlan(value);
		if (isThemeTokenReferenceCandidate(value)) {
			assertThemeTokenReference(value, key);
			if (resolved === void 0) {
				resolved = {};
				for (const [previousKey, previousValue] of entries.slice(0, index)) resolved[previousKey] = previousValue;
			}
			resolved[key] = resolveTokenValue(value.varName, theme);
			changed = true;
		} else if (resolved !== void 0) resolved[key] = value;
	}
	const result = changed ? resolved ?? {} : style;
	setCachedResolution(theme, style, "tokens", result);
	return result;
}
const localPlanFreeImmutableGraphs = /* @__PURE__ */ new WeakSet();
function assertNoLocalStylePlan(value) {
	if (typeof value !== "object" || value === null || localPlanFreeImmutableGraphs.has(value)) return;
	const pending = [value], seen = /* @__PURE__ */ new Set();
	let immutable = true;
	while (pending.length) {
		const current = pending.pop();
		if (seen.has(current) || localPlanFreeImmutableGraphs.has(current)) continue;
		seen.add(current);
		if (Object.getOwnPropertyDescriptor(current, "$$type")?.value === "crumbs.css.local-style-plan") throw new Error(formatNativeStylesDiagnostic(NativeStylesDiagnosticCode.LocalStylePlanRequired, "Local style plans require resolveAssignedStyles or useAssignedStyles from @opsydyn/crumbs-css/theme/vars."));
		immutable &&= Object.isFrozen(current);
		for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(current))) {
			if (!("value" in descriptor)) {
				immutable = false;
				continue;
			}
			if (typeof descriptor.value === "object" && descriptor.value !== null) pending.push(descriptor.value);
		}
	}
	if (immutable) localPlanFreeImmutableGraphs.add(value);
}
function flattenStyle(style) {
	assertNoLocalStylePlan(style);
	if (style === null || style === void 0 || style === false) return void 0;
	if (Array.isArray(style)) {
		const flattened = style.flatMap((item) => {
			const resolved = flattenStyle(item);
			return resolved === void 0 ? [] : [resolved];
		});
		if (flattened.length === 0) return void 0;
		return Object.assign({}, ...flattened);
	}
	if (typeof style === "object") return style;
}
function resolveStyleExport(style, theme) {
	if (isNativeComponentRecipe(style)) return resolveComponentRecipeThemeTokens(style, theme);
	if (isNativeRecipe(style)) return resolveRecipeThemeTokens(style, theme);
	if (isNativeSprinklesLookupPlan(style)) return resolveSprinklesThemeTokens(style, theme);
	if (isNestedStyleMap(style)) {
		const resolved = {};
		let changed = false;
		for (const [key, value] of Object.entries(style)) {
			const next = resolveThemeTokens(value, theme);
			resolved[key] = next;
			if (next !== value) changed = true;
		}
		if (!changed) return style;
		return isNativeStyleMap(style) ? markNativeStyleMap(resolved) : resolved;
	}
	return resolveThemeTokens(style, theme);
}
function resolveSprinklesThemeTokens(plan, theme) {
	let changed = false;
	const properties = {};
	for (const [property, scale] of Object.entries(plan.properties)) {
		const resolvedScale = {};
		for (const [scaleName, style] of Object.entries(scale)) {
			const next = typeof style === "object" && style !== null ? resolveThemeTokens(style, theme) ?? style : style;
			resolvedScale[scaleName] = next;
			if (next !== style) changed = true;
		}
		properties[property] = resolvedScale;
	}
	if (!changed) return plan;
	return Object.freeze({
		...plan,
		properties: Object.freeze(Object.fromEntries(Object.entries(properties).map(([property, scale]) => [property, Object.freeze(scale)])))
	});
}
function resolveRecipeThemeTokens(recipe, theme) {
	const cached = getCachedResolution(theme, recipe, "recipe");
	if (cached.hit) return cached.value;
	const variants = {};
	let changed = recipe.variants === void 0 || recipe.defaultVariants === void 0 || recipe.compoundVariants === void 0;
	for (const [variantName, variantValues] of Object.entries(recipe.variants ?? {})) {
		const resolvedValues = {};
		for (const [valueName, style] of Object.entries(variantValues)) {
			const next = resolveThemeTokens(style, theme);
			resolvedValues[valueName] = next;
			if (next !== style) changed = true;
		}
		variants[variantName] = resolvedValues;
	}
	const base = recipe.base === void 0 ? void 0 : resolveThemeTokens(recipe.base, theme);
	if (base !== recipe.base) changed = true;
	const compoundVariants = (recipe.compoundVariants ?? []).map((compoundVariant) => {
		const style = resolveThemeTokens(compoundVariant.style, theme);
		if (style !== compoundVariant.style) changed = true;
		return {
			style,
			variants: compoundVariant.variants
		};
	});
	if (!changed) {
		setCachedResolution(theme, recipe, "recipe", recipe);
		return recipe;
	}
	const resolved = {
		$$type: NativeRecipeType,
		...recipe.$$debugName === void 0 ? {} : { $$debugName: recipe.$$debugName },
		...base === void 0 ? {} : { base },
		compoundVariants,
		defaultVariants: recipe.defaultVariants ?? {},
		variants
	};
	setCachedResolution(theme, recipe, "recipe", resolved);
	return resolved;
}
function resolveComponentRecipeThemeTokens(recipe, theme) {
	const cached = getCachedResolution(theme, recipe, "component-recipe");
	if (cached.hit) return cached.value;
	if (recipe.version !== 1 && recipe.version !== 2 && recipe.version !== 3) throw new TypeError(`Unsupported component recipe version ${String(recipe.version)}`);
	if (recipe.version === 3) {
		if (recipe.contract === void 0) throw new TypeError("Version 3 component recipes require contract metadata");
		const variantSurface = Object.fromEntries(Object.entries(recipe.variants ?? {}).map(([axis, values]) => [axis, Object.fromEntries(Object.keys(values).map((value) => [value, true]))]));
		validateNativeComponentContract(recipe.contract, {
			slots: recipe.slots,
			variants: variantSurface
		}, recipe.stateVariants);
	} else if (recipe.contract !== void 0) throw new TypeError("Component contract metadata requires component recipe version 3");
	let changed = recipe.variants === void 0 || recipe.defaultVariants === void 0 || recipe.compoundVariants === void 0;
	const base = recipe.base === void 0 ? void 0 : resolveComponentSlotStyles(recipe.base, theme, "base", () => {
		changed = true;
	});
	const variants = {};
	for (const [variantName, variantValues] of Object.entries(recipe.variants ?? {})) {
		const resolvedValues = {};
		for (const [valueName, styles] of Object.entries(variantValues)) resolvedValues[valueName] = resolveComponentSlotStyles(styles, theme, `variant ${JSON.stringify(variantName)} value ${JSON.stringify(valueName)}`, () => {
			changed = true;
		});
		variants[variantName] = Object.freeze(resolvedValues);
	}
	const compoundVariants = (recipe.compoundVariants ?? []).map((compound, index) => Object.freeze({
		variants: Object.freeze({ ...compound.variants }),
		styles: resolveComponentSlotStyles(compound.styles, theme, `compound variant ${index}`, () => {
			changed = true;
		})
	}));
	if (!changed) {
		setCachedResolution(theme, recipe, "component-recipe", recipe);
		return recipe;
	}
	const frozenVariants = Object.freeze(Object.fromEntries(Object.entries(variants).map(([variantName, values]) => [variantName, Object.freeze(Object.fromEntries(Object.entries(values).map(([valueName, styles]) => [valueName, freezeComponentSlotStyles(styles)])))])));
	const frozenCompounds = Object.freeze(compoundVariants.map((compound) => Object.freeze({
		variants: compound.variants,
		styles: freezeComponentSlotStyles(compound.styles)
	})));
	const stateVariants = recipe.stateVariants === void 0 ? void 0 : cloneAndFreezeComponentStyle(recipe.stateVariants);
	const resolved = Object.freeze({
		$$type: NativeComponentRecipeType,
		version: recipe.version,
		...recipe.$$debugName === void 0 ? {} : { $$debugName: recipe.$$debugName },
		slots: Object.freeze({ ...recipe.slots }),
		...recipe.contract === void 0 ? {} : { contract: recipe.contract },
		...base === void 0 ? {} : { base: freezeComponentSlotStyles(base) },
		variants: frozenVariants,
		defaultVariants: Object.freeze({ ...recipe.defaultVariants }),
		...stateVariants === void 0 ? {} : { stateVariants },
		compoundVariants: frozenCompounds
	});
	setCachedResolution(theme, recipe, "component-recipe", resolved);
	return resolved;
}
function resolveComponentRecipeExtensionThemeTokens(extension, theme) {
	const cached = getCachedResolution(theme, extension, "component-recipe-extension");
	if (cached.hit) return cached.value;
	if (extension.version !== 1) throw new TypeError(`Unsupported component recipe extension version ${String(extension.version)}`);
	const normalized = validateNativeComponentRecipeExtensionDescriptor(extension);
	let changed = false;
	const variants = Object.fromEntries(Object.entries(normalized.variants).map(([axis, values]) => [axis, Object.fromEntries(Object.entries(values).map(([value, styles]) => [value, resolveComponentSlotStyles(styles, theme, `extension variant ${JSON.stringify(axis)} value ${JSON.stringify(value)}`, () => {
		changed = true;
	})]))]));
	const compoundVariants = normalized.compoundVariants.map((compound, index) => Object.freeze({
		variants: compound.variants,
		styles: resolveComponentSlotStyles(compound.styles, theme, `extension compound variant ${index}`, () => {
			changed = true;
		})
	}));
	const slotOverrides = resolveComponentSlotStyles(normalized.slotOverrides, theme, "extension slot overrides", () => {
		changed = true;
	});
	if (!changed) {
		setCachedResolution(theme, extension, "component-recipe-extension", extension);
		return extension;
	}
	const resolved = Object.freeze({
		...normalized,
		defaultVariants: cloneAndFreezeComponentStyle(normalized.defaultVariants),
		variants: Object.freeze(Object.fromEntries(Object.entries(variants).map(([axis, values]) => [axis, Object.freeze(Object.fromEntries(Object.entries(values).map(([value, styles]) => [value, freezeComponentSlotStyles(styles)])))]))),
		compoundVariants: Object.freeze(compoundVariants.map((compound) => Object.freeze({
			variants: cloneAndFreezeComponentStyle(compound.variants),
			styles: freezeComponentSlotStyles(compound.styles)
		}))),
		slotOverrides: freezeComponentSlotStyles(slotOverrides)
	});
	setCachedResolution(theme, extension, "component-recipe-extension", resolved);
	return resolved;
}
function resolveComponentSlotStyles(styles, theme, context, markChanged) {
	const entries = [];
	assertComponentThemeRecord(styles, `Component recipe ${context} slot styles`);
	for (const [slot, style] of Object.entries(styles)) {
		const next = resolveThemeTokens(style, theme);
		if (next !== style) markChanged();
		entries.push([slot, next ?? style]);
	}
	return Object.freeze(Object.fromEntries(entries));
}
function assertComponentThemeRecord(value, context) {
	if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${context} must be a record`);
	const prototype = Object.getPrototypeOf(value);
	if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${context} must be a plain record`);
	for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) if (!("value" in descriptor) || !descriptor.enumerable) throw new TypeError(`${context} must contain enumerable data properties`);
}
function freezeComponentSlotStyles(styles) {
	return Object.freeze(Object.fromEntries(Object.entries(styles).map(([slot, style]) => [slot, cloneAndFreezeComponentStyle(style)])));
}
function cloneAndFreezeComponentStyle(value) {
	if (Array.isArray(value)) return Object.freeze(value.map((entry) => cloneAndFreezeComponentStyle(entry)));
	if (value === null || typeof value !== "object") return value;
	if ("$$type" in value && value.$$type === "crumbs.css.class" && "className" in value && typeof value.className === "string" && Object.isFrozen(value)) return value;
	const clone = Object.create(Object.getPrototypeOf(value));
	for (const key of Reflect.ownKeys(value)) {
		const descriptor = Object.getOwnPropertyDescriptor(value, key);
		if (descriptor === void 0) continue;
		if (!("value" in descriptor)) throw new TypeError("Component recipe style values must be plain data records");
		Object.defineProperty(clone, key, {
			...descriptor,
			value: cloneAndFreezeComponentStyle(descriptor.value)
		});
	}
	return Object.freeze(clone);
}
function isNativeRecipe(value) {
	return typeof value === "object" && value !== null && "$$type" in value && value.$$type === "crumbs.css.recipe";
}
function isNativeComponentRecipeExtension(value) {
	return typeof value === "object" && value !== null && "$$type" in value && value.$$type === "crumbs.css.component-recipe-extension";
}
function isNativeComponentRecipe(value) {
	return typeof value === "object" && value !== null && "$$type" in value && value.$$type === "crumbs.css.component-recipe";
}
function isNativeSprinklesLookupPlan(value) {
	return typeof value === "object" && value !== null && "$$type" in value && value.$$type === "crumbs.css.sprinkles-lookup-plan";
}
function isNestedStyleMap(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	if (isNativeStyleMap(value)) return true;
	const entries = Object.entries(value);
	return entries.length > 0 && entries.every(([key, entry]) => {
		if (isStructuredNativeValue(key, entry)) return false;
		return entry === void 0 || entry === null || entry === false || typeof entry === "object" && !isThemeTokenReferenceCandidate(entry);
	});
}
const NATIVE_ARRAY_VALUE_PROPS = new Set([
	"transform",
	"transformOrigin",
	"transformMatrix",
	"fontVariant",
	"filter",
	"boxShadow",
	"experimental_backgroundImage",
	"experimental_backgroundSize",
	"experimental_backgroundPosition",
	"experimental_backgroundRepeat"
]);
function isStructuredNativeValue(key, value) {
	if (Array.isArray(value)) return NATIVE_ARRAY_VALUE_PROPS.has(key);
	if (typeof value !== "object" || value === null || isThemeTokenReferenceCandidate(value)) return false;
	if (key === "color" || key.endsWith("Color")) return true;
	if ((key === "shadowOffset" || key === "textShadowOffset") && "width" in value && "height" in value) return true;
	return "__getValue" in value && typeof value.__getValue === "function";
}
function resolveTokenValue(varName, theme) {
	const token = `var(${varName})`;
	if (isThemeTokenContract(theme.contract) && !isThemeTokenOwnedByContract(theme.contract, token)) throw new Error(formatNativeStylesDiagnostic(NativeStylesDiagnosticCode.TokenThemeTokenContractMismatch, `Theme token "${varName}" does not belong to the active domain contract. Use the token reference exported by that contract or keep the legacy reference on a legacy ThemeProvider.`));
	if (!Object.prototype.hasOwnProperty.call(theme.tokens, varName)) throw new Error(formatNativeStylesDiagnostic(NativeStylesDiagnosticCode.MissingThemeToken, `Theme token "${varName}" is missing from the active native theme`));
	return theme.tokens[varName];
}
function getCachedResolution(theme, input, kind) {
	if (!isCacheableObject(input)) return { hit: false };
	const entry = (themeResolutionCache.get(theme)?.get(input))?.get(kind);
	return entry === void 0 ? { hit: false } : {
		hit: true,
		value: entry.value
	};
}
function setCachedResolution(theme, input, kind, value) {
	if (!isCacheableObject(input)) return;
	let byInput = themeResolutionCache.get(theme);
	if (byInput === void 0) {
		byInput = /* @__PURE__ */ new WeakMap();
		themeResolutionCache.set(theme, byInput);
	}
	let entries = byInput.get(input);
	if (entries === void 0) {
		entries = /* @__PURE__ */ new Map();
		byInput.set(input, entries);
	}
	entries.set(kind, { value });
}
function isCacheableObject(value) {
	return typeof value === "object" && value !== null;
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
export { NATIVE_CONDITION_BREAKPOINTS, NATIVE_RESPONSIVE_CONDITION_MATCHERS, NATIVE_RESPONSIVE_CONDITION_NAMES, NativeThemeTokenReferenceType, ThemeProvider, createNativeConditionResolver, createNativeConditionStore, createNativeMapValueFn, createNativeNormalizeValueFn, createThemeTokenReference, defaultNativeConditionSnapshot, isThemeTokenReference, mapNativeConditionValueToBranches, nativeConditionSnapshotKey, normalizeNativeConditionInput, resolveThemeStyles, resolveThemeTokens, useNativeConditionSnapshot, useTheme, useThemeSelector, useThemedStyle, useThemedStyles };
