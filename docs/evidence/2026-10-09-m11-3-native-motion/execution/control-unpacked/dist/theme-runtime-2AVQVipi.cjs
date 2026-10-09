const require_theme_recipe_resolvers = require("./theme-recipe-resolvers-CVWEqjaA.cjs");
const require_recipe_resolution_plan = require("./recipe-resolution-plan-hSEUJtU_.cjs");
let react = require("react");
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
//#region src/tokens/identity.ts
const PACKAGE_NAME = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
const CONTRACT_NAME = /^[A-Za-z][A-Za-z0-9._-]*$/;
/** Normalize and validate the public identity input once at contract creation. */
function normalizeTokenContractIdentity(input) {
	if (input === void 0) return void 0;
	const identityDescriptor = isRecord$1(input) ? Object.getOwnPropertyDescriptor(input, "identity") : void 0;
	const visibilityDescriptor = isRecord$1(input) ? Object.getOwnPropertyDescriptor(input, "visibility") : void 0;
	const candidate = identityDescriptor !== void 0 && "value" in identityDescriptor ? identityDescriptor.value : visibilityDescriptor !== void 0 ? void 0 : input;
	if (candidate === void 0) return void 0;
	const owner = isRecord$1(candidate) ? ownData(candidate, "owner") : void 0;
	const name = isRecord$1(candidate) ? ownData(candidate, "name") : void 0;
	const version = isRecord$1(candidate) ? ownData(candidate, "version") : void 0;
	if (!isRecord$1(candidate) || Object.keys(candidate).length !== 3 || typeof owner !== "string" || !PACKAGE_NAME.test(owner) || typeof name !== "string" || !CONTRACT_NAME.test(name) || typeof version !== "number" || !Number.isSafeInteger(version) || version <= 0) throw new Error("Invalid token contract identity. Expected { owner: package-name, name: identifier, version: positive-safe-integer }.");
	return Object.freeze({
		owner,
		name,
		version
	});
}
/** A stable key suitable for maps and React context lookup. */
function tokenContractIdentityKey(identity) {
	return `${identity.owner}#${identity.name}@${identity.version}`;
}
function isRecord$1(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function ownData(value, key) {
	const descriptor = Object.getOwnPropertyDescriptor(value, key);
	return descriptor !== void 0 && descriptor.enumerable === true && "value" in descriptor ? descriptor.value : void 0;
}
//#endregion
//#region src/theme-token.ts
const NativeThemeTokenReferenceType = "crumbs.css.theme-token";
const NATIVE_TOKEN_NAME = /^--crumbs-[A-Za-z0-9_-]+$/;
const domainContracts = sharedRegistry$1(Symbol.for("crumbs.css.theme-token-domain-contracts.v1"), () => /* @__PURE__ */ new WeakMap());
sharedRegistry$1(Symbol.for("crumbs.css.theme-contract-identities.v1"), () => /* @__PURE__ */ new Map());
const contractIdentitySymbol = Symbol.for("crumbs.css.theme-contract-identity.v1");
const themeTokenRegistry = sharedRegistry$1(Symbol.for("crumbs.css.theme-token-registry.v1"), () => /* @__PURE__ */ new Map());
function createThemeTokenReference(varName) {
	if (typeof varName !== "string" || !NATIVE_TOKEN_NAME.test(varName)) invalidReference("constructor");
	return {
		$$type: NativeThemeTokenReferenceType,
		varName
	};
}
/** @internal Used by native-style without exposing registry machinery publicly. */
function isRegisteredThemeVar(value) {
	return typeof value === "string" && themeTokenRegistry.has(value);
}
/** @internal Used by native-style and token ID helpers. */
function getThemeTokenMetadata(value) {
	const metadata = themeTokenRegistry.get(value);
	if (metadata === void 0) throw new Error(`Unknown native theme token "${value}"`);
	return metadata;
}
function getThemeTokenPublicId(value) {
	const metadata = getThemeTokenMetadata(value);
	return metadata.publicId ?? metadata.varName;
}
/** @internal Visibility is authoring metadata used to constrain component contracts. */
function getThemeTokenVisibility(value) {
	return getThemeTokenMetadata(value).visibility ?? "public";
}
/** @internal A domain contract owns token references through this local map. */
function isThemeTokenContract(contract) {
	return typeof contract === "object" && contract !== null && domainContracts.has(contract);
}
/** @internal Check token ownership without relying on the global var-name registry. */
function isThemeTokenOwnedByContract(contract, token) {
	return domainContracts.get(contract)?.has(String(token)) ?? false;
}
function getThemeContractIdentityKey(contract) {
	return getThemeContractIdentityMetadata(contract)?.key;
}
function getThemeContractShapeSignature(contract) {
	return getThemeContractIdentityMetadata(contract)?.signature;
}
function getThemeContractIdentityMetadata(contract) {
	if (typeof contract !== "object" || contract === null) return void 0;
	const descriptor = Object.getOwnPropertyDescriptor(contract, contractIdentitySymbol);
	if (descriptor === void 0 || !("value" in descriptor)) return void 0;
	const value = descriptor.value;
	if (typeof value !== "object" || value === null) return void 0;
	const metadata = value;
	return typeof metadata.key === "string" && typeof metadata.signature === "string" && typeof metadata.identity === "object" && metadata.identity !== null ? metadata : void 0;
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
/** @internal Used by diagnostics and future manifest emitters. */
function getThemeTokenDomainForContract(contract, token) {
	return domainContracts.get(contract)?.get(String(token))?.domain;
}
function getThemeTokenAliasForContract(contract, token) {
	return domainContracts.get(contract)?.get(String(token))?.alias;
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
	throw new Error(require_theme_recipe_resolvers.formatNativeStylesDiagnostic(require_theme_recipe_resolvers.NativeStylesDiagnosticCode.InvalidThemeTokenReference, `Invalid native theme token reference at ${location}. Expected exactly own enumerable data fields $$type="${NativeThemeTokenReferenceType}" and varName matching --crumbs-[A-Za-z0-9_-]+. Regenerate artifacts or use createThemeTokenReference with a valid native token name.`));
}
sharedRegistry$1(Symbol.for("crumbs.css.local-terminal-domains.v1"), () => /* @__PURE__ */ new Map());
//#endregion
//#region src/runtime/theme-dependency-plan.ts
const ThemeDependencyPlanType = "crumbs.css.theme-dependency-plan";
/**
* Canonicalises compiler-emitted dependency entries into immutable data. A
* path may be discovered more than once while traversing composed exports; its
* token set is merged before sorting so equivalent modules emit equivalent
* plans.
*/
function createThemeDependencyPlan(entries) {
	const byPath = /* @__PURE__ */ new Map();
	for (const entry of entries) {
		const path = validatePath(entry.path);
		const tokens = validateTokens(entry.tokens);
		const key = themeDependencyPathKey(path);
		const existing = byPath.get(key);
		if (existing === void 0) byPath.set(key, {
			path,
			tokens: new Set(tokens)
		});
		else for (const token of tokens) existing.tokens.add(token);
	}
	const canonicalEntries = [...byPath.values()].sort((left, right) => themeDependencyPathKey(left.path).localeCompare(themeDependencyPathKey(right.path))).map(({ path, tokens }) => Object.freeze({
		path: Object.freeze([...path]),
		tokens: Object.freeze([...tokens].sort((left, right) => left.localeCompare(right)))
	}));
	return Object.freeze({
		$$type: ThemeDependencyPlanType,
		version: 1,
		entries: Object.freeze(canonicalEntries)
	});
}
function themeDependencyPathKey(path) {
	return path.map((segment) => typeof segment === "number" ? `n:${segment}` : `s:${segment.length}:${segment}`).join("/");
}
function validatePath(path) {
	if (!Array.isArray(path)) throw new TypeError("Theme dependency plan paths must be arrays");
	for (const segment of path) {
		if (typeof segment === "string") {
			if (segment.length === 0) throw new TypeError("Theme dependency plan path segments must be non-empty");
			continue;
		}
		if (!Number.isSafeInteger(segment) || segment < 0) throw new TypeError("Theme dependency plan array path segments must be non-negative safe integers");
	}
	return [...path];
}
function validateTokens(tokens) {
	if (!Array.isArray(tokens)) throw new TypeError("Theme dependency plan tokens must be arrays");
	for (const token of tokens) if (typeof token !== "string" || token.length === 0) throw new TypeError("Theme dependency plan token names must be non-empty strings");
	return [...new Set(tokens)];
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
//#region src/runtime/theme-context.ts
const key = Symbol.for("crumbs.css.theme-store-context.v1");
function sharedContext() {
	const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
	if (descriptor && "value" in descriptor) return descriptor.value;
	const value = (0, react.createContext)(null);
	Object.defineProperty(globalThis, key, {
		value,
		enumerable: false,
		configurable: false,
		writable: false
	});
	return value;
}
const ThemeStoreContext = sharedContext();
/** Select the existing provider store; literal local styles also work without it. */
function useOptionalThemeSelection(selector) {
	const parent = (0, react.use)(ThemeStoreContext);
	const selected = (0, react.useMemo)(() => {
		if (parent) return createThemeSelectorStore(parent, selector);
		const snapshot = selector(void 0);
		return {
			getSnapshot: () => snapshot,
			subscribe: () => () => void 0,
			dispose: () => void 0
		};
	}, [parent, selector]);
	return (0, react.useSyncExternalStore)(selected.subscribe, selected.getSnapshot, selected.getSnapshot);
}
//#endregion
//#region src/theme-runtime.ts
const TokenThemeContext = sharedRegistry(Symbol.for("crumbs.css.token-theme-context.v2"), () => (0, react.createContext)(null));
const themeResolutionCache = sharedRegistry(Symbol.for("crumbs.css.theme-resolution-cache.v1"), () => /* @__PURE__ */ new WeakMap());
function useThemeStore(theme) {
	const [store] = (0, react.useState)(() => createThemeStore(theme));
	(0, react.useLayoutEffect)(() => {
		store.setSnapshot(theme);
	}, [store, theme]);
	return store;
}
function useThemeStoreSelector(store, selector) {
	const selectedStore = (0, react.useMemo)(() => createThemeSelectorStore(store, selector), [selector, store]);
	return (0, react.useSyncExternalStore)(selectedStore.subscribe, selectedStore.getSnapshot, selectedStore.getSnapshot);
}
const identityThemeSelector = (theme) => theme;
function ThemeProvider({ children, theme }) {
	const store = useThemeStore(theme);
	return (0, react.createElement)(ThemeStoreContext.Provider, { value: store }, children);
}
function useTheme() {
	const store = (0, react.use)(ThemeStoreContext);
	if (store === null) throw new Error("useTheme must be used within a ThemeProvider from @opsydyn/crumbs-css/theme");
	return useThemeStoreSelector(store, identityThemeSelector);
}
function useThemeSelector(selector) {
	const store = (0, react.use)(ThemeStoreContext);
	if (store === null) throw new Error("useThemeSelector must be used within a ThemeProvider from @opsydyn/crumbs-css/theme");
	return useThemeStoreSelector(store, selector);
}
/**
* A provider keyed by the contract's stable public identity. The context map
* is shared through a global symbol so duplicate package copies in one app
* observe the same provider rather than creating isolated React contexts.
*/
function TokenThemeProvider({ children, contract, theme }) {
	const key = requireTokenContractKey(contract);
	assertTokenThemeCompatibility(contract, theme);
	const store = useThemeStore(theme);
	const parent = (0, react.use)(TokenThemeContext);
	const value = (0, react.useMemo)(() => {
		const next = new Map(parent ?? []);
		const baseTheme = theme;
		next.set(key, {
			baseTheme,
			layers: /* @__PURE__ */ new Map(),
			store,
			theme: baseTheme
		});
		return next;
	}, [
		key,
		parent,
		store,
		theme
	]);
	return (0, react.createElement)(ThemeStoreContext.Provider, { value: store }, (0, react.createElement)(TokenThemeContext.Provider, { value }, children));
}
/** Read a theme only when its contract identity and shape are both compatible. */
function useTokenTheme(contract) {
	const key = requireTokenContractKey(contract);
	const state = (0, react.use)(TokenThemeContext)?.get(key);
	if (state === void 0) throw new Error(require_theme_recipe_resolvers.formatNativeStylesDiagnostic(require_theme_recipe_resolvers.NativeStylesDiagnosticCode.TokenThemeProviderMismatch, `No TokenThemeProvider is active for contract ${JSON.stringify(key)}. Mount TokenThemeProvider with the same identified contract before calling useTokenTheme.`));
	const theme = useThemeStoreSelector(state.store, identityThemeSelector);
	assertTokenThemeCompatibility(contract, theme);
	return theme;
}
/**
* Add one independent brand, mode, or density layer to the nearest complete
* token theme. Layers compose by fixed axis precedence, so provider nesting
* order cannot change which axis wins when the same token is overridden.
*/
function TokenThemeScopeProvider({ children, contract, context, values }) {
	const key = requireTokenContractKey(contract);
	if (!TOKEN_THEME_SCOPE_PRECEDENCE.includes(context)) throw new Error(require_theme_recipe_resolvers.formatNativeStylesDiagnostic(require_theme_recipe_resolvers.NativeStylesDiagnosticCode.TokenThemeScopeInvalid, `Unknown token theme context "${String(context)}". Supported contexts: ${TOKEN_THEME_SCOPE_PRECEDENCE.join(", ")}.`));
	const parent = (0, react.use)(TokenThemeContext);
	const parentState = parent?.get(key);
	if (parentState === void 0) throw new Error(require_theme_recipe_resolvers.formatNativeStylesDiagnostic(require_theme_recipe_resolvers.NativeStylesDiagnosticCode.TokenThemeScopeProviderMismatch, `No TokenThemeProvider is active for contract ${JSON.stringify(key)}. Mount a complete TokenThemeProvider before adding a ${context} scope.`));
	assertTokenThemeCompatibility(contract, parentState.theme);
	const scopedTheme = (0, react.useMemo)(() => {
		const layers = new Map(parentState.layers);
		layers.set(context, values);
		return materializeTokenThemeScope(contract, parentState.baseTheme, layers);
	}, [
		context,
		contract,
		parentState,
		values
	]);
	const store = useThemeStore(scopedTheme);
	const state = (0, react.useMemo)(() => {
		const layers = new Map(parentState.layers);
		layers.set(context, values);
		return {
			baseTheme: parentState.baseTheme,
			layers,
			store,
			theme: scopedTheme
		};
	}, [
		context,
		parentState,
		scopedTheme,
		store,
		values
	]);
	const nextContext = (0, react.useMemo)(() => {
		const next = new Map(parent ?? []);
		next.set(key, state);
		return next;
	}, [
		key,
		parent,
		state
	]);
	return (0, react.createElement)(ThemeStoreContext.Provider, { value: store }, (0, react.createElement)(TokenThemeContext.Provider, { value: nextContext }, children));
}
function isTokenThemeCompatible(contract, theme) {
	const contractKey = getThemeContractIdentityKey(contract);
	const themeKey = getThemeContractIdentityKey(theme.contract);
	const contractSignature = getThemeContractShapeSignature(contract);
	const themeSignature = getThemeContractShapeSignature(theme.contract);
	return contractKey !== void 0 && contractKey === themeKey && contractSignature !== void 0 && contractSignature === themeSignature;
}
function useThemedStyle(style) {
	return useThemeSelector((0, react.useCallback)((theme) => resolveThemeTokens(style, theme), [style]));
}
function useThemedStyles(styles) {
	return useThemeSelector((0, react.useCallback)((theme) => resolveThemeStyles(styles, theme), [styles]));
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
/**
* Resolves only the exported paths named by a compiler dependency plan. The
* receipt's notification count is the number of output paths whose resolved
* value changed; it is an invalidation signal for a future subscription layer,
* not a claim about React renders.
*/
function createThemeDependencyResolver(styles, plan) {
	if (plan.$$type !== "crumbs.css.theme-dependency-plan" || plan.version !== 1) throw new TypeError("Unsupported theme dependency plan version");
	const canonicalPlan = createThemeDependencyPlan(plan.entries);
	const byToken = /* @__PURE__ */ new Map();
	for (const entry of canonicalPlan.entries) for (const token of entry.tokens) {
		const dependants = byToken.get(token);
		if (dependants === void 0) byToken.set(token, [entry]);
		else dependants.push(entry);
	}
	const planTokens = [...byToken.keys()].sort((left, right) => left.localeCompare(right));
	let previousTheme;
	let previousValue;
	let hasPrevious = false;
	return { resolve(theme) {
		if (hasPrevious && theme === previousTheme) return {
			value: previousValue,
			metrics: {
				recomputations: 0,
				notifications: 0,
				changedTokens: []
			}
		};
		const contractChanged = hasPrevious && previousTheme.contract !== theme.contract;
		const changedTokens = hasPrevious && !contractChanged ? planTokens.filter((token) => themeTokenChanged(previousTheme, theme, token)) : planTokens;
		const affected = hasPrevious ? uniquePlanEntries(changedTokens.flatMap((token) => byToken.get(token) ?? [])) : canonicalPlan.entries;
		let nextValue = hasPrevious ? previousValue : styles;
		let notifications = 0;
		for (const entry of affected) {
			const source = readThemeDependencyPath(styles, entry.path);
			const previous = hasPrevious ? readThemeDependencyPath(previousValue, entry.path).value : void 0;
			const next = resolveThemeTokens(source.value, theme);
			if (hasPrevious && equivalentResolvedValue(previous, next)) continue;
			nextValue = setThemeDependencyPath(nextValue, entry.path, next);
			if (hasPrevious) notifications += 1;
		}
		previousTheme = theme;
		previousValue = nextValue;
		hasPrevious = true;
		return {
			value: nextValue,
			metrics: {
				recomputations: affected.length,
				notifications,
				changedTokens: Object.freeze([...changedTokens])
			}
		};
	} };
}
function themeTokenChanged(previous, next, token) {
	return Object.prototype.hasOwnProperty.call(previous.tokens, token) !== Object.prototype.hasOwnProperty.call(next.tokens, token) || !Object.is(previous.tokens[token], next.tokens[token]);
}
function uniquePlanEntries(entries) {
	const byPath = /* @__PURE__ */ new Map();
	for (const entry of entries) byPath.set(themeDependencyPathKey(entry.path), entry);
	return [...byPath.values()].sort((left, right) => themeDependencyPathKey(left.path).localeCompare(themeDependencyPathKey(right.path)));
}
function readThemeDependencyPath(root, path) {
	let cursor = root;
	for (const segment of path) {
		if (cursor === null || typeof cursor !== "object" || !Object.prototype.hasOwnProperty.call(cursor, segment)) throw new TypeError(`Theme dependency plan path does not exist: ${formatThemeDependencyPath(path)}`);
		cursor = cursor[segment];
	}
	return { value: cursor };
}
function setThemeDependencyPath(root, path, value) {
	if (path.length === 0) return value;
	const nextRoot = cloneThemeDependencyContainer(root);
	let cursor = nextRoot;
	for (let index = 0; index < path.length - 1; index += 1) {
		const segment = path[index];
		const objectCursor = cursor;
		const child = objectCursor[segment];
		const nextChild = cloneThemeDependencyContainer(child);
		objectCursor[segment] = nextChild;
		cursor = nextChild;
	}
	const finalCursor = cursor;
	finalCursor[path[path.length - 1]] = value;
	return nextRoot;
}
function cloneThemeDependencyContainer(value) {
	if (Array.isArray(value)) return [...value];
	if (value !== null && typeof value === "object") return Object.assign(Object.create(Object.getPrototypeOf(value)), value);
	throw new TypeError("Theme dependency plan path traverses a non-container value");
}
function equivalentResolvedValue(left, right) {
	if (Object.is(left, right)) return true;
	if (Array.isArray(left) || Array.isArray(right)) return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((entry, index) => Object.is(entry, right[index]));
	if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;
	const leftKeys = Reflect.ownKeys(left);
	const rightKeys = Reflect.ownKeys(right);
	return leftKeys.length === rightKeys.length && leftKeys.every((key) => Object.prototype.hasOwnProperty.call(right, key) && Object.is(left[key], right[key]));
}
function formatThemeDependencyPath(path) {
	return path.map((segment) => typeof segment === "number" ? `[${segment}]` : segment).join(".");
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
		if (Object.getOwnPropertyDescriptor(current, "$$type")?.value === "crumbs.css.local-style-plan") throw new Error(require_theme_recipe_resolvers.formatNativeStylesDiagnostic(require_theme_recipe_resolvers.NativeStylesDiagnosticCode.LocalStylePlanRequired, "Local style plans require resolveAssignedStyles or useAssignedStyles from @opsydyn/crumbs-css/theme/vars."));
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
		$$type: require_recipe_resolution_plan.NativeRecipeType,
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
		require_theme_recipe_resolvers.validateNativeComponentContract(recipe.contract, {
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
		$$type: require_recipe_resolution_plan.NativeComponentRecipeType,
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
	const normalized = require_theme_recipe_resolvers.validateNativeComponentRecipeExtensionDescriptor(extension);
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
	if (isThemeTokenContract(theme.contract) && !isThemeTokenOwnedByContract(theme.contract, token)) throw new Error(require_theme_recipe_resolvers.formatNativeStylesDiagnostic(require_theme_recipe_resolvers.NativeStylesDiagnosticCode.TokenThemeTokenContractMismatch, `Theme token "${varName}" does not belong to the active domain contract. Use the token reference exported by that contract or keep the legacy reference on a legacy ThemeProvider.`));
	if (!Object.prototype.hasOwnProperty.call(theme.tokens, varName)) throw new Error(require_theme_recipe_resolvers.formatNativeStylesDiagnostic(require_theme_recipe_resolvers.NativeStylesDiagnosticCode.MissingThemeToken, `Theme token "${varName}" is missing from the active native theme`));
	return theme.tokens[varName];
}
const TOKEN_THEME_SCOPE_PRECEDENCE = [
	"brand",
	"mode",
	"density"
];
function materializeTokenThemeScope(contract, baseTheme, layers) {
	const tokens = { ...baseTheme.tokens };
	for (const context of TOKEN_THEME_SCOPE_PRECEDENCE) {
		const layer = layers.get(context);
		if (layer !== void 0) applyTokenThemeLayer(contract, contract, layer, [], context, tokens);
	}
	const resolving = /* @__PURE__ */ new Set();
	const resolvePath = (path) => {
		const reference = getThemeTokenAtPath(contract, path);
		if (!isRegisteredThemeVar(reference)) throw new Error(require_theme_recipe_resolvers.formatNativeStylesDiagnostic(require_theme_recipe_resolvers.NativeStylesDiagnosticCode.TokenThemeScopeInvalid, `Token theme scope target "${path.join(".")}" is not a registered token.`));
		const metadata = getThemeTokenMetadata(reference);
		const alias = getThemeTokenAliasForContract(contract, reference);
		if (alias === void 0) {
			const value = tokens[metadata.varName];
			if (value === void 0) throw new Error(require_theme_recipe_resolvers.formatNativeStylesDiagnostic(require_theme_recipe_resolvers.NativeStylesDiagnosticCode.TokenThemeScopeInvalid, `Complete token theme snapshot is missing "${path.join(".")}".`));
			return value;
		}
		const key = pathKey(path);
		if (resolving.has(key)) throw new Error(require_theme_recipe_resolvers.formatNativeStylesDiagnostic(require_theme_recipe_resolvers.NativeStylesDiagnosticCode.TokenAliasCycle, `Token alias cycle detected while resolving scoped snapshot at "${path.join(".")}".`));
		resolving.add(key);
		const target = isRegisteredThemeVar(getThemeTokenAtPath(contract, alias.targetPath)) ? resolvePath(alias.targetPath) : alias.fallback;
		if (target === void 0) throw new Error(require_theme_recipe_resolvers.formatNativeStylesDiagnostic(require_theme_recipe_resolvers.NativeStylesDiagnosticCode.TokenThemeScopeInvalid, `Complete token theme snapshot is missing alias target "${alias.targetPath.join(".")}" for "${path.join(".")}".`));
		resolving.delete(key);
		tokens[metadata.varName] = target;
		return target;
	};
	const values = {};
	collectTokenThemeSnapshot(contract, contract, [], values, resolvePath);
	return {
		contract,
		tokens,
		values
	};
}
function applyTokenThemeLayer(rootContract, contract, layer, path, context, tokens) {
	if (!isRecord(layer)) throw new Error(require_theme_recipe_resolvers.formatNativeStylesDiagnostic(require_theme_recipe_resolvers.NativeStylesDiagnosticCode.TokenThemeScopeInvalid, `Token theme ${context} scope at "${path.join(".") || "<root>"}" must be a nested record.`));
	for (const key of Object.keys(layer)) {
		const contractValue = contract[key];
		const nextPath = [...path, key];
		if (contractValue === void 0) throw new Error(require_theme_recipe_resolvers.formatNativeStylesDiagnostic(require_theme_recipe_resolvers.NativeStylesDiagnosticCode.TokenThemeScopeInvalid, `Unknown token theme ${context} scope value "${nextPath.join(".")}".`));
		const value = layer[key];
		if (isRegisteredThemeVar(contractValue)) {
			if (getThemeTokenAliasForContract(rootContract, contractValue) !== void 0) throw new Error(require_theme_recipe_resolvers.formatNativeStylesDiagnostic(require_theme_recipe_resolvers.NativeStylesDiagnosticCode.TokenAliasOverride, `Token theme ${context} scope value "${nextPath.join(".")}" is derived from an alias and cannot be overridden.`));
			if (typeof value !== "string" && typeof value !== "number") throw new Error(require_theme_recipe_resolvers.formatNativeStylesDiagnostic(require_theme_recipe_resolvers.NativeStylesDiagnosticCode.TokenThemeScopeInvalid, `Token theme ${context} scope value "${nextPath.join(".")}" must be a string or number.`));
			const domain = getThemeTokenDomainForContract(rootContract, contractValue);
			if (domain !== void 0 && !isValidScopedTokenValue(domain, value)) throw new Error(require_theme_recipe_resolvers.formatNativeStylesDiagnostic(require_theme_recipe_resolvers.NativeStylesDiagnosticCode.TokenThemeScopeInvalid, `Token theme ${context} scope value "${nextPath.join(".")}" does not satisfy the ${domain.kind} token domain.`));
			tokens[getThemeTokenMetadata(contractValue).varName] = value;
		} else if (isRecord(contractValue)) applyTokenThemeLayer(rootContract, contractValue, value, nextPath, context, tokens);
		else throw new Error(require_theme_recipe_resolvers.formatNativeStylesDiagnostic(require_theme_recipe_resolvers.NativeStylesDiagnosticCode.TokenThemeScopeInvalid, `Invalid token contract at "${nextPath.join(".")}".`));
	}
}
function collectTokenThemeSnapshot(rootContract, contract, path, output, resolvePath) {
	for (const [key, contractValue] of Object.entries(contract)) {
		const nextPath = [...path, key];
		if (isRegisteredThemeVar(contractValue)) output[key] = resolvePath(nextPath);
		else if (isRecord(contractValue)) {
			const nested = {};
			output[key] = nested;
			collectTokenThemeSnapshot(rootContract, contractValue, nextPath, nested, resolvePath);
		}
	}
}
function getThemeTokenAtPath(root, path) {
	let cursor = root;
	for (const segment of path) {
		if (!isRecord(cursor) || !Object.prototype.hasOwnProperty.call(cursor, segment)) return void 0;
		cursor = cursor[segment];
	}
	return cursor;
}
function pathKey(path) {
	return path.map((segment) => `${segment.length}:${segment}`).join("/");
}
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isValidScopedTokenValue(domain, value) {
	switch (domain.kind) {
		case "color": return typeof value === "string" && value.length > 0;
		case "length": {
			const allowNegative = domain.allowNegative === true;
			if (value === "auto") return true;
			if (typeof value === "number") return Number.isFinite(value) && (allowNegative || value >= 0);
			return new RegExp(`^${allowNegative ? "[+-]?" : "\\+?"}(?:\\d+(?:\\.\\d*)?|\\.\\d+)%$`).test(value) && Number.isFinite(Number.parseFloat(value));
		}
		case "duration": return typeof value === "number" && Number.isFinite(value) && value >= 0;
		case "opacity": return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
		case "enum": return typeof value === "string" && Array.isArray(domain.values) && domain.values.includes(value);
		default: return false;
	}
}
function requireTokenContractKey(contract) {
	const key = getThemeContractIdentityKey(contract);
	if (key === void 0) throw new Error(require_theme_recipe_resolvers.formatNativeStylesDiagnostic(require_theme_recipe_resolvers.NativeStylesDiagnosticCode.TokenThemeProviderMismatch, "TokenThemeProvider and useTokenTheme require a contract created with an explicit stable identity. Use the legacy ThemeProvider for unscoped contracts."));
	return key;
}
function assertTokenThemeCompatibility(contract, theme) {
	if (isTokenThemeCompatible(contract, theme)) return;
	const expected = getThemeContractIdentityKey(contract) ?? "<unidentified>";
	const actual = getThemeContractIdentityKey(theme.contract) ?? "<unidentified>";
	throw new Error(require_theme_recipe_resolvers.formatNativeStylesDiagnostic(require_theme_recipe_resolvers.NativeStylesDiagnosticCode.TokenThemeProviderMismatch, `Theme contract ${JSON.stringify(actual)} is incompatible with requested contract ${JSON.stringify(expected)}. Use the theme created from the same stable contract identity and shape.`));
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
Object.defineProperty(exports, "NativeStyleMapSymbol", {
	enumerable: true,
	get: function() {
		return NativeStyleMapSymbol;
	}
});
Object.defineProperty(exports, "NativeThemeTokenReferenceType", {
	enumerable: true,
	get: function() {
		return NativeThemeTokenReferenceType;
	}
});
Object.defineProperty(exports, "ThemeProvider", {
	enumerable: true,
	get: function() {
		return ThemeProvider;
	}
});
Object.defineProperty(exports, "TokenThemeProvider", {
	enumerable: true,
	get: function() {
		return TokenThemeProvider;
	}
});
Object.defineProperty(exports, "TokenThemeScopeProvider", {
	enumerable: true,
	get: function() {
		return TokenThemeScopeProvider;
	}
});
Object.defineProperty(exports, "createThemeDependencyPlan", {
	enumerable: true,
	get: function() {
		return createThemeDependencyPlan;
	}
});
Object.defineProperty(exports, "createThemeDependencyResolver", {
	enumerable: true,
	get: function() {
		return createThemeDependencyResolver;
	}
});
Object.defineProperty(exports, "createThemeTokenReference", {
	enumerable: true,
	get: function() {
		return createThemeTokenReference;
	}
});
Object.defineProperty(exports, "getThemeContractIdentityKey", {
	enumerable: true,
	get: function() {
		return getThemeContractIdentityKey;
	}
});
Object.defineProperty(exports, "getThemeTokenDomainForContract", {
	enumerable: true,
	get: function() {
		return getThemeTokenDomainForContract;
	}
});
Object.defineProperty(exports, "getThemeTokenPublicId", {
	enumerable: true,
	get: function() {
		return getThemeTokenPublicId;
	}
});
Object.defineProperty(exports, "getThemeTokenVisibility", {
	enumerable: true,
	get: function() {
		return getThemeTokenVisibility;
	}
});
Object.defineProperty(exports, "isThemeTokenContract", {
	enumerable: true,
	get: function() {
		return isThemeTokenContract;
	}
});
Object.defineProperty(exports, "isThemeTokenReference", {
	enumerable: true,
	get: function() {
		return isThemeTokenReference;
	}
});
Object.defineProperty(exports, "isThemeTokenReferenceCandidate", {
	enumerable: true,
	get: function() {
		return isThemeTokenReferenceCandidate;
	}
});
Object.defineProperty(exports, "isTokenThemeCompatible", {
	enumerable: true,
	get: function() {
		return isTokenThemeCompatible;
	}
});
Object.defineProperty(exports, "markNativeStyleMap", {
	enumerable: true,
	get: function() {
		return markNativeStyleMap;
	}
});
Object.defineProperty(exports, "normalizeTokenContractIdentity", {
	enumerable: true,
	get: function() {
		return normalizeTokenContractIdentity;
	}
});
Object.defineProperty(exports, "resolveThemeStyles", {
	enumerable: true,
	get: function() {
		return resolveThemeStyles;
	}
});
Object.defineProperty(exports, "resolveThemeTokens", {
	enumerable: true,
	get: function() {
		return resolveThemeTokens;
	}
});
Object.defineProperty(exports, "tokenContractIdentityKey", {
	enumerable: true,
	get: function() {
		return tokenContractIdentityKey;
	}
});
Object.defineProperty(exports, "useOptionalThemeSelection", {
	enumerable: true,
	get: function() {
		return useOptionalThemeSelection;
	}
});
Object.defineProperty(exports, "useTheme", {
	enumerable: true,
	get: function() {
		return useTheme;
	}
});
Object.defineProperty(exports, "useThemeSelector", {
	enumerable: true,
	get: function() {
		return useThemeSelector;
	}
});
Object.defineProperty(exports, "useThemedStyle", {
	enumerable: true,
	get: function() {
		return useThemedStyle;
	}
});
Object.defineProperty(exports, "useThemedStyles", {
	enumerable: true,
	get: function() {
		return useThemedStyles;
	}
});
Object.defineProperty(exports, "useTokenTheme", {
	enumerable: true,
	get: function() {
		return useTokenTheme;
	}
});
