import { createContext, createElement, use, useLayoutEffect, useMemo, useState, useSyncExternalStore } from "react";
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
//#region src/theme-token.ts
const NativeThemeTokenReferenceType = "crumbs.css.theme-token";
const NATIVE_TOKEN_NAME = /^--crumbs-[A-Za-z0-9_-]+$/;
const domainContracts = sharedRegistry$1(Symbol.for("crumbs.css.theme-token-domain-contracts.v1"), () => /* @__PURE__ */ new WeakMap());
sharedRegistry$1(Symbol.for("crumbs.css.theme-contract-identities.v1"), () => /* @__PURE__ */ new Map());
const themeTokenRegistry = sharedRegistry$1(Symbol.for("crumbs.css.theme-token-registry.v1"), () => /* @__PURE__ */ new Map());
function createThemeTokenReference(varName) {
	if (typeof varName !== "string" || !NATIVE_TOKEN_NAME.test(varName)) invalidReference("constructor");
	return {
		$$type: NativeThemeTokenReferenceType,
		varName
	};
}
/** @internal Used by native-style and token ID helpers. */
function getThemeTokenMetadata(value) {
	const metadata = themeTokenRegistry.get(value);
	if (metadata === void 0) throw new Error(`Unknown native theme token "${value}"`);
	return metadata;
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
//#region src/theme-contract.ts
function getThemeVarName(value) {
	return getThemeTokenMetadata(value).varName;
}
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
//#region src/theme-token-only.ts
/** Currying keeps the target native style type fixed while preserving literal style keys. */
function createTokenStyles() {
	return (styles) => styles;
}
/** Create a style reference whose value and domain are derived from its token contract. */
function themeToken(token) {
	return createThemeTokenReference(getThemeVarName(token));
}
const themeStoreContext = sharedRegistry(Symbol.for("crumbs.css.theme-store-context.v1"), () => createContext(null));
const resolutions = /* @__PURE__ */ new WeakMap();
/** A minimal provider that interoperates with the full theme entrypoint. */
function ThemeProvider({ children, theme }) {
	const [store] = useState(() => createThemeStore(theme));
	useLayoutEffect(() => store.setSnapshot(theme), [store, theme]);
	return createElement(themeStoreContext.Provider, { value: store }, children);
}
/** Resolve a flat map of primitive native styles and direct token references. */
function resolveTokenStyles(styles, theme) {
	const cached = getCachedResolution(theme, styles);
	if (cached.found) return cached.value;
	if (!isPlainRecord(styles)) unsupported("style map must be a flat record");
	const styleEntries = ownDataEntries(styles, "style map");
	let resolvedMap;
	for (const [styleName, styleValue] of styleEntries) {
		if (!isPlainRecord(styleValue)) unsupported(`style "${styleName}" must be a flat record`);
		const propertyEntries = ownDataEntries(styleValue, `style "${styleName}"`);
		let resolvedStyle;
		for (const [property, value] of propertyEntries) if (isThemeTokenReferenceCandidate(value)) {
			assertThemeTokenReference(value, property);
			const nextValue = resolveTokenValue(value.varName, theme);
			if (resolvedStyle === void 0) resolvedStyle = { ...styleValue };
			Object.defineProperty(resolvedStyle, property, {
				value: nextValue,
				enumerable: true,
				configurable: true,
				writable: true
			});
		} else if (value !== void 0 && typeof value !== "string" && typeof value !== "number") unsupported(`property "${property}" in style "${styleName}" must be a string, number, undefined, or direct theme token reference`);
		if (resolvedStyle !== void 0) {
			if (resolvedMap === void 0) resolvedMap = { ...styles };
			Object.defineProperty(resolvedMap, styleName, {
				value: resolvedStyle,
				enumerable: true,
				configurable: true,
				writable: true
			});
		}
	}
	const result = resolvedMap ?? styles;
	setCachedResolution(theme, styles, result);
	return result;
}
/** React hook for the resolved token-only style subpath. */
function useTokenStyles(styles) {
	const store = use(themeStoreContext);
	if (store === null) throw new Error("useTokenStyles must be used within a ThemeProvider from @opsydyn/crumbs-css/theme/token");
	const selector = useMemo(() => (snapshot) => resolveTokenStyles(styles, snapshot), [styles]);
	const selectedStore = useMemo(() => createThemeSelectorStore(store, selector), [selector, store]);
	return useSyncExternalStore(selectedStore.subscribe, selectedStore.getSnapshot, selectedStore.getSnapshot);
}
function resolveTokenValue(varName, theme) {
	const token = `var(${varName})`;
	if (isThemeTokenContract(theme.contract) && !isThemeTokenOwnedByContract(theme.contract, token)) throw new Error(formatNativeStylesDiagnostic(NativeStylesDiagnosticCode.TokenThemeTokenContractMismatch, `Theme token "${varName}" does not belong to the active domain contract.`));
	const descriptor = Object.getOwnPropertyDescriptor(theme.tokens, varName);
	if (descriptor === void 0 || !("value" in descriptor)) throw new Error(formatNativeStylesDiagnostic(NativeStylesDiagnosticCode.MissingThemeToken, `Theme token "${varName}" is missing from the active native theme`));
	if (typeof descriptor.value !== "string" && typeof descriptor.value !== "number") unsupported(`theme token "${varName}" did not resolve to a native string or number`);
	return descriptor.value;
}
function getCachedResolution(theme, styles) {
	return {
		found: resolutions.get(theme)?.has(styles) ?? false,
		value: resolutions.get(theme)?.get(styles)
	};
}
function setCachedResolution(theme, styles, value) {
	let byStyles = resolutions.get(theme);
	if (byStyles === void 0) {
		byStyles = /* @__PURE__ */ new WeakMap();
		resolutions.set(theme, byStyles);
	}
	byStyles.set(styles, value);
}
function ownDataEntries(value, location) {
	const entries = [];
	for (const key of Reflect.ownKeys(value)) {
		if (typeof key !== "string") unsupported(`${location} cannot contain symbol keys`);
		const descriptor = Object.getOwnPropertyDescriptor(value, key);
		if (descriptor === void 0 || !("value" in descriptor) || !descriptor.enumerable) unsupported(`${location} must contain only enumerable own data properties`);
		entries.push([key, descriptor.value]);
	}
	return entries;
}
function isPlainRecord(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}
function unsupported(message) {
	throw new Error(`[crumbs-css:CRUMBS_CSS_TOKEN_STYLE_UNSUPPORTED] ${message}`);
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
export { ThemeProvider, createTokenStyles, resolveTokenStyles, themeToken, useTokenStyles };
