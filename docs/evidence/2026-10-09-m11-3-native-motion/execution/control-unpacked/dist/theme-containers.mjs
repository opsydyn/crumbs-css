import { createContext, createElement, useContext, useLayoutEffect, useMemo, useSyncExternalStore } from "react";
//#region src/diagnostics.ts
const NativeStylesDiagnosticCode = {
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
//#region src/tokens/identity.ts
const PACKAGE_NAME = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
const CONTRACT_NAME = /^[A-Za-z][A-Za-z0-9._-]*$/;
/** Normalize and validate the public identity input once at contract creation. */
function normalizeTokenContractIdentity(input) {
	if (input === void 0) return void 0;
	const identityDescriptor = isRecord(input) ? Object.getOwnPropertyDescriptor(input, "identity") : void 0;
	const visibilityDescriptor = isRecord(input) ? Object.getOwnPropertyDescriptor(input, "visibility") : void 0;
	const candidate = identityDescriptor !== void 0 && "value" in identityDescriptor ? identityDescriptor.value : visibilityDescriptor !== void 0 ? void 0 : input;
	if (candidate === void 0) return void 0;
	const owner = isRecord(candidate) ? ownData(candidate, "owner") : void 0;
	const name = isRecord(candidate) ? ownData(candidate, "name") : void 0;
	const version = isRecord(candidate) ? ownData(candidate, "version") : void 0;
	if (!isRecord(candidate) || Object.keys(candidate).length !== 3 || typeof owner !== "string" || !PACKAGE_NAME.test(owner) || typeof name !== "string" || !CONTRACT_NAME.test(name) || typeof version !== "number" || !Number.isSafeInteger(version) || version <= 0) throw new Error("Invalid token contract identity. Expected { owner: package-name, name: identifier, version: positive-safe-integer }.");
	return Object.freeze({
		owner,
		name,
		version
	});
}
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function ownData(value, key) {
	const descriptor = Object.getOwnPropertyDescriptor(value, key);
	return descriptor !== void 0 && descriptor.enumerable === true && "value" in descriptor ? descriptor.value : void 0;
}
//#endregion
//#region src/containers/definition.ts
function containerError(code, path, reason) {
	throw Error(formatNativeStylesDiagnostic(code, `${path}: ${reason}`));
}
/** Read descriptors before values; branch objects are deliberately never traversed. */
function containerRecord(input, fields, code, path) {
	if (typeof input !== "object" || input === null || Array.isArray(input) || ![null, Object.prototype].includes(Object.getPrototypeOf(input))) return containerError(code, path, "expected plain record");
	const keys = Reflect.ownKeys(input);
	if (fields && (keys.length !== fields.length || fields.some((k) => !Object.hasOwn(input, k)))) return containerError(code, path, "unexpected or missing fields");
	const result = Object.create(null);
	for (const k of keys) {
		const d = Object.getOwnPropertyDescriptor(input, k);
		if (typeof k !== "string" || !d || !("value" in d) || !d.enumerable) return containerError(code, path, "expected own enumerable data fields");
		Object.defineProperty(result, k, {
			value: d.value,
			enumerable: true
		});
	}
	return result;
}
const namePattern = /^[A-Za-z][A-Za-z0-9._-]*$/;
function bucketName(name) {
	return typeof name === "string" && name.length <= 64 && namePattern.test(name) && ![
		"unmeasured",
		"__proto__",
		"prototype",
		"constructor"
	].includes(name);
}
function canonical(identityInput, axis, entries) {
	const code = NativeStylesDiagnosticCode.InvalidContainerDefinition, identityData = containerRecord(identityInput, [
		"owner",
		"name",
		"version"
	], code, "container.identity");
	let identity;
	try {
		identity = normalizeTokenContractIdentity(identityData);
	} catch {
		return containerError(code, "container.identity", "invalid owner/name/version");
	}
	if (!identity || axis !== "width" && axis !== "height") return containerError(code, "container.axis", "expected width or height");
	if (entries.length < 1 || entries.length > 16) return containerError(code, "container.buckets", "expected 1–16 buckets");
	const names = /* @__PURE__ */ new Set(), minima = /* @__PURE__ */ new Set();
	const buckets = entries.map(({ name, min }) => {
		if (!bucketName(name) || names.has(name)) return containerError(code, "container.buckets", "invalid or duplicate bucket name");
		if (typeof min !== "number" || !Number.isFinite(min) || min < 0 || minima.has(min)) return containerError(code, `container.buckets.${name}`, "expected distinct finite non-negative minimum");
		names.add(name);
		minima.add(min);
		return Object.freeze({
			name,
			min: min === 0 ? 0 : min
		});
	});
	if (!minima.has(0)) return containerError(code, "container.buckets", "exactly one zero minimum required");
	buckets.sort((a, b) => a.min - b.min);
	const result = Object.freeze({
		$$type: "crumbs.css.container-definition",
		formatVersion: 1,
		identity,
		axis,
		buckets: Object.freeze(buckets)
	});
	definitions.set(result, result);
	return result;
}
const definitions = /* @__PURE__ */ new WeakMap();
function defineContainer(input) {
	const code = NativeStylesDiagnosticCode.InvalidContainerDefinition, x = containerRecord(input, [
		"owner",
		"name",
		"version",
		"axis",
		"buckets"
	], code, "container");
	const b = containerRecord(x.buckets, void 0, code, "container.buckets");
	return canonical({
		owner: x.owner,
		name: x.name,
		version: x.version
	}, x.axis, Object.keys(b).map((name) => ({
		name,
		min: b[name]
	})));
}
function admitContainerDefinition(input) {
	if (typeof input === "object" && input !== null) {
		const cached = definitions.get(input);
		if (cached) return cached;
	}
	const code = NativeStylesDiagnosticCode.InvalidContainerDefinition, x = containerRecord(input, [
		"$$type",
		"formatVersion",
		"identity",
		"axis",
		"buckets"
	], code, "container");
	if (x.$$type !== "crumbs.css.container-definition") return containerError(code, "container", "invalid tag");
	if (x.formatVersion !== 1) return containerError(NativeStylesDiagnosticCode.ContainerUnsupportedVersion, "container", "unsupported definition format");
	const b = x.buckets;
	if (!Array.isArray(b) || Object.getPrototypeOf(b) !== Array.prototype || b.length < 1 || b.length > 16 || Reflect.ownKeys(b).length !== b.length + 1) return containerError(code, "container.buckets", "expected dense undecorated array");
	const entries = [];
	for (let i = 0; i < b.length; i++) {
		const d = Object.getOwnPropertyDescriptor(b, String(i));
		if (!d || !("value" in d) || !d.enumerable) return containerError(code, "container.buckets", "expected own data entries");
		const e = containerRecord(d.value, ["name", "min"], code, `container.buckets.${i}`);
		entries.push({
			name: e.name,
			min: e.min
		});
	}
	const result = canonical(x.identity, x.axis, entries);
	if (Object.isFrozen(input) && Object.isFrozen(x.identity) && Object.isFrozen(b) && b.every((e) => Object.isFrozen(e))) definitions.set(input, result);
	return result;
}
function containerDefinitionKey(definition) {
	const d = admitContainerDefinition(definition);
	return `crumbs.css.container:${d.identity.owner}#${d.identity.name}@${d.identity.version}`;
}
function containerDefinitionSignature(definition) {
	const d = admitContainerDefinition(definition);
	return JSON.stringify([d.axis, d.buckets.map((b) => [b.name, b.min])]);
}
function getContainerBucket(definition, size) {
	const d = admitContainerDefinition(definition);
	if (size === void 0) return "unmeasured";
	if (typeof size !== "number" || !Number.isFinite(size) || size < 0) return containerError(NativeStylesDiagnosticCode.InvalidContainerMeasurement, containerDefinitionKey(d), "expected finite non-negative size");
	let name = d.buckets[0].name;
	for (const b of d.buckets) {
		if (size < b.min) break;
		name = b.name;
	}
	return name;
}
//#endregion
//#region src/containers/values.ts
const tables = /* @__PURE__ */ new WeakMap();
function admitContainerValues(definition, values) {
	const d = admitContainerDefinition(definition), signature = containerDefinitionSignature(d);
	const cached = typeof values === "object" && values !== null ? tables.get(values) : void 0;
	if (cached?.signature === signature) return cached.copy;
	const data = containerRecord(values, ["unmeasured", ...d.buckets.map((b) => b.name)], NativeStylesDiagnosticCode.InvalidContainerValues, "container.values"), copy = Object.freeze(data);
	if (Object.isFrozen(values)) tables.set(values, {
		signature,
		copy
	});
	return copy;
}
function resolveContainerValue(definition, bucket, values) {
	const table = admitContainerValues(definition, values);
	if (typeof bucket !== "string" || !Object.hasOwn(table, bucket)) return containerError(NativeStylesDiagnosticCode.InvalidContainerValues, "container.bucket", "unknown bucket");
	return table[bucket];
}
//#endregion
//#region src/containers/owner.ts
function eventField(value, field, key) {
	if (typeof value !== "object" || value === null) return containerError(NativeStylesDiagnosticCode.InvalidContainerMeasurement, key, `missing ${field}`);
	const d = Object.getOwnPropertyDescriptor(value, field);
	if (!d || !("value" in d)) return containerError(NativeStylesDiagnosticCode.InvalidContainerMeasurement, key, `expected own data ${field}`);
	return d.value;
}
function createContainerOwner(input) {
	const definition = admitContainerDefinition(input), key = containerDefinitionKey(definition), signature = containerDefinitionSignature(definition), snapshots = /* @__PURE__ */ new Map();
	const intern = (bucket) => {
		let s = snapshots.get(bucket);
		if (!s) {
			s = Object.freeze({
				key,
				signature,
				bucket
			});
			snapshots.set(bucket, s);
		}
		return s;
	};
	const initial = intern("unmeasured");
	let current = initial, phase = "created", publications = 0, notifying = false, generation = 0, claim;
	const listeners = /* @__PURE__ */ new Set();
	const updateSize = (size) => {
		if (phase === "inactive") return false;
		const bucket = getContainerBucket(definition, size);
		if (bucket === current.bucket) return false;
		if (notifying) return containerError(NativeStylesDiagnosticCode.ContainerReentrantUpdate, key, "measurement attempted publication during notification");
		current = intern(bucket);
		publications++;
		notifying = true;
		try {
			for (const entry of [...listeners]) if (listeners.has(entry)) entry.listener();
		} finally {
			notifying = false;
		}
		return true;
	};
	const onLayout = (event) => {
		if (phase === "inactive") return;
		const size = eventField(eventField(eventField(event, "nativeEvent", key), "layout", key), definition.axis, key);
		if (size === void 0) return containerError(NativeStylesDiagnosticCode.InvalidContainerMeasurement, key, `missing ${definition.axis}`);
		updateSize(size);
	};
	return Object.freeze({
		formatVersion: 1,
		definition,
		key,
		signature,
		getSnapshot: () => current,
		getServerSnapshot: () => initial,
		subscribe(listener) {
			const registration = { listener };
			listeners.add(registration);
			let live = true;
			return () => {
				if (live) {
					live = false;
					listeners.delete(registration);
				}
			};
		},
		updateSize,
		onLayout,
		activate() {
			phase = "active";
		},
		deactivate() {
			phase = "inactive";
			listeners.clear();
			claim = void 0;
			generation++;
		},
		claimProvider(token) {
			if (claim) return containerError(NativeStylesDiagnosticCode.ContainerOwnerInUse, key, "one layout handle requires one committed provider");
			const g = ++generation;
			claim = {
				token,
				generation: g
			};
			let live = true;
			return () => {
				if (live) {
					live = false;
					if (claim?.token === token && claim.generation === g) claim = void 0;
				}
			};
		},
		inspect: () => Object.freeze({
			phase,
			listeners: listeners.size,
			providerClaims: claim ? 1 : 0,
			internedSnapshots: snapshots.size,
			publications
		})
	});
}
//#endregion
//#region src/containers/selector.ts
function createContainerSelector(owner, values) {
	const read = () => values[owner.getSnapshot().bucket];
	let current = read(), parentOff, notifications = 0, active = true;
	const listeners = /* @__PURE__ */ new Set();
	const update = () => {
		const next = read();
		if (Object.is(current, next)) return;
		current = next;
		notifications++;
		for (const entry of [...listeners]) if (listeners.has(entry)) entry.listener();
	};
	return Object.freeze({
		getSnapshot: read,
		getServerSnapshot: () => values.unmeasured,
		activate() {
			active = true;
			if (listeners.size && !parentOff) {
				parentOff = owner.subscribe(update);
				update();
			}
		},
		deactivate() {
			active = false;
			parentOff?.();
			parentOff = void 0;
		},
		subscribe(listener) {
			const entry = { listener };
			listeners.add(entry);
			if (active && listeners.size === 1) {
				current = read();
				parentOff = owner.subscribe(update);
			}
			let live = true;
			return () => {
				if (!live) return;
				live = false;
				listeners.delete(entry);
				if (listeners.size === 0) {
					parentOff?.();
					parentOff = void 0;
				}
			};
		},
		inspect: () => Object.freeze({
			listeners: listeners.size,
			parentSubscriptions: parentOff ? 1 : 0,
			notifications
		})
	});
}
//#endregion
//#region src/containers/context.ts
const registry = Symbol.for("crumbs.css.container-context.v1");
const initialContext = createContext(null);
function admitContext(input) {
	const code = NativeStylesDiagnosticCode.ContainerUnsupportedVersion, path = "container.context";
	const data = containerRecord(input, void 0, code, path);
	for (const key of Object.keys(initialContext)) {
		const descriptor = Object.getOwnPropertyDescriptor(input, key);
		if (!descriptor || !("value" in descriptor) || !descriptor.writable) return containerError(code, path, "missing or immutable React context ABI field");
	}
	for (const key of [
		"_currentValue",
		"_currentValue2",
		"_threadCount",
		"_currentRenderer",
		"_currentRenderer2"
	]) {
		const descriptor = Object.getOwnPropertyDescriptor(input, key);
		if (descriptor && !descriptor.writable) return containerError(code, path, "immutable React context ABI field");
	}
	const consumer = containerRecord(data.Consumer, ["$$typeof", "_context"], code, path + ".Consumer");
	if (data.$$typeof !== Symbol.for("react.context") || data.Provider !== input || consumer.$$typeof !== Symbol.for("react.consumer") || consumer._context !== input || typeof data._threadCount !== "number" || !Number.isInteger(data._threadCount) || data._threadCount < 0) return containerError(code, path, "incompatible React context ABI");
	return input;
}
function getSharedContainerContext() {
	const descriptor = Object.getOwnPropertyDescriptor(globalThis, registry);
	if (!descriptor) {
		const slot = Object.freeze({
			formatVersion: 1,
			reactCreateContext: createContext,
			context: initialContext
		});
		Object.defineProperty(globalThis, registry, { value: slot });
		return initialContext;
	}
	if (!("value" in descriptor)) return containerError(NativeStylesDiagnosticCode.ContainerUnsupportedVersion, "container.context", "expected own data registry");
	const slot = containerRecord(descriptor.value, [
		"formatVersion",
		"reactCreateContext",
		"context"
	], NativeStylesDiagnosticCode.ContainerUnsupportedVersion, "container.context");
	if (slot.formatVersion !== 1 || slot.reactCreateContext !== createContext) return containerError(NativeStylesDiagnosticCode.ContainerUnsupportedVersion, "container.context", "incompatible version or React installation");
	return admitContext(slot.context);
}
//#endregion
//#region src/containers/react.ts
const ownerSlot = Symbol.for("crumbs.css.container-owner.v1");
const Context = getSharedContainerContext();
function createContainerLayout(owner) {
	const handle = {
		definition: owner.definition,
		onLayout: owner.onLayout
	};
	Object.defineProperty(handle, ownerSlot, { value: owner });
	return Object.freeze(handle);
}
function admitContainerLayout(input) {
	const code = NativeStylesDiagnosticCode.InvalidContainerDefinition, path = "container.layout";
	if (typeof input !== "object" || input === null || ![null, Object.prototype].includes(Object.getPrototypeOf(input))) return containerError(code, path, "expected layout handle");
	const keys = Reflect.ownKeys(input);
	if (keys.length !== 3 || !keys.includes(ownerSlot)) return containerError(code, path, "invalid closed handle");
	const slot = Object.getOwnPropertyDescriptor(input, ownerSlot);
	if (!slot || !("value" in slot) || slot.enumerable) return containerError(code, path, "expected owner data protocol");
	const publicData = {};
	for (const key of ["definition", "onLayout"]) {
		const d = Object.getOwnPropertyDescriptor(input, key);
		if (!d || !("value" in d) || !d.enumerable) return containerError(code, path, "expected own public data");
		publicData[key] = d.value;
	}
	const methods = [
		"getSnapshot",
		"getServerSnapshot",
		"subscribe",
		"updateSize",
		"onLayout",
		"activate",
		"deactivate",
		"claimProvider",
		"inspect"
	];
	const facade = containerRecord(slot.value, [
		"formatVersion",
		"definition",
		"key",
		"signature",
		...methods
	], code, path + ".owner");
	if (facade.formatVersion !== 1) return containerError(NativeStylesDiagnosticCode.ContainerUnsupportedVersion, path, "unsupported owner protocol");
	const definition = admitContainerDefinition(facade.definition);
	if (methods.some((k) => typeof facade[k] !== "function") || publicData.definition !== facade.definition || publicData.onLayout !== facade.onLayout || facade.key !== containerDefinitionKey(definition) || facade.signature !== containerDefinitionSignature(definition) || !Object.isFrozen(slot.value) || !Object.isFrozen(input)) return containerError(code, path, "incompatible immutable handle");
	return slot.value;
}
function useContainerLayout(definition) {
	const d = admitContainerDefinition(definition);
	const owner = useMemo(() => createContainerOwner(d), [containerDefinitionKey(d), containerDefinitionSignature(d)]);
	const layout = useMemo(() => createContainerLayout(owner), [owner]);
	useLayoutEffect(() => {
		owner.activate();
		return () => owner.deactivate();
	}, [owner]);
	return layout;
}
function ContainerProvider({ layout, children }) {
	const parent = useContext(Context), owner = admitContainerLayout(layout), token = useMemo(() => ({}), []);
	const inherited = parent?.get(owner.key);
	if (inherited && inherited.signature !== owner.signature) return containerError(NativeStylesDiagnosticCode.ContainerContractMismatch, owner.key, "nested provider definition shape mismatch");
	const owners = useMemo(() => {
		const map = new Map(parent);
		map.set(owner.key, owner);
		return map;
	}, [parent, owner]);
	useLayoutEffect(() => owner.claimProvider(token), [owner, token]);
	return createElement(Context.Provider, { value: owners }, children);
}
function useContainerValue(definition, values) {
	const owners = useContext(Context), d = admitContainerDefinition(definition), key = containerDefinitionKey(d), owner = owners?.get(key);
	if (!owner) return containerError(NativeStylesDiagnosticCode.ContainerProviderRequired, key, "matching container provider required");
	if (owner.signature !== containerDefinitionSignature(d)) return containerError(NativeStylesDiagnosticCode.ContainerContractMismatch, key, "requested definition shape mismatch");
	const table = admitContainerValues(definition, values), selector = useMemo(() => createContainerSelector(owner, table), [owner, table]);
	useLayoutEffect(() => {
		selector.activate();
		return () => selector.deactivate();
	}, [selector]);
	return useSyncExternalStore(selector.subscribe, selector.getSnapshot, selector.getServerSnapshot);
}
//#endregion
export { ContainerProvider, defineContainer, getContainerBucket, resolveContainerValue, useContainerLayout, useContainerValue };
