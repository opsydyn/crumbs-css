import { l as NativeStylesDiagnosticCode, u as formatNativeStylesDiagnostic } from "./theme-recipe-resolvers-pVM6pMcI.mjs";
import { C as isThemeTokenReferenceCandidate, D as markNativeStyleMap, E as NativeStyleMapSymbol, S as isThemeTokenReference, T as tokenContractIdentityKey, _ as getThemeContractIdentityKey, b as getThemeTokenVisibility, p as useOptionalThemeSelection, s as resolveThemeTokens, v as getThemeTokenDomainForContract, w as normalizeTokenContractIdentity, x as isThemeTokenContract, y as getThemeTokenPublicId } from "./theme-runtime-DsWWQJ0O.mjs";
import { useCallback, useMemo } from "react";
//#region src/local-vars/model.ts
const NativeLocalVarType = "crumbs.css.local-var";
const NativeLocalFallbackType = "crumbs.css.local-fallback";
const NativeVarAssignmentsType = "crumbs.css.local-assignments";
const NativeLocalStylePlanType = "crumbs.css.local-style-plan";
function nativeLocalVarKey(variable) {
	return `crumbs.css.local-var:${variable.identity.owner}#${variable.identity.name}@${variable.identity.version}`;
}
function localOperandCandidate(input) {
	if (typeof input !== "object" || input === null) return false;
	const d = Object.getOwnPropertyDescriptor(input, "$$type");
	return d !== void 0 && "value" in d && (d.value === "crumbs.css.local-var" || d.value === "crumbs.css.local-fallback");
}
//#endregion
//#region src/tokens/domain-values.ts
function isTokenDomainValue(domain, value) {
	switch (domain.kind) {
		case "color": return typeof value === "string" && value.length > 0;
		case "length":
			if (value === "auto") return true;
			if (typeof value === "number") return Number.isFinite(value) && (domain.allowNegative || value >= 0);
			if (typeof value !== "string") return false;
			if (!new RegExp(`^${domain.allowNegative ? "[+-]?" : "\\+?"}(?:\\d+(?:\\.\\d*)?|\\.\\d+)%$`).test(value)) return false;
			return Number.isFinite(Number.parseFloat(value));
		case "duration": return typeof value === "number" && Number.isFinite(value) && value >= 0;
		case "opacity": return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
		case "enum": return typeof value === "string" && domain.values.includes(value);
	}
}
function normalizeTokenDomainDefinition(definition) {
	if (definition === "color" || typeof definition === "object" && definition.kind === "color") return { kind: "color" };
	if (definition === "duration" || typeof definition === "object" && definition.kind === "duration") return { kind: "duration" };
	if (definition === "opacity" || typeof definition === "object" && definition.kind === "opacity") return { kind: "opacity" };
	if (definition === "length" || typeof definition === "object" && definition.kind === "length") return {
		kind: "length",
		allowNegative: typeof definition === "object" && definition.allowNegative === true
	};
	if (typeof definition === "object" && definition.kind === "enum") {
		if (definition.values.length === 0 || definition.values.some((value) => typeof value !== "string" || value.length === 0)) throw new Error("Token enum domains require one or more non-empty string values");
		if (new Set(definition.values).size !== definition.values.length) throw new Error("Token enum domains cannot contain duplicate values");
		return {
			kind: "enum",
			values: [...definition.values]
		};
	}
	throw new Error(`Unsupported token domain: ${String(definition)}`);
}
function tokenDomainsEqual(left, right) {
	if (left.kind !== right.kind) return false;
	if (left.kind === "length" && right.kind === "length") return left.allowNegative === right.allowNegative;
	if (left.kind === "enum" && right.kind === "enum") return left.values.length === right.values.length && [...left.values].sort().every((value, index) => value === [...right.values].sort()[index]);
	return true;
}
//#endregion
//#region src/local-vars/admission.ts
function localError(code, path, reason) {
	throw new Error(formatNativeStylesDiagnostic(code, `${path}: ${reason}`));
}
/** Descriptor-only clone. Mutable originals never enter the admission cache. */
function copyLocalData(input, code, path = "local", depth = 0, seen = /* @__PURE__ */ new Set()) {
	if (input === null || typeof input !== "object") {
		if (typeof input === "string" || typeof input === "number" || typeof input === "boolean" || input === null) return input;
		return localError(code, path, "expected plain data");
	}
	if (depth >= 64 || seen.has(input)) return localError(code, path, "cyclic or over-depth data");
	const proto = Object.getPrototypeOf(input);
	if (Array.isArray(input) ? proto !== Array.prototype : proto !== null && proto !== Object.prototype) return localError(code, path, "unsupported prototype");
	seen.add(input);
	const out = Array.isArray(input) ? [] : {};
	const keys = Reflect.ownKeys(input);
	if (Array.isArray(input)) {
		const len = Object.getOwnPropertyDescriptor(input, "length")?.value;
		if (!Number.isSafeInteger(len) || len < 0 || keys.length !== len + 1) return localError(code, path, "array must be dense and undecorated");
	}
	for (const key of keys) {
		if (Array.isArray(input) && key === "length") continue;
		const d = Object.getOwnPropertyDescriptor(input, key);
		if (typeof key !== "string" || !d || !("value" in d) || !d.enumerable) return localError(code, path, "expected own enumerable data fields");
		if (Array.isArray(input) && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= input.length)) return localError(code, path, "decorated array");
		Object.defineProperty(out, key, {
			value: copyLocalData(d.value, code, `${path}.${key}`, depth + 1, seen),
			enumerable: true
		});
	}
	seen.delete(input);
	return Object.freeze(out);
}
function exactLocalRecord(input, fields, code, path) {
	if (typeof input !== "object" || input === null || Array.isArray(input) || Object.keys(input).length !== fields.length || fields.some((k) => !Object.hasOwn(input, k))) return localError(code, path, "unexpected or missing fields");
	return input;
}
function localDomain(input, code, path) {
	const record = input;
	if (typeof input !== "object" || input === null || Array.isArray(input)) return localError(code, path, "invalid domain");
	exactLocalRecord(input, record.kind === "length" ? ["kind", "allowNegative"] : record.kind === "enum" ? ["kind", "values"] : ["kind"], code, path);
	if (record.kind === "length" && typeof record.allowNegative !== "boolean") return localError(code, path, "invalid length permission");
	try {
		const d = normalizeTokenDomainDefinition(input);
		return Object.freeze(d.kind === "enum" ? {
			kind: "enum",
			values: Object.freeze([...d.values].sort())
		} : d);
	} catch {
		return localError(code, path, "invalid domain");
	}
}
function literalLocalValue(domain, value) {
	return isTokenDomainValue(domain, value) && !(typeof value === "string" && /^\s*var\(/.test(value));
}
const operands = /* @__PURE__ */ new WeakMap();
const assignments = /* @__PURE__ */ new WeakMap();
function isImmutableLocalData(input, seen = /* @__PURE__ */ new Set()) {
	if (typeof input !== "object" || input === null) return true;
	if (!Object.isFrozen(input) || seen.has(input)) return false;
	seen.add(input);
	const result = Reflect.ownKeys(input).every((k) => {
		const d = Object.getOwnPropertyDescriptor(input, k);
		return d !== void 0 && "value" in d && isImmutableLocalData(d.value, seen);
	});
	seen.delete(input);
	return result;
}
function readLocalVar(input, path = "variable") {
	const code = NativeStylesDiagnosticCode.InvalidLocalVar;
	const x = exactLocalRecord(input, [
		"$$type",
		"version",
		"identity",
		"domain"
	], code, path);
	if (x.$$type !== "crumbs.css.local-var") return localError(code, path, "invalid tag");
	if (x.version !== 1) return localError(NativeStylesDiagnosticCode.LocalVarUnsupportedVersion, path, "unsupported variable version");
	const identity = exactLocalRecord(x.identity, [
		"owner",
		"name",
		"version"
	], code, path + ".identity");
	let normalized;
	try {
		normalized = normalizeTokenContractIdentity(identity);
	} catch {
		return localError(code, path, "invalid identity");
	}
	if (!normalized) return localError(code, path, "identity required");
	return Object.freeze({
		$$type: NativeLocalVarType,
		version: 1,
		identity: normalized,
		domain: localDomain(x.domain, code, path + ".domain")
	});
}
function assertLocalDefinitions(variables) {
	const table = /* @__PURE__ */ new Map();
	for (const variable of variables) {
		const key = nativeLocalVarKey(variable);
		const prior = table.get(key);
		if (prior && !tokenDomainsEqual(prior.domain, variable.domain)) localError(NativeStylesDiagnosticCode.LocalVarConflict, key, "conflicting domains");
		table.set(key, variable);
	}
}
function admitLocalOperand(input) {
	if (typeof input === "object" && input !== null) {
		const cached = operands.get(input);
		if (cached) return cached;
	}
	const raw = copyLocalData(input, NativeStylesDiagnosticCode.InvalidLocalVar);
	let result;
	if (raw?.$$type === "crumbs.css.local-var") result = readLocalVar(raw);
	else {
		const x = exactLocalRecord(raw, [
			"$$type",
			"version",
			"variables",
			"terminal"
		], NativeStylesDiagnosticCode.InvalidLocalVar, "fallback");
		if (x.$$type !== "crumbs.css.local-fallback") localError(NativeStylesDiagnosticCode.InvalidLocalVar, "fallback", "invalid tag");
		if (x.version !== 1) localError(NativeStylesDiagnosticCode.LocalVarUnsupportedVersion, "fallback", "unsupported fallback version");
		if (!Array.isArray(x.variables) || x.variables.length < 1 || x.variables.length > 16) localError(NativeStylesDiagnosticCode.InvalidLocalVar, "fallback", "expected 1 to 16 handles");
		const variables = x.variables.map((v, i) => readLocalVar(v, `fallback.${i}`));
		const domain = variables[0].domain;
		assertLocalDefinitions(variables);
		if (variables.some((v) => !tokenDomainsEqual(v.domain, domain))) localError(NativeStylesDiagnosticCode.LocalVarDomainMismatch, "fallback", "different domains");
		const terminal = x.terminal;
		if (terminal?.kind === "literal") {
			exactLocalRecord(terminal, ["kind", "value"], NativeStylesDiagnosticCode.InvalidLocalVar, "terminal");
			if (!literalLocalValue(domain, terminal.value)) localError(NativeStylesDiagnosticCode.InvalidLocalVar, "terminal", "invalid literal");
		} else {
			exactLocalRecord(terminal, terminal && Object.hasOwn(terminal, "contractIdentity") ? [
				"kind",
				"reference",
				"domain",
				"publicId",
				"contractIdentity"
			] : [
				"kind",
				"reference",
				"domain",
				"publicId"
			], NativeStylesDiagnosticCode.InvalidLocalVar, "terminal");
			if (terminal.kind !== "theme" || !isThemeTokenReference(terminal.reference) || typeof terminal.publicId !== "string" || !terminal.publicId) localError(NativeStylesDiagnosticCode.InvalidLocalVar, "terminal", "invalid theme reference");
			if (!tokenDomainsEqual(localDomain(terminal.domain, NativeStylesDiagnosticCode.InvalidLocalVar, "terminal.domain"), domain)) localError(NativeStylesDiagnosticCode.LocalVarDomainMismatch, "terminal", "different domain");
			if (Object.hasOwn(terminal, "contractIdentity")) {
				exactLocalRecord(terminal.contractIdentity, [
					"owner",
					"name",
					"version"
				], NativeStylesDiagnosticCode.InvalidLocalVar, "terminal.identity");
				try {
					normalizeTokenContractIdentity(terminal.contractIdentity);
				} catch {
					localError(NativeStylesDiagnosticCode.InvalidLocalVar, "terminal", "invalid theme identity");
				}
			}
		}
		result = Object.freeze({
			$$type: NativeLocalFallbackType,
			version: 1,
			variables: Object.freeze(variables),
			terminal
		});
	}
	if (typeof input === "object" && input !== null && isImmutableLocalData(input)) operands.set(input, result);
	operands.set(result, result);
	return result;
}
const emptyVarAssignments = Object.freeze({
	$$type: NativeVarAssignmentsType,
	version: 1,
	bindings: Object.freeze([])
});
function admitVarAssignments(input) {
	if (typeof input === "object" && input !== null) {
		const cached = assignments.get(input);
		if (cached) return cached;
	}
	const x = exactLocalRecord(copyLocalData(input, NativeStylesDiagnosticCode.InvalidLocalAssignments), [
		"$$type",
		"version",
		"bindings"
	], NativeStylesDiagnosticCode.InvalidLocalAssignments, "assignments");
	if (x.$$type !== "crumbs.css.local-assignments") localError(NativeStylesDiagnosticCode.InvalidLocalAssignments, "assignments", "invalid tag");
	if (x.version !== 1) localError(NativeStylesDiagnosticCode.LocalVarUnsupportedVersion, "assignments", "unsupported version");
	if (!Array.isArray(x.bindings)) localError(NativeStylesDiagnosticCode.InvalidLocalAssignments, "assignments", "bindings must be an array");
	const table = /* @__PURE__ */ new Map();
	for (const binding of x.bindings) {
		const b = exactLocalRecord(binding, ["variable", "value"], NativeStylesDiagnosticCode.InvalidLocalAssignments, "binding");
		const variable = readLocalVar(b.variable);
		const key = nativeLocalVarKey(variable);
		if (!literalLocalValue(variable.domain, b.value)) localError(NativeStylesDiagnosticCode.InvalidLocalAssignments, key, "invalid domain literal");
		const prior = table.get(key);
		if (prior && (!tokenDomainsEqual(prior.variable.domain, variable.domain) || !Object.is(prior.value, b.value))) localError(NativeStylesDiagnosticCode.LocalVarConflict, key, "conflicting binding");
		table.set(key, Object.freeze({
			variable,
			value: b.value
		}));
	}
	const result = table.size === 0 ? emptyVarAssignments : Object.freeze({
		$$type: NativeVarAssignmentsType,
		version: 1,
		bindings: Object.freeze([...table].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, v]) => v))
	});
	if (typeof input === "object" && input !== null && isImmutableLocalData(input)) assignments.set(input, result);
	assignments.set(result, result);
	return result;
}
//#endregion
//#region src/local-vars/assignments.ts
function assignVars(shape, values) {
	const s = copyLocalData(shape, NativeStylesDiagnosticCode.InvalidLocalAssignments), v = copyLocalData(values, NativeStylesDiagnosticCode.InvalidLocalAssignments);
	const bindings = [];
	function visit(node, value, path) {
		if (typeof node !== "object" || node === null || Array.isArray(node)) localError(NativeStylesDiagnosticCode.InvalidLocalAssignments, path, "invalid shape");
		const n = node;
		if (n.$$type === "crumbs.css.local-var") {
			bindings.push({
				variable: readLocalVar(n, path),
				value
			});
			return;
		}
		const fields = Object.keys(n);
		const val = exactLocalRecord(value, fields, NativeStylesDiagnosticCode.InvalidLocalAssignments, path);
		for (const key of fields) visit(n[key], val[key], `${path}.${key}`);
	}
	visit(s, v, "assignVars");
	return admitVarAssignments({
		$$type: NativeVarAssignmentsType,
		version: 1,
		bindings
	});
}
//#endregion
//#region src/native-property-policy.ts
const dimensionValueProperties = new Set([
	"flexBasis",
	"width",
	"height",
	"minWidth",
	"minHeight",
	"maxWidth",
	"maxHeight",
	"top",
	"right",
	"bottom",
	"left",
	"start",
	"end",
	"paddingTop",
	"paddingRight",
	"paddingBottom",
	"paddingLeft",
	"paddingStart",
	"paddingEnd",
	"marginTop",
	"marginRight",
	"marginBottom",
	"marginLeft",
	"marginStart",
	"marginEnd"
]);
const percentageValueProperties = new Set([
	...dimensionValueProperties,
	"rowGap",
	"columnGap"
]);
const colorValueProperties = new Set([
	"backgroundColor",
	"color",
	"tintColor",
	"overlayColor",
	"shadowColor",
	"textShadowColor",
	"textDecorationColor",
	"borderTopColor",
	"borderRightColor",
	"borderBottomColor",
	"borderLeftColor",
	"borderStartColor",
	"borderEndColor",
	"outlineColor",
	"borderBlockColor",
	"borderBlockStartColor",
	"borderBlockEndColor"
]);
const stringValueProperties = new Set(["fontFamily"]);
const numberOrStringValueProperties = new Set(["aspectRatio"]);
const literalValueProperties = {
	fontStyle: new Set(["normal", "italic"]),
	fontWeight: new Set([
		"normal",
		"bold",
		"100",
		"200",
		"300",
		"400",
		"500",
		"600",
		"700",
		"800",
		"900",
		100,
		200,
		300,
		400,
		500,
		600,
		700,
		800,
		900,
		"ultralight",
		"thin",
		"light",
		"medium",
		"regular",
		"semibold",
		"condensedBold",
		"condensed",
		"heavy",
		"black"
	]),
	textAlign: new Set([
		"auto",
		"left",
		"right",
		"center",
		"justify"
	]),
	textAlignVertical: new Set([
		"auto",
		"top",
		"bottom",
		"center"
	]),
	verticalAlign: new Set([
		"auto",
		"top",
		"bottom",
		"middle"
	]),
	textDecorationLine: new Set([
		"none",
		"underline",
		"line-through",
		"underline line-through"
	]),
	textDecorationStyle: new Set([
		"solid",
		"double",
		"dotted",
		"dashed"
	]),
	textTransform: new Set([
		"none",
		"capitalize",
		"uppercase",
		"lowercase"
	]),
	writingDirection: new Set([
		"auto",
		"ltr",
		"rtl"
	]),
	userSelect: new Set([
		"auto",
		"none",
		"text",
		"contain",
		"all"
	]),
	includeFontPadding: new Set([false, true]),
	display: new Set([
		"none",
		"flex",
		"contents"
	]),
	position: new Set([
		"absolute",
		"relative",
		"static"
	]),
	direction: new Set([
		"inherit",
		"ltr",
		"rtl"
	]),
	overflow: new Set([
		"visible",
		"hidden",
		"scroll"
	]),
	flexDirection: new Set([
		"row",
		"column",
		"row-reverse",
		"column-reverse"
	]),
	flexWrap: new Set([
		"wrap",
		"nowrap",
		"wrap-reverse"
	]),
	alignContent: new Set([
		"flex-start",
		"flex-end",
		"center",
		"stretch",
		"space-between",
		"space-around",
		"space-evenly"
	]),
	alignItems: new Set([
		"flex-start",
		"flex-end",
		"center",
		"stretch",
		"baseline"
	]),
	alignSelf: new Set([
		"auto",
		"flex-start",
		"flex-end",
		"center",
		"stretch",
		"baseline"
	]),
	justifyContent: new Set([
		"flex-start",
		"flex-end",
		"center",
		"space-between",
		"space-around",
		"space-evenly"
	]),
	boxSizing: new Set(["border-box", "content-box"]),
	backfaceVisibility: new Set(["visible", "hidden"]),
	cursor: new Set(["auto", "pointer"]),
	borderCurve: new Set(["circular", "continuous"]),
	pointerEvents: new Set([
		"box-none",
		"none",
		"box-only",
		"auto"
	]),
	borderStyle: new Set([
		"solid",
		"dotted",
		"dashed"
	]),
	outlineStyle: new Set([
		"solid",
		"dotted",
		"dashed"
	]),
	isolation: new Set(["auto", "isolate"]),
	resizeMode: new Set([
		"cover",
		"contain",
		"stretch",
		"repeat",
		"center",
		"none"
	]),
	objectFit: new Set([
		"cover",
		"contain",
		"fill",
		"scale-down",
		"none"
	]),
	mixBlendMode: new Set([
		"normal",
		"multiply",
		"screen",
		"overlay",
		"darken",
		"lighten",
		"color-dodge",
		"color-burn",
		"hard-light",
		"soft-light",
		"difference",
		"exclusion",
		"hue",
		"saturation",
		"color",
		"luminosity"
	])
};
const primitiveLiteralValueProperties = { overflow: {
	view: new Set([
		"visible",
		"hidden",
		"scroll"
	]),
	text: new Set([
		"visible",
		"hidden",
		"scroll"
	]),
	image: new Set(["visible", "hidden"])
} };
const propertyPrimitives = {
	opacity: [
		"view",
		"text",
		"image"
	],
	zIndex: [
		"view",
		"text",
		"image"
	],
	elevation: ["view", "text"],
	flex: [
		"view",
		"text",
		"image"
	],
	flexBasis: [
		"view",
		"text",
		"image"
	],
	flexGrow: [
		"view",
		"text",
		"image"
	],
	flexShrink: [
		"view",
		"text",
		"image"
	],
	width: [
		"view",
		"text",
		"image"
	],
	height: [
		"view",
		"text",
		"image"
	],
	minWidth: [
		"view",
		"text",
		"image"
	],
	minHeight: [
		"view",
		"text",
		"image"
	],
	maxWidth: [
		"view",
		"text",
		"image"
	],
	maxHeight: [
		"view",
		"text",
		"image"
	],
	top: [
		"view",
		"text",
		"image"
	],
	right: [
		"view",
		"text",
		"image"
	],
	bottom: [
		"view",
		"text",
		"image"
	],
	left: [
		"view",
		"text",
		"image"
	],
	start: [
		"view",
		"text",
		"image"
	],
	end: [
		"view",
		"text",
		"image"
	],
	rowGap: [
		"view",
		"text",
		"image"
	],
	columnGap: [
		"view",
		"text",
		"image"
	],
	paddingTop: [
		"view",
		"text",
		"image"
	],
	paddingRight: [
		"view",
		"text",
		"image"
	],
	paddingBottom: [
		"view",
		"text",
		"image"
	],
	paddingLeft: [
		"view",
		"text",
		"image"
	],
	paddingStart: [
		"view",
		"text",
		"image"
	],
	paddingEnd: [
		"view",
		"text",
		"image"
	],
	marginTop: [
		"view",
		"text",
		"image"
	],
	marginRight: [
		"view",
		"text",
		"image"
	],
	marginBottom: [
		"view",
		"text",
		"image"
	],
	marginLeft: [
		"view",
		"text",
		"image"
	],
	marginStart: [
		"view",
		"text",
		"image"
	],
	marginEnd: [
		"view",
		"text",
		"image"
	],
	borderTopWidth: [
		"view",
		"text",
		"image"
	],
	borderRightWidth: [
		"view",
		"text",
		"image"
	],
	borderBottomWidth: [
		"view",
		"text",
		"image"
	],
	borderLeftWidth: [
		"view",
		"text",
		"image"
	],
	borderStartWidth: [
		"view",
		"text",
		"image"
	],
	borderEndWidth: [
		"view",
		"text",
		"image"
	],
	borderTopColor: [
		"view",
		"text",
		"image"
	],
	borderRightColor: [
		"view",
		"text",
		"image"
	],
	borderBottomColor: [
		"view",
		"text",
		"image"
	],
	borderLeftColor: [
		"view",
		"text",
		"image"
	],
	borderStartColor: [
		"view",
		"text",
		"image"
	],
	borderEndColor: [
		"view",
		"text",
		"image"
	],
	backgroundColor: [
		"view",
		"text",
		"image"
	],
	color: ["text"],
	tintColor: ["image"],
	overlayColor: ["image"],
	shadowColor: [
		"view",
		"text",
		"image"
	],
	shadowOpacity: [
		"view",
		"text",
		"image"
	],
	shadowRadius: [
		"view",
		"text",
		"image"
	],
	textShadowColor: ["text"],
	textShadowRadius: ["text"],
	textDecorationColor: ["text"],
	fontSize: ["text"],
	letterSpacing: ["text"],
	lineHeight: ["text"],
	fontFamily: ["text"],
	fontStyle: ["text"],
	fontWeight: ["text"],
	textAlign: ["text"],
	textAlignVertical: ["text"],
	verticalAlign: ["text"],
	textDecorationLine: ["text"],
	textDecorationStyle: ["text"],
	textTransform: ["text"],
	writingDirection: ["text"],
	userSelect: ["text"],
	includeFontPadding: ["text"],
	display: [
		"view",
		"text",
		"image"
	],
	position: [
		"view",
		"text",
		"image"
	],
	direction: [
		"view",
		"text",
		"image"
	],
	overflow: [
		"view",
		"text",
		"image"
	],
	flexDirection: [
		"view",
		"text",
		"image"
	],
	flexWrap: [
		"view",
		"text",
		"image"
	],
	alignContent: [
		"view",
		"text",
		"image"
	],
	alignItems: [
		"view",
		"text",
		"image"
	],
	alignSelf: [
		"view",
		"text",
		"image"
	],
	justifyContent: [
		"view",
		"text",
		"image"
	],
	boxSizing: [
		"view",
		"text",
		"image"
	],
	aspectRatio: [
		"view",
		"text",
		"image"
	],
	rotation: [
		"view",
		"text",
		"image"
	],
	scaleX: [
		"view",
		"text",
		"image"
	],
	scaleY: [
		"view",
		"text",
		"image"
	],
	translateX: [
		"view",
		"text",
		"image"
	],
	translateY: [
		"view",
		"text",
		"image"
	],
	backfaceVisibility: [
		"view",
		"text",
		"image"
	],
	cursor: [
		"view",
		"text",
		"image"
	],
	borderCurve: ["view", "text"],
	pointerEvents: ["view", "text"],
	borderStyle: ["view", "text"],
	outlineStyle: ["view", "text"],
	isolation: ["view", "text"],
	resizeMode: ["image"],
	objectFit: ["image"],
	mixBlendMode: ["view", "text"],
	outlineColor: ["view", "text"],
	outlineOffset: ["view", "text"],
	outlineWidth: ["view", "text"],
	borderBlockColor: ["view", "text"],
	borderBlockStartColor: ["view", "text"],
	borderBlockEndColor: ["view", "text"],
	borderTopLeftRadius: [
		"view",
		"text",
		"image"
	],
	borderTopRightRadius: [
		"view",
		"text",
		"image"
	],
	borderBottomRightRadius: [
		"view",
		"text",
		"image"
	],
	borderBottomLeftRadius: [
		"view",
		"text",
		"image"
	],
	borderStartStartRadius: [
		"view",
		"text",
		"image"
	],
	borderStartEndRadius: [
		"view",
		"text",
		"image"
	],
	borderEndStartRadius: [
		"view",
		"text",
		"image"
	],
	borderEndEndRadius: [
		"view",
		"text",
		"image"
	],
	borderTopStartRadius: [
		"view",
		"text",
		"image"
	],
	borderTopEndRadius: [
		"view",
		"text",
		"image"
	],
	borderBottomStartRadius: [
		"view",
		"text",
		"image"
	],
	borderBottomEndRadius: [
		"view",
		"text",
		"image"
	]
};
function nativeLocalPropertyDomain(property) {
	if (colorValueProperties.has(property)) return "color";
	if (property === "opacity" || property === "shadowOpacity") return "opacity";
	if (literalValueProperties[property] && !["includeFontPadding"].includes(property)) return "enum";
	if (dimensionValueProperties.has(property) || percentageValueProperties.has(property) || /^(?:border.*(?:Width|Radius)|fontSize|letterSpacing|lineHeight|outlineOffset|outlineWidth)$/.test(property)) return "length";
}
function assertNativeLocalPropertyDomain(property, primitives, domain) {
	const allowed = propertyPrimitives[property];
	if (!allowed || !primitives.every((kind) => allowed.includes(kind)) || nativeLocalPropertyDomain(property) !== domain.kind) throw new Error(formatNativeStylesDiagnostic(NativeStylesDiagnosticCode.LocalVarDomainMismatch, `${property}: local domain is unsupported by the native primitive property`));
	if (domain.kind === "enum") for (const member of domain.values) assertNativeLocalPropertyValue(property, primitives, member);
}
function assertNativeLocalPropertyValue(property, primitives, value, context) {
	const key = property, allowed = propertyPrimitives[key], literals = literalValueProperties[key];
	const numeric = typeof value === "number" && Number.isFinite(value);
	const percentage = typeof value === "string" && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?%$/i.test(value) && Number.isFinite(Number.parseFloat(value));
	if (!(allowed && primitives.every((kind) => allowed.includes(kind)) && (literals ? literals.has(value) && primitives.every((kind) => primitiveLiteralValueProperties[key]?.[kind]?.has(value) ?? true) : numberOrStringValueProperties.has(key) ? numeric || typeof value === "string" && value.length > 0 : colorValueProperties.has(key) || stringValueProperties.has(key) ? typeof value === "string" && value.length > 0 : numeric || dimensionValueProperties.has(key) && (value === "auto" || percentage) || percentageValueProperties.has(key) && percentage))) throw new Error(formatNativeStylesDiagnostic(NativeStylesDiagnosticCode.LocalVarInvalidPropertyValue, `${context ?? property}: invalid value for native primitive ${primitives.join("/")}`));
}
//#endregion
//#region src/native-structured-policy.ts
const structuredPropertyPrimitives = {
	boxShadow: ["view"],
	filter: ["view", "text"],
	experimental_backgroundRepeat: ["view", "text"],
	experimental_backgroundSize: ["view", "text"],
	experimental_backgroundPosition: ["view", "text"],
	experimental_backgroundImage: ["view", "text"],
	transform: [
		"view",
		"text",
		"image"
	],
	shadowOffset: [
		"view",
		"text",
		"image"
	],
	textShadowOffset: ["text"],
	transformOrigin: [
		"view",
		"text",
		"image"
	],
	transformMatrix: [
		"view",
		"text",
		"image"
	],
	fontVariant: ["text"]
};
const fontVariantValues = [
	"small-caps",
	"oldstyle-nums",
	"lining-nums",
	"tabular-nums",
	"common-ligatures",
	"no-common-ligatures",
	"discretionary-ligatures",
	"no-discretionary-ligatures",
	"historical-ligatures",
	"no-historical-ligatures",
	"contextual",
	"no-contextual",
	"proportional-nums",
	"stylistic-one",
	"stylistic-two",
	"stylistic-three",
	"stylistic-four",
	"stylistic-five",
	"stylistic-six",
	"stylistic-seven",
	"stylistic-eight",
	"stylistic-nine",
	"stylistic-ten",
	"stylistic-eleven",
	"stylistic-twelve",
	"stylistic-thirteen",
	"stylistic-fourteen",
	"stylistic-fifteen",
	"stylistic-sixteen",
	"stylistic-seventeen",
	"stylistic-eighteen",
	"stylistic-nineteen",
	"stylistic-twenty"
];
const finite = (v) => typeof v === "number" && Number.isFinite(v);
const nonnegative = (v) => finite(v) && v >= 0;
const numeric = "-?(?:\\d+(?:\\.\\d+)?|\\.\\d+)";
const unit = (suffix, positive = false) => (v) => typeof v === "string" && new RegExp(`^${numeric}${suffix}$`).test(v) && Number.isFinite(Number.parseFloat(v)) && (!positive || Number.parseFloat(v) >= 0);
const pct = unit("%"), angle = unit("(?:deg|rad)");
const numberOrPct = (v) => finite(v) || pct(v);
const color = (v) => typeof v === "string" && v.length > 0 && !/^var\s*\(/i.test(v);
const array = (predicate) => (v) => Array.isArray(v) && v.every(predicate);
function record(v, required, optional = {}) {
	if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
	const x = v;
	return Object.keys(required).every((k) => Object.hasOwn(x, k)) && Object.keys(x).every((k) => (required[k] ?? optional[k])?.(x[k]) === true);
}
const matrix = (v) => Array.isArray(v) && v.length === 16 && v.every(finite);
const transform = (v) => {
	if (!v || typeof v !== "object" || Array.isArray(v) || Object.keys(v).length !== 1) return false;
	const [key, value] = Object.entries(v)[0];
	return [
		"perspective",
		"scale",
		"scaleX",
		"scaleY"
	].includes(key) ? finite(value) : [
		"rotate",
		"rotateX",
		"rotateY",
		"rotateZ",
		"skewX",
		"skewY"
	].includes(key) ? angle(value) : ["translateX", "translateY"].includes(key) ? numberOrPct(value) : key === "matrix" && matrix(value);
};
const shadow = (v) => record(v, {
	offsetX: numberOrPct,
	offsetY: numberOrPct
}, {
	color,
	blurRadius: nonnegative,
	spreadDistance: finite,
	inset: (x) => typeof x === "boolean"
});
const pixel = (v) => finite(v) || v === "0" || unit("px")(v);
const positivePixel = (v) => nonnegative(v) || v === "0" || unit("px", true)(v);
const dropShadow = (v) => record(v, {
	offsetX: pixel,
	offsetY: pixel
}, {
	standardDeviation: positivePixel,
	color: (x) => color(x) || finite(x)
});
const filter = (v) => {
	if (!v || typeof v !== "object" || Array.isArray(v) || Object.keys(v).length !== 1) return false;
	const [key, value] = Object.entries(v)[0];
	return key === "dropShadow" ? dropShadow(value) : key === "hueRotate" ? value === 0 || value === "0" || angle(value) : key === "blur" ? nonnegative(value) || unit("(?:px)?", true)(value) : [
		"brightness",
		"contrast",
		"grayscale",
		"invert",
		"opacity",
		"saturate",
		"sepia"
	].includes(key) && (nonnegative(value) || unit("(?:%|px)?", true)(value));
};
const sizeLength = (v) => v === "auto" || nonnegative(v) || unit("(?:px|%)", true)(v);
const radialLength = (v) => nonnegative(v) || unit("(?:px|%)", true)(v);
const positionLength = (v) => finite(v) || v === "0" || unit("(?:px|%)")(v);
const position = (v) => ["top", "bottom"].some((y) => ["left", "right"].some((x) => record(v, {
	[y]: positionLength,
	[x]: positionLength
})));
const stop = (v) => record(v, { color: (x) => x === null || color(x) }, { positions: array(numberOrPct) });
const direction = (v) => unit("(?:deg|grad|rad|turn)")(v) || typeof v === "string" && [
	"to top",
	"to right",
	"to bottom",
	"to left",
	"to top right",
	"to right top",
	"to bottom right",
	"to right bottom",
	"to top left",
	"to left top",
	"to bottom left",
	"to left bottom"
].includes(v);
const image = (v) => record(v, {
	type: (x) => x === "linear-gradient",
	direction,
	colorStops: array(stop)
}) || record(v, {
	type: (x) => x === "radial-gradient",
	shape: (x) => x === "circle" || x === "ellipse",
	size: (x) => typeof x === "string" && [
		"closest-corner",
		"closest-side",
		"farthest-corner",
		"farthest-side"
	].includes(x) || record(x, {
		x: radialLength,
		y: radialLength
	}),
	position,
	colorStops: array(stop)
});
function isNativeStructuredValue(property, value) {
	switch (property) {
		case "shadowOffset":
		case "textShadowOffset": return record(value, {
			width: finite,
			height: finite
		});
		case "transform": return array(transform)(value);
		case "transformOrigin": return Array.isArray(value) && (value.length === 2 || value.length === 3) && value.every(numberOrPct);
		case "transformMatrix": return matrix(value);
		case "boxShadow": return array(shadow)(value);
		case "filter": return array(filter)(value);
		case "fontVariant": return array((v) => typeof v === "string" && fontVariantValues.includes(v))(value);
		case "experimental_backgroundRepeat": return array((v) => record(v, {
			x: (x) => [
				"repeat",
				"space",
				"round",
				"no-repeat"
			].includes(x),
			y: (x) => [
				"repeat",
				"space",
				"round",
				"no-repeat"
			].includes(x)
		}))(value);
		case "experimental_backgroundSize": return array((v) => v === "cover" || v === "contain" || record(v, {
			x: sizeLength,
			y: sizeLength
		}))(value);
		case "experimental_backgroundPosition": return array(position)(value);
		case "experimental_backgroundImage": return array(image)(value);
		default: return false;
	}
}
//#endregion
//#region src/local-vars/plan-admission.ts
const plans = /* @__PURE__ */ new WeakMap();
function localPlanCandidate(input) {
	return typeof input === "object" && input !== null && Object.getOwnPropertyDescriptor(input, "$$type")?.value === "crumbs.css.local-style-plan";
}
function admitLocalStylePlan(input, path) {
	if (typeof input === "object" && input !== null) {
		const prior = plans.get(input);
		if (prior) return prior;
	}
	const x = exactLocalRecord(copyLocalData(input, NativeStylesDiagnosticCode.InvalidLocalVar, path), [
		"$$type",
		"version",
		"primitiveDomain",
		"declarations",
		"dependencies"
	], NativeStylesDiagnosticCode.InvalidLocalVar, path);
	if (x.$$type !== "crumbs.css.local-style-plan") localError(NativeStylesDiagnosticCode.InvalidLocalVar, path, "invalid plan tag");
	if (x.version !== 1) localError(NativeStylesDiagnosticCode.LocalVarUnsupportedVersion, path, "unsupported plan version");
	const kinds = x.primitiveDomain;
	if (!Array.isArray(kinds) || !kinds.length || [
		"view",
		"text",
		"image"
	].filter((k) => kinds.includes(k)).join() !== kinds.join()) localError(NativeStylesDiagnosticCode.InvalidLocalVar, path, "invalid primitive domain");
	const primitive = kinds;
	if (!Array.isArray(x.declarations)) localError(NativeStylesDiagnosticCode.InvalidLocalVar, path, "declarations must be an array");
	const variables = [], tokens = /* @__PURE__ */ new Set(), properties = /* @__PURE__ */ new Set();
	const declarations = x.declarations.map((input, i) => {
		const d = exactLocalRecord(input, ["property", "value"], NativeStylesDiagnosticCode.InvalidLocalVar, `${path}.${i}`);
		if (typeof d.property !== "string" || properties.has(d.property)) localError(NativeStylesDiagnosticCode.InvalidLocalVar, path, "invalid or repeated canonical property");
		properties.add(d.property);
		let value = d.value;
		if (localOperandCandidate(value)) {
			value = admitLocalOperand(value);
			const operand = value;
			const vars = operand.$$type === "crumbs.css.local-var" ? [operand] : operand.variables;
			assertNativeLocalPropertyDomain(d.property, primitive, vars[0].domain);
			variables.push(...vars);
			if (operand.$$type !== "crumbs.css.local-var" && operand.terminal.kind === "theme") tokens.add(operand.terminal.reference.varName);
		} else if (isThemeTokenReferenceCandidate(value)) {
			if (!isThemeTokenReference(value) || !Object.hasOwn(propertyPrimitives, d.property)) localError(NativeStylesDiagnosticCode.InvalidLocalVar, path, "invalid native theme reference");
			const allowed = propertyPrimitives[d.property];
			if (!primitive.every((k) => allowed.includes(k))) localError(NativeStylesDiagnosticCode.LocalVarInvalidPropertyValue, path, "wrong theme property primitive");
			tokens.add(value.varName);
		} else if (Object.hasOwn(structuredPropertyPrimitives, d.property)) {
			const allowed = structuredPropertyPrimitives[d.property];
			if (!primitive.every((k) => allowed.includes(k)) || !isNativeStructuredValue(d.property, value)) localError(NativeStylesDiagnosticCode.LocalVarInvalidPropertyValue, path, "invalid structured native value");
		} else assertNativeLocalPropertyValue(d.property, primitive, value);
		return Object.freeze({
			property: d.property,
			value
		});
	});
	assertLocalDefinitions(variables);
	const dependencies = exactLocalRecord(x.dependencies, ["localVars", "tokens"], NativeStylesDiagnosticCode.InvalidLocalVar, path + ".dependencies");
	const localVars = [...new Set(variables.map(nativeLocalVarKey))].sort(), themeTokens = [...tokens].sort();
	if (!Array.isArray(dependencies.localVars) || !Array.isArray(dependencies.tokens) || JSON.stringify(dependencies.localVars) !== JSON.stringify(localVars) || JSON.stringify(dependencies.tokens) !== JSON.stringify(themeTokens)) localError(NativeStylesDiagnosticCode.InvalidLocalVar, path, "dependency tables do not match declarations");
	const result = Object.freeze({
		$$type: NativeLocalStylePlanType,
		version: 1,
		primitiveDomain: primitive,
		declarations: Object.freeze(declarations),
		dependencies: Object.freeze({
			localVars: Object.freeze(localVars),
			tokens: Object.freeze(themeTokens)
		})
	});
	if (typeof input === "object" && input !== null && isImmutableLocalData(input)) plans.set(input, result);
	plans.set(result, result);
	return result;
}
//#endregion
//#region src/local-vars/resolver.ts
const missing = Symbol("absent local"), noTheme = Object.freeze({});
const maps = /* @__PURE__ */ new WeakMap();
const memo = /* @__PURE__ */ new WeakMap();
function ownRecord(value, path) {
	if (typeof value !== "object" || value === null || Array.isArray(value) || ![null, Object.prototype].includes(Object.getPrototypeOf(value))) localError(NativeStylesDiagnosticCode.InvalidLocalVar, path, "expected a plain record");
	return value;
}
function rejectNestedLocals(value, path) {
	if (localOperandCandidate(value) || localPlanCandidate(value)) localError(NativeStylesDiagnosticCode.InvalidLocalVar, path, "local operands require scalar plan slots");
	if (value && typeof value === "object") for (const child of Object.values(value)) rejectNestedLocals(child, path);
}
function admitStyles(input) {
	const prior = maps.get(input);
	if (prior) return prior;
	const record = ownRecord(input, "styles"), result = {};
	for (const key of Reflect.ownKeys(record)) {
		const d = Object.getOwnPropertyDescriptor(record, key);
		if (key === NativeStyleMapSymbol) {
			if (!("value" in d) || !d.enumerable || d.value !== true) localError(NativeStylesDiagnosticCode.InvalidLocalVar, "styles", "invalid native map marker");
			continue;
		}
		if (typeof key !== "string" || !("value" in d) || !d.enumerable) localError(NativeStylesDiagnosticCode.InvalidLocalVar, "styles", "expected own enumerable style exports");
		if (d.value === void 0) {
			Object.defineProperty(result, key, {
				value: void 0,
				enumerable: true
			});
			continue;
		}
		if (localPlanCandidate(d.value)) {
			Object.defineProperty(result, key, {
				value: admitLocalStylePlan(d.value, `styles.${key}`),
				enumerable: true
			});
			continue;
		}
		const copied = copyLocalData(d.value, NativeStylesDiagnosticCode.InvalidLocalVar, `styles.${key}`);
		const style = ownRecord(copied, `styles.${key}`);
		if (Object.hasOwn(style, "$$type")) localError(NativeStylesDiagnosticCode.InvalidLocalVar, `styles.${key}`, "expected primitive styles, not a descriptor or operand");
		for (const [property, value] of Object.entries(style)) {
			rejectNestedLocals(value, `styles.${key}.${property}`);
			if (isThemeTokenReference(value)) {
				if (!Object.hasOwn(propertyPrimitives, property)) localError(NativeStylesDiagnosticCode.LocalVarInvalidPropertyValue, `styles.${key}.${property}`, "unsupported native token property");
				continue;
			}
			if (Object.hasOwn(structuredPropertyPrimitives, property)) {
				if (!isNativeStructuredValue(property, value)) localError(NativeStylesDiagnosticCode.LocalVarInvalidPropertyValue, `styles.${key}.${property}`, "invalid static structured value");
			} else {
				const primitives = propertyPrimitives[property];
				if (!primitives) localError(NativeStylesDiagnosticCode.LocalVarInvalidPropertyValue, `styles.${key}.${property}`, "unsupported native property");
				assertNativeLocalPropertyValue(property, primitives, value);
			}
		}
		Object.defineProperty(result, key, {
			value: isImmutableLocalData(d.value) ? d.value : copied,
			enumerable: true
		});
	}
	if (Object.hasOwn(record, NativeStyleMapSymbol)) markNativeStyleMap(result);
	Object.freeze(result);
	if (isImmutableLocalData(input)) maps.set(input, result);
	maps.set(result, result);
	return result;
}
function variablesInStyles(styles) {
	const result = [];
	for (const input of Object.values(styles)) if (localPlanCandidate(input)) {
		for (const d of input.declarations) if (localOperandCandidate(d.value)) {
			const v = admitLocalOperand(d.value);
			result.push(...v.$$type === "crumbs.css.local-var" ? [v] : v.variables);
		}
	}
	return result;
}
function ownThemeField(theme, key) {
	const d = Object.getOwnPropertyDescriptor(theme, key);
	if (!d || !("value" in d) || !d.enumerable) localError(NativeStylesDiagnosticCode.InvalidThemeContract, `theme.${key}`, "expected an own data field");
	return d.value;
}
function themeFrame(theme) {
	if (theme === void 0) throw new Error("Missing native theme provider for a reached local fallback or theme token");
	const raw = ownRecord(theme, "theme"), contract = ownThemeField(raw, "contract"), tokens = ownThemeField(raw, "tokens"), values = ownThemeField(raw, "values");
	ownRecord(contract, "theme.contract");
	function validateContract(value, active = /* @__PURE__ */ new Set(), depth = 0) {
		if (active.has(value) || depth >= 64) localError(NativeStylesDiagnosticCode.InvalidThemeContract, "theme.contract", "cyclic or over-depth contract");
		ownRecord(value, "theme.contract");
		active.add(value);
		for (const key of Reflect.ownKeys(value)) {
			const d = Object.getOwnPropertyDescriptor(value, key);
			if (key === Symbol.for("crumbs.css.theme-contract-identity.v1")) {
				if (!("value" in d)) localError(NativeStylesDiagnosticCode.InvalidThemeContract, "theme.contract", "invalid identity metadata");
				const metadata = exactLocalRecord(copyLocalData(d.value, NativeStylesDiagnosticCode.InvalidThemeContract, "theme.contract.identity"), [
					"identity",
					"key",
					"signature"
				], NativeStylesDiagnosticCode.InvalidThemeContract, "theme.contract.identity");
				let identity;
				try {
					identity = normalizeTokenContractIdentity(metadata.identity);
				} catch {
					localError(NativeStylesDiagnosticCode.InvalidThemeContract, "theme.contract", "invalid identity metadata");
				}
				if (!identity || metadata.key !== tokenContractIdentityKey(identity) || typeof metadata.signature !== "string") localError(NativeStylesDiagnosticCode.InvalidThemeContract, "theme.contract", "invalid identity metadata");
				continue;
			}
			if (typeof key !== "string" || !("value" in d) || !d.enumerable) localError(NativeStylesDiagnosticCode.InvalidThemeContract, "theme.contract", "invalid data descriptor");
			if (typeof d.value === "object" && d.value !== null) validateContract(d.value, active, depth + 1);
			else if (typeof d.value !== "string") localError(NativeStylesDiagnosticCode.InvalidThemeContract, "theme.contract", "invalid token reference");
		}
		active.delete(value);
	}
	validateContract(contract);
	const tokenCopy = copyLocalData(tokens, NativeStylesDiagnosticCode.InvalidThemeContract, "theme.tokens");
	ownRecord(tokenCopy, "theme.tokens");
	for (const value of Object.values(tokenCopy)) if (typeof value !== "string" && typeof value !== "number" || typeof value === "number" && !Number.isFinite(value)) localError(NativeStylesDiagnosticCode.InvalidThemeContract, "theme.tokens", "invalid token value");
	const valueCopy = copyLocalData(values, NativeStylesDiagnosticCode.InvalidThemeContract, "theme.values");
	return Object.freeze({
		contract,
		tokens: tokenCopy,
		values: valueCopy
	});
}
function readTheme(read, frame) {
	if (read.contractIdentity && getThemeContractIdentityKey(frame.contract) !== tokenContractIdentityKey(read.contractIdentity)) localError(NativeStylesDiagnosticCode.TokenThemeTokenContractMismatch, read.reference.varName, "theme contract identity does not match fallback owner");
	const token = `var(${read.reference.varName})`, domain = getThemeTokenDomainForContract(frame.contract, token);
	if (read.domain && (!isThemeTokenContract(frame.contract) || !domain || !tokenDomainsEqual(domain, read.domain))) localError(NativeStylesDiagnosticCode.LocalVarDomainMismatch, read.reference.varName, "theme terminal domain does not match its owning contract");
	if (read.domain) {
		if (getThemeTokenVisibility(token) !== "public" || getThemeTokenPublicId(token) !== read.publicId) localError(NativeStylesDiagnosticCode.InvalidLocalVar, read.reference.varName, "theme terminal must retain public token identity");
	}
	const resolved = resolveThemeTokens(Object.freeze({ value: read.reference }), frame);
	if (domain && !isTokenDomainValue(domain, resolved.value)) localError(NativeStylesDiagnosticCode.LocalVarDomainMismatch, read.reference.varName, "invalid owning theme domain value");
	return resolved.value;
}
function equalAssignedOutput(a, b) {
	if (Object.is(a, b)) return true;
	if (!a || !b || typeof a !== "object" || typeof b !== "object" || Array.isArray(a) !== Array.isArray(b)) return false;
	const ak = Object.keys(a), bk = Object.keys(b);
	return ak.length === bk.length && ak.every((k) => Object.hasOwn(b, k) && equalAssignedOutput(a[k], b[k]));
}
function reconcileAssignedState(state, previous) {
	const result = {}, exports = /* @__PURE__ */ new Map();
	for (const [name, row] of state.exports) {
		const prior = previous.exports.get(name), output = prior && equalAssignedOutput(row.output, prior.output) ? prior.output : row.output;
		exports.set(name, output === row.output ? row : {
			...row,
			output
		});
		Object.defineProperty(result, name, {
			value: output,
			enumerable: true
		});
	}
	if (Object.hasOwn(state.result, NativeStyleMapSymbol)) markNativeStyleMap(result);
	Object.freeze(result);
	const same = Object.keys(result).length === Object.keys(previous.result).length && Object.keys(result).every((k) => Object.hasOwn(previous.result, k) && result[k] === previous.result[k]);
	return {
		...state,
		exports,
		result: same ? previous.result : result
	};
}
function resolveAssignedState(styles, input, theme, previous) {
	const admitted = admitStyles(styles), assignments = admitVarAssignments(input), themeKey = theme === void 0 ? noTheme : isImmutableLocalData(theme) ? theme : void 0;
	const cached = themeKey && memo.get(admitted)?.get(assignments)?.get(themeKey);
	if (cached) return previous ? reconcileAssignedState(cached, previous) : cached;
	assertLocalDefinitions([...variablesInStyles(admitted), ...assignments.bindings.map((b) => b.variable)]);
	const bindings = new Map(assignments.bindings.map((b) => [nativeLocalVarKey(b.variable), b.value]));
	let frame;
	const currentFrame = () => frame ?? (frame = themeFrame(theme));
	const exports = /* @__PURE__ */ new Map(), result = {};
	for (const [name, row] of Object.entries(admitted)) {
		const prior = previous?.exports.get(name);
		if (prior && prior.input === row && [...prior.localReads].every(([id, value]) => Object.is(bindings.has(id) ? bindings.get(id) : missing, value)) && prior.themeReads.every(({ read, value }) => Object.is(readTheme(read, currentFrame()), value))) {
			exports.set(name, prior);
			Object.defineProperty(result, name, {
				value: prior.output,
				enumerable: true
			});
			continue;
		}
		const localReads = /* @__PURE__ */ new Map(), themeReads = [];
		const themeValue = (read) => {
			const value = readTheme(read, currentFrame());
			themeReads.push({
				read,
				value
			});
			return value;
		};
		const localValue = (value, path) => {
			if (isThemeTokenReference(value)) return themeValue({ reference: value });
			if (!localOperandCandidate(value)) return value;
			const operand = admitLocalOperand(value), variables = operand.$$type === "crumbs.css.local-var" ? [operand] : operand.variables;
			for (const variable of variables) {
				const key = nativeLocalVarKey(variable), next = bindings.has(key) ? bindings.get(key) : missing;
				localReads.set(key, next);
				if (next !== missing) return next;
			}
			if (operand.$$type === "crumbs.css.local-var") localError(NativeStylesDiagnosticCode.LocalVarRequired, path, `required local variable ${nativeLocalVarKey(operand)} is unassigned`);
			return operand.terminal.kind === "literal" ? operand.terminal.value : themeValue(operand.terminal);
		};
		let output = row;
		if (localPlanCandidate(row)) {
			const plan = row, resolved = {};
			for (const d of plan.declarations) {
				const value = localValue(d.value, `resolution.${name}.${d.property}`);
				if (!Object.hasOwn(structuredPropertyPrimitives, d.property)) {
					const operand = localOperandCandidate(d.value) ? admitLocalOperand(d.value) : void 0;
					const variables = operand ? operand.$$type === "crumbs.css.local-var" ? [operand] : operand.variables : [];
					const context = `resolution.${name}.${d.property}${variables.length ? ` (${variables.map(nativeLocalVarKey).join(", ")})` : ""}`;
					assertNativeLocalPropertyValue(d.property, plan.primitiveDomain, value, context);
				}
				Object.defineProperty(resolved, d.property, {
					value,
					enumerable: true
				});
			}
			output = Object.freeze(resolved);
		} else if (row && typeof row === "object") {
			let changed = false;
			const resolved = {};
			for (const [property, value] of Object.entries(row)) {
				const next = localValue(value, `resolution.${name}.${property}`);
				if (isThemeTokenReference(value)) assertNativeLocalPropertyValue(property, propertyPrimitives[property], next);
				changed ||= next !== value;
				Object.defineProperty(resolved, property, {
					value: next,
					enumerable: true
				});
			}
			if (changed) output = Object.freeze(resolved);
		}
		if (prior && equalAssignedOutput(output, prior.output)) output = prior.output;
		exports.set(name, {
			input: row,
			output,
			localReads,
			themeReads
		});
		Object.defineProperty(result, name, {
			value: output,
			enumerable: true
		});
	}
	if (Object.hasOwn(admitted, NativeStyleMapSymbol)) markNativeStyleMap(result);
	Object.freeze(result);
	const state = {
		styles: admitted,
		result: previous && Object.keys(result).length === Object.keys(previous.result).length && Object.keys(result).every((k) => Object.hasOwn(previous.result, k) && result[k] === previous.result[k]) ? previous.result : result,
		exports
	};
	if (themeKey && !previous) {
		let byAssignments = memo.get(admitted);
		if (!byAssignments) {
			byAssignments = /* @__PURE__ */ new WeakMap();
			memo.set(admitted, byAssignments);
		}
		let byTheme = byAssignments.get(assignments);
		if (!byTheme) {
			byTheme = /* @__PURE__ */ new WeakMap();
			byAssignments.set(assignments, byTheme);
		}
		byTheme.set(themeKey, state);
	}
	return state;
}
function resolveAssignedStyles(styles, assignments, theme) {
	return resolveAssignedState(styles, assignments, theme).result;
}
//#endregion
//#region src/local-vars/selector.ts
function createAssignedStyleSelector(styles) {
	let committed;
	return (assignments, theme) => {
		const next = resolveAssignedState(styles, assignments, theme, committed);
		committed = next;
		return next.result;
	};
}
//#endregion
//#region src/local-vars/react.ts
function useAssignedStyles(styles, assignments) {
	const resolve = useMemo(() => createAssignedStyleSelector(styles), [styles]);
	return useOptionalThemeSelection(useCallback((theme) => resolve(assignments, theme), [assignments, resolve]));
}
//#endregion
export { assignVars, resolveAssignedStyles, useAssignedStyles };
