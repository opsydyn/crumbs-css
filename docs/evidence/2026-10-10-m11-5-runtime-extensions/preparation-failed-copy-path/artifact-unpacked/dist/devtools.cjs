Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
let react = require("react");
let effect_Schema = require("effect/Schema");
effect_Schema = __toESM(effect_Schema, 1);
let effect_Result = require("effect/Result");
effect_Result = __toESM(effect_Result, 1);
let effect_SchemaIssue = require("effect/SchemaIssue");
effect_SchemaIssue = __toESM(effect_SchemaIssue, 1);
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
function isRecord$2(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isOneOf(values, value) {
	return typeof value === "string" && values.includes(value);
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
snapshotFromInput(DEFAULT_INPUT);
function assertMatcherValue(key, value) {
	if (!(key === "platform" && isOneOf(NATIVE_PLATFORMS, value) || key === "widthBucket" && isOneOf(WIDTH_BUCKETS, value) || key === "heightBucket" && isOneOf(HEIGHT_BUCKETS, value) || key === "orientation" && isOneOf(ORIENTATIONS, value) || key === "direction" && isOneOf(DIRECTIONS, value) || key === "fontScaleBucket" && isOneOf(FONT_SCALE_BUCKETS, value) || key === "motion" && isOneOf(MOTION_PREFERENCES, value) || key === "contrast" && isOneOf(CONTRAST_PREFERENCES, value))) throw new TypeError(`Invalid native condition matcher value for ${key}`);
}
function prepareMatcher(matcher) {
	if (!isRecord$2(matcher)) throw new TypeError("native condition matcher must be an object");
	for (const key of Object.keys(matcher)) {
		if (!CONDITION_KEYS.includes(key)) throw new TypeError(`Unsupported native condition matcher: ${key}`);
		assertMatcherValue(key, matcher[key]);
	}
	return Object.freeze({ ...matcher });
}
function prepareBranches(branches) {
	return branches.map((branch) => {
		if (!isRecord$2(branch)) throw new TypeError("native condition branch must be an object");
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
const CONDITION_VALUES = {
	platform: [
		"android",
		"ios",
		"macos",
		"visionos",
		"web",
		"windows",
		"unknown"
	],
	widthBucket: [
		"compact",
		"medium",
		"expanded"
	],
	heightBucket: [
		"short",
		"regular",
		"tall"
	],
	orientation: ["portrait", "landscape"],
	direction: ["ltr", "rtl"],
	fontScaleBucket: [
		"normal",
		"large",
		"extraLarge"
	],
	motion: ["full", "reduced"],
	contrast: [
		"normal",
		"more",
		"less"
	]
};
const NODE_KINDS = [
	"literal",
	"token-reference",
	"condition-reference",
	"alias",
	"fallback",
	"compose",
	"add",
	"subtract",
	"scale",
	"clamp",
	"match"
];
function isRecord$1(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function nonEmptyString(value, message) {
	if (typeof value !== "string" || value.trim().length === 0) throw new TypeError(message);
	if (value !== value.trim()) throw new TypeError(message);
	return value;
}
function finiteNumber(value, message) {
	if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(message);
	return value;
}
function tokenDependency(name) {
	return Object.freeze({
		kind: "token",
		name
	});
}
function conditionDependency(key) {
	return Object.freeze({
		kind: "condition",
		key
	});
}
function assertExpression(value) {
	if (!isNativeExpression(value)) throw new TypeError("native expression node is invalid");
}
function assertLiteralValue(domain, value) {
	switch (domain.kind) {
		case "number":
		case "length":
		case "duration":
		case "opacity":
			const numericValue = finiteNumber(value, `literal value must be finite for ${domain.kind}`);
			if (domain.kind === "opacity" && (numericValue < 0 || numericValue > 1)) throw new TypeError("opacity literal must be between 0 and 1");
			if (domain.kind === "length" && !domain.allowNegative && numericValue < 0) throw new TypeError("length literal cannot be negative in this domain");
			return;
		case "color":
			nonEmptyString(value, "color literal must be a non-empty string");
			return;
		case "enum":
			const enumValue = nonEmptyString(value, "enum literal must be a non-empty string");
			if (!domain.values.includes(enumValue)) throw new TypeError("enum literal is not in its domain");
			return;
	}
}
function isNativeExpression(value) {
	if (!isRecord$1(value)) return false;
	return value.$$type === "crumbs.css.expression" && value.version === 1 && typeof value.kind === "string" && NODE_KINDS.includes(value.kind) && isRecord$1(value.domain) && Array.isArray(value.dependencies);
}
var NativeExpressionEvaluationError = class extends Error {
	code;
	dependency;
	constructor(code, message, dependency) {
		super(message);
		this.name = "NativeExpressionEvaluationError";
		this.code = code;
		if (dependency !== void 0) this.dependency = dependency;
	}
};
const DEFAULT_EVALUATION_CONDITIONS = Object.freeze({
	platform: "unknown",
	widthBucket: "compact",
	heightBucket: "short",
	orientation: "portrait",
	direction: "ltr",
	fontScaleBucket: "normal",
	motion: "full",
	contrast: "normal"
});
function evaluationError(code, message, dependency) {
	return new NativeExpressionEvaluationError(code, message, dependency);
}
function assertEvaluationRecord(value, message) {
	if (!isRecord$1(value)) throw evaluationError("invalid-input", message);
	return value;
}
function normalizeEvaluationConditions(value) {
	const conditions = assertEvaluationRecord(value, "native expression conditions must be an object");
	const keys = Object.keys(CONDITION_VALUES);
	if (Object.keys(conditions).length !== keys.length || keys.some((key) => !Object.hasOwn(conditions, key))) throw evaluationError("invalid-input", "native expression conditions must contain every finite axis");
	for (const key of keys) {
		const candidate = conditions[key];
		if (!CONDITION_VALUES[key].includes(candidate)) throw evaluationError("invalid-input", `invalid native expression condition value for ${key}`);
	}
	return Object.freeze({ ...conditions });
}
function normalizeEvaluationState(state) {
	const candidate = state ?? { conditions: DEFAULT_EVALUATION_CONDITIONS };
	const conditions = normalizeEvaluationConditions(candidate.conditions);
	const tokens = candidate.tokens === void 0 ? {} : assertEvaluationRecord(candidate.tokens, "native expression tokens must be an object");
	return Object.freeze({
		tokens: Object.freeze({ ...tokens }),
		conditions
	});
}
function tokenValue(expression, state) {
	const tokens = state.tokens ?? {};
	if (!Object.hasOwn(tokens, expression.token) || tokens[expression.token] === void 0) throw evaluationError("missing-input", `missing native expression token ${expression.token}`, tokenDependency(expression.token));
	return tokens[expression.token];
}
function evaluateNode(expression, state, matches) {
	switch (expression.kind) {
		case "literal":
			try {
				assertLiteralValue(expression.domain, expression.value);
			} catch (error) {
				if (error instanceof TypeError) throw evaluationError("domain-error", `literal does not satisfy its ${expression.domain.kind} domain`);
				throw error;
			}
			return expression.value;
		case "token-reference": {
			const value = tokenValue(expression, state);
			try {
				assertLiteralValue(expression.domain, value);
			} catch (error) {
				if (error instanceof TypeError) throw evaluationError("domain-error", `token ${expression.token} did not provide a valid ${expression.domain.kind} value`, tokenDependency(expression.token));
				throw error;
			}
			return value;
		}
		case "condition-reference": {
			const value = state.conditions[expression.condition];
			try {
				assertLiteralValue(expression.domain, value);
			} catch (error) {
				if (error instanceof TypeError) throw evaluationError("invalid-input", `condition ${expression.condition} did not provide a valid value`, conditionDependency(expression.condition));
				throw error;
			}
			return value;
		}
		case "alias": return evaluateNode(expression.expression, state, matches);
		case "fallback": try {
			return evaluateNode(expression.primary, state, matches);
		} catch (error) {
			if (error instanceof NativeExpressionEvaluationError && error.code === "missing-input") return evaluateNode(expression.fallback, state, matches);
			throw error;
		}
		case "compose": {
			let value;
			for (const entry of expression.expressions) value = evaluateNode(entry, state, matches);
			return value;
		}
		case "add": {
			const value = evaluateNode(expression.left, state, matches) + evaluateNode(expression.right, state, matches);
			try {
				assertLiteralValue(expression.domain, value);
			} catch (error) {
				if (error instanceof TypeError) throw evaluationError("domain-error", "add result does not satisfy its expression domain");
				throw error;
			}
			return value;
		}
		case "subtract": {
			const value = evaluateNode(expression.left, state, matches) - evaluateNode(expression.right, state, matches);
			try {
				assertLiteralValue(expression.domain, value);
			} catch (error) {
				if (error instanceof TypeError) throw evaluationError("domain-error", "subtract result does not satisfy its expression domain");
				throw error;
			}
			return value;
		}
		case "scale": {
			const value = evaluateNode(expression.expression, state, matches) * expression.factor;
			try {
				assertLiteralValue(expression.domain, value);
			} catch (error) {
				if (error instanceof TypeError) throw evaluationError("domain-error", "scale result does not satisfy its expression domain");
				throw error;
			}
			return value;
		}
		case "clamp": {
			const input = evaluateNode(expression.expression, state, matches);
			const value = Math.min(expression.maximum, Math.max(expression.minimum, input));
			try {
				assertLiteralValue(expression.domain, value);
			} catch (error) {
				if (error instanceof TypeError) throw evaluationError("domain-error", "clamp result does not satisfy its expression domain");
				throw error;
			}
			return value;
		}
		case "match": {
			const conditionValue = state.conditions[expression.condition];
			const selected = expression.cases.find((entry) => entry.value === conditionValue);
			if (selected !== void 0) {
				matches?.push({
					condition: expression.condition,
					value: String(conditionValue),
					selectedBranch: "case",
					selectedCaseValue: String(selected.value)
				});
				return evaluateNode(selected.expression, state, matches);
			}
			if (expression.fallback !== void 0) {
				matches?.push({
					condition: expression.condition,
					value: String(conditionValue),
					selectedBranch: "fallback"
				});
				return evaluateNode(expression.fallback, state, matches);
			}
			throw evaluationError("invalid-input", `exhaustive match did not cover ${expression.condition}=${String(conditionValue)}`, conditionDependency(expression.condition));
		}
	}
}
/** @internal Evaluate with opt-in match evidence; the value uses the same evaluator as the ordinary API. */
function evaluateNativeExpressionWithTrace(expression, state) {
	assertExpression(expression);
	const matches = [];
	const value = evaluateNode(expression, normalizeEvaluationState(state), matches);
	return Object.freeze({
		value,
		matches: Object.freeze(matches.map((match) => Object.freeze(match)))
	});
}
//#endregion
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
const NativeComponentRecipeType = "crumbs.css.component-recipe";
const NativeComponentRecipeExtensionType = "crumbs.css.component-recipe-extension";
const NativeSprinklesLookupPlanType = "crumbs.css.sprinkles-lookup-plan";
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
//#region src/theme-token.ts
const NativeThemeTokenReferenceType = "crumbs.css.theme-token";
const NATIVE_TOKEN_NAME = /^--crumbs-[A-Za-z0-9_-]+$/;
const domainContracts = sharedRegistry$1(Symbol.for("crumbs.css.theme-token-domain-contracts.v1"), () => /* @__PURE__ */ new WeakMap());
sharedRegistry$1(Symbol.for("crumbs.css.theme-contract-identities.v1"), () => /* @__PURE__ */ new Map());
const contractIdentitySymbol = Symbol.for("crumbs.css.theme-contract-identity.v1");
sharedRegistry$1(Symbol.for("crumbs.css.theme-token-registry.v1"), () => /* @__PURE__ */ new Map());
/** @internal A domain contract owns token references through this local map. */
function isThemeTokenContract(contract) {
	return typeof contract === "object" && contract !== null && domainContracts.has(contract);
}
/** @internal Check token ownership without relying on the global var-name registry. */
function isThemeTokenOwnedByContract(contract, token) {
	return domainContracts.get(contract)?.has(String(token)) ?? false;
}
function getThemeContractIdentity(contract) {
	return getThemeContractIdentityMetadata(contract)?.identity;
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
//#region src/runtime/recipe-resolution-plan.ts
const RecipeResolutionPlanType = "crumbs.css.recipe-resolution-plan";
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
sharedRegistry(Symbol.for("crumbs.css.token-theme-context.v2"), () => (0, react.createContext)(null));
const themeResolutionCache = sharedRegistry(Symbol.for("crumbs.css.theme-resolution-cache.v1"), () => /* @__PURE__ */ new WeakMap());
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
	const flattened = flattenStyle$1(style);
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
function flattenStyle$1(style) {
	assertNoLocalStylePlan(style);
	if (style === null || style === void 0 || style === false) return void 0;
	if (Array.isArray(style)) {
		const flattened = style.flatMap((item) => {
			const resolved = flattenStyle$1(item);
			return resolved === void 0 ? [] : [resolved];
		});
		if (flattened.length === 0) return void 0;
		return Object.assign({}, ...flattened);
	}
	if (typeof style === "object") return style;
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
function isNativeComponentRecipeExtension(value) {
	return typeof value === "object" && value !== null && "$$type" in value && value.$$type === "crumbs.css.component-recipe-extension";
}
function isNativeComponentRecipe(value) {
	return typeof value === "object" && value !== null && "$$type" in value && value.$$type === "crumbs.css.component-recipe";
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
//#region src/devtools/style-explanation-model.ts
const STYLE_EXPLANATION_METADATA_TYPE = "crumbs.css.style-explanation-metadata";
const STYLE_EXPLANATION_REPORT_TYPE = "crumbs.css.style-explanation";
const STYLE_EXPLANATION_VALUE_TYPE = "crumbs.css.style-explanation-value";
const STYLE_EXPLANATION_VERSION = 1;
//#endregion
//#region src/contracts/data-codec.ts
const formatIssues = effect_SchemaIssue.makeFormatterStandardSchemaV1();
const options = {
	onExcessProperty: "error",
	errors: "all"
};
const MAX_DATA_DEPTH = 64;
var DataIssue = class extends Error {
	constructor(path, message) {
		super(message);
		this.path = path;
	}
};
function copyData(input, path = [], ancestors = /* @__PURE__ */ new Set()) {
	if (input === null || typeof input === "string" || typeof input === "boolean" || typeof input === "number") return input;
	if (typeof input !== "object") throw new DataIssue(path, "Expected plain serializable data");
	if (path.length >= MAX_DATA_DEPTH) throw new DataIssue(path, `Data exceeds ${MAX_DATA_DEPTH} nested containers`);
	if (ancestors.has(input)) throw new DataIssue(path, "Cyclic data is not supported");
	const array = Array.isArray(input);
	const prototype = Object.getPrototypeOf(input);
	if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) throw new DataIssue(path, "Expected a plain record or array");
	ancestors.add(input);
	try {
		const output = array ? [] : Object.create(null);
		const keys = Reflect.ownKeys(input);
		const length = array ? Object.getOwnPropertyDescriptor(input, "length")?.value : 0;
		if (array && keys.length !== length + 1) throw new DataIssue(path, "Expected a dense undecorated array");
		for (const key of keys) {
			if (array && key === "length") continue;
			if (typeof key !== "string") throw new DataIssue(path, "Symbol fields are not supported");
			const index = array ? Number(key) : key;
			if (array && (!Number.isSafeInteger(index) || Number(index) < 0 || Number(index) >= length || String(index) !== key)) throw new DataIssue(path, "Expected a dense undecorated array");
			const nextPath = [...path, index];
			const descriptor = Object.getOwnPropertyDescriptor(input, key);
			if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) throw new DataIssue(nextPath, "Expected an own enumerable data field");
			Object.defineProperty(output, key, {
				value: copyData(descriptor.value, nextPath, ancestors),
				enumerable: true,
				writable: true,
				configurable: true
			});
		}
		return output;
	} finally {
		ancestors.delete(input);
	}
}
function makeDataCodec(boundary, schema) {
	const decodeSchema = effect_Schema.decodeUnknownResult(schema, options);
	const encodeSchema = effect_Schema.encodeUnknownResult(schema, options);
	const failure = (code, path, message) => ({
		ok: false,
		issues: [{
			code,
			boundary,
			path,
			message
		}]
	});
	const schemaFailure = (error) => ({
		ok: false,
		issues: formatIssues(error.issue).issues.map((issue) => ({
			code: "CRUMBS_CONTRACT_INVALID_PAYLOAD",
			boundary,
			path: (issue.path ?? []).map((segment) => typeof segment === "object" ? segment.key : segment).map((key) => typeof key === "number" ? key : String(key)),
			message: issue.message
		}))
	});
	const decode = (input) => {
		let data;
		try {
			data = copyData(input);
		} catch (error) {
			return failure("CRUMBS_CONTRACT_INVALID_PAYLOAD", error instanceof DataIssue ? error.path : [], error instanceof DataIssue ? error.message : "Data could not be inspected");
		}
		const result = decodeSchema(data);
		if (effect_Result.isSuccess(result)) return {
			ok: true,
			value: result.success
		};
		return schemaFailure(result.failure);
	};
	const encode = (input) => {
		const result = decode(input);
		if (!result.ok) return result;
		const encoded = encodeSchema(result.value);
		if (effect_Result.isFailure(encoded)) return schemaFailure(encoded.failure);
		return {
			ok: true,
			value: JSON.stringify(encoded.success)
		};
	};
	return {
		decode,
		encode,
		encodeUnknown: encode,
		decodeJson(input) {
			if (typeof input !== "string") return failure("CRUMBS_CONTRACT_INVALID_JSON", [], "Expected JSON text");
			let data;
			try {
				data = JSON.parse(input);
			} catch {
				return failure("CRUMBS_CONTRACT_INVALID_JSON", [], "Invalid JSON text");
			}
			return decode(data);
		}
	};
}
//#endregion
//#region src/devtools/style-explanation-schema.ts
const SafeText = effect_Schema.NonEmptyString.check(effect_Schema.makeFilter((value) => value === value.trim() && !/[\u0000-\u001f\u007f]/u.test(value)));
const Index = effect_Schema.Finite.check(effect_Schema.makeFilter((value) => Number.isSafeInteger(value) && value >= 0));
const PathSegment = effect_Schema.Union([SafeText, Index]);
const Path = effect_Schema.Array(PathSegment);
const PropertyName = effect_Schema.String.check(effect_Schema.isPattern(/^[A-Za-z][A-Za-z0-9_]*$/));
const TokenName = effect_Schema.String.check(effect_Schema.isPattern(/^--crumbs-[A-Za-z0-9_-]+$/));
const PackageName = effect_Schema.String.check(effect_Schema.isPattern(/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/));
const RelativeIdentity = SafeText.check(effect_Schema.makeFilter((value) => {
	if (value.startsWith("/") || value.includes("\\") || /^[A-Za-z]:/u.test(value) || /^file:/iu.test(value)) return false;
	return !value.split("/").some((segment) => segment === "" || segment === "." || segment === "..");
}));
const IdentityText = SafeText;
const JsonNumber = effect_Schema.Finite.check(effect_Schema.makeFilter((value) => !Object.is(value, -0)));
const NativePrimitiveKind = effect_Schema.Literals([
	"view",
	"text",
	"image"
]);
const PrimitiveDomain = effect_Schema.Array(NativePrimitiveKind).check(effect_Schema.isMinLength(1), effect_Schema.makeFilter((domain) => new Set(domain).size === domain.length));
const ContractIdentity = effect_Schema.Struct({
	owner: PackageName,
	name: IdentityText,
	version: Index.check(effect_Schema.isGreaterThan(0))
});
const ValueNodeBase = {
	$$type: effect_Schema.Literal(STYLE_EXPLANATION_VALUE_TYPE),
	version: effect_Schema.Literal(1)
};
const NegativeZeroValue = effect_Schema.Struct({
	...ValueNodeBase,
	kind: effect_Schema.Literal("negative-zero")
});
const UndefinedValue = effect_Schema.Struct({
	...ValueNodeBase,
	kind: effect_Schema.Literal("undefined")
});
const OpaqueValue = effect_Schema.Struct({
	...ValueNodeBase,
	kind: effect_Schema.Literal("opaque"),
	reason: effect_Schema.Literals([
		"accessor",
		"cycle",
		"depth-limit",
		"function",
		"symbol",
		"bigint",
		"non-finite-number",
		"unsupported-object"
	])
});
const ThemeTokenIdentity = effect_Schema.Struct({
	varName: TokenName,
	contract: effect_Schema.optionalKey(ContractIdentity)
});
function isReservedValueTag(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value) && Object.getOwnPropertyDescriptor(value, "$$type")?.value === "crumbs.css.style-explanation-value";
}
const StyleExplanationValueSchema = effect_Schema.suspend(() => effect_Schema.Union([
	effect_Schema.Null,
	effect_Schema.Boolean,
	effect_Schema.String,
	JsonNumber,
	effect_Schema.Array(StyleExplanationValueSchema),
	effect_Schema.Record(effect_Schema.String, StyleExplanationValueSchema).check(effect_Schema.makeFilter((record) => !isReservedValueTag(record))),
	NegativeZeroValue,
	UndefinedValue,
	OpaqueValue,
	effect_Schema.Struct({
		...ValueNodeBase,
		kind: effect_Schema.Literal("theme-token"),
		identity: ThemeTokenIdentity,
		resolvedValue: StyleExplanationValueSchema
	})
]));
const CoverageReason = effect_Schema.Literals([
	"metadata-missing",
	"compatibility-only",
	"opaque-value",
	"dependency-metadata-missing"
]);
const Coverage = effect_Schema.Struct({
	status: effect_Schema.Literals([
		"complete",
		"partial",
		"unavailable"
	]),
	reasons: effect_Schema.Array(CoverageReason)
}).check(effect_Schema.makeFilter((coverage) => {
	if (new Set(coverage.reasons).size !== coverage.reasons.length) return false;
	return coverage.status === "complete" ? coverage.reasons.length === 0 : coverage.reasons.length > 0;
}));
const Declaration = effect_Schema.Struct({
	id: IdentityText,
	sourceId: RelativeIdentity,
	packageOwner: PackageName,
	logicalPath: Path,
	authoredProperty: PropertyName,
	canonicalProperty: PropertyName,
	shorthandExpansionPath: effect_Schema.Array(PropertyName),
	primitiveDomain: PrimitiveDomain,
	order: Index,
	value: StyleExplanationValueSchema
});
const BranchKind = effect_Schema.Literals([
	"recipe",
	"component-recipe",
	"extension",
	"sprinkles",
	"condition",
	"expression"
]);
const BranchMetadata = effect_Schema.Struct({
	kind: BranchKind,
	path: Path,
	identity: IdentityText,
	order: Index,
	selector: effect_Schema.Record(effect_Schema.String, StyleExplanationValueSchema),
	sourceId: effect_Schema.optionalKey(RelativeIdentity)
});
const ExportMetadata = effect_Schema.Struct({
	path: Path,
	candidates: effect_Schema.Array(Declaration),
	branches: effect_Schema.Array(BranchMetadata),
	tokenDependencies: effect_Schema.Array(TokenName),
	coverage: Coverage
});
const MetadataSchema = effect_Schema.Struct({
	$$type: effect_Schema.Literal(STYLE_EXPLANATION_METADATA_TYPE),
	version: effect_Schema.Literal(1),
	moduleId: RelativeIdentity,
	exports: effect_Schema.Array(ExportMetadata)
});
const NativeConditionSnapshot = effect_Schema.Struct({
	platform: effect_Schema.Literals([
		"android",
		"ios",
		"macos",
		"visionos",
		"web",
		"windows",
		"unknown"
	]),
	widthBucket: effect_Schema.Literals([
		"compact",
		"medium",
		"expanded"
	]),
	heightBucket: effect_Schema.Literals([
		"short",
		"regular",
		"tall"
	]),
	orientation: effect_Schema.Literals(["portrait", "landscape"]),
	direction: effect_Schema.Literals(["ltr", "rtl"]),
	fontScaleBucket: effect_Schema.Literals([
		"normal",
		"large",
		"extraLarge"
	]),
	motion: effect_Schema.Literals(["full", "reduced"]),
	contrast: effect_Schema.Literals([
		"normal",
		"more",
		"less"
	])
});
const NativeConditionMatcher = effect_Schema.Struct({
	platform: effect_Schema.optionalKey(effect_Schema.Literals([
		"android",
		"ios",
		"macos",
		"visionos",
		"web",
		"windows",
		"unknown"
	])),
	widthBucket: effect_Schema.optionalKey(effect_Schema.Literals([
		"compact",
		"medium",
		"expanded"
	])),
	heightBucket: effect_Schema.optionalKey(effect_Schema.Literals([
		"short",
		"regular",
		"tall"
	])),
	orientation: effect_Schema.optionalKey(effect_Schema.Literals(["portrait", "landscape"])),
	direction: effect_Schema.optionalKey(effect_Schema.Literals(["ltr", "rtl"])),
	fontScaleBucket: effect_Schema.optionalKey(effect_Schema.Literals([
		"normal",
		"large",
		"extraLarge"
	])),
	motion: effect_Schema.optionalKey(effect_Schema.Literals(["full", "reduced"])),
	contrast: effect_Schema.optionalKey(effect_Schema.Literals([
		"normal",
		"more",
		"less"
	]))
});
const NativeConditionKey = effect_Schema.Literals([
	"platform",
	"widthBucket",
	"heightBucket",
	"orientation",
	"direction",
	"fontScaleBucket",
	"motion",
	"contrast"
]);
const CoverageReport = Coverage;
const BranchDecision = effect_Schema.Struct({
	kind: BranchKind,
	path: Path,
	identity: IdentityText,
	order: Index,
	matched: effect_Schema.Boolean,
	selected: effect_Schema.Boolean,
	reason: effect_Schema.optionalKey(effect_Schema.Literals([
		"selection-mismatch",
		"compound-mismatch",
		"state-rejected",
		"condition-unmatched",
		"not-selected",
		"superseded"
	]))
});
const ConditionDecision = effect_Schema.Struct({
	path: Path,
	identity: IdentityText,
	matcher: NativeConditionMatcher,
	matchedAxes: effect_Schema.Array(NativeConditionKey),
	specificity: Index,
	declarationOrder: Index,
	matched: effect_Schema.Boolean,
	selected: effect_Schema.Boolean
});
const ExpressionDecision = effect_Schema.Struct({
	path: Path,
	condition: NativeConditionKey,
	value: SafeText,
	selectedBranch: effect_Schema.Literals(["case", "fallback"]),
	selectedCaseValue: effect_Schema.optionalKey(SafeText)
});
const PropertyExplanation = effect_Schema.Struct({
	slot: effect_Schema.optionalKey(SafeText),
	property: PropertyName,
	value: StyleExplanationValueSchema,
	winner: effect_Schema.optionalKey(Declaration),
	overridden: effect_Schema.Array(Declaration),
	coverage: CoverageReport
});
const ChangedInput = effect_Schema.Struct({
	kind: effect_Schema.Literals([
		"theme-token",
		"theme-contract",
		"selection",
		"condition",
		"extension"
	]),
	path: Path,
	previous: effect_Schema.optionalKey(StyleExplanationValueSchema),
	current: effect_Schema.optionalKey(StyleExplanationValueSchema)
});
const Transition = effect_Schema.Struct({
	status: effect_Schema.Literals([
		"not-compared",
		"relevant-input-change",
		"no-effective-change",
		"unavailable"
	]),
	changedInputs: effect_Schema.Array(ChangedInput),
	affectedPaths: effect_Schema.Array(Path)
}).check(effect_Schema.makeFilter((value) => value.status !== "not-compared" && value.status !== "unavailable" || value.changedInputs.length === 0 && value.affectedPaths.length === 0));
const ReportSchema = effect_Schema.Struct({
	$$type: effect_Schema.Literal(STYLE_EXPLANATION_REPORT_TYPE),
	version: effect_Schema.Literal(1),
	target: effect_Schema.Struct({
		moduleId: effect_Schema.optionalKey(RelativeIdentity),
		exportPath: Path
	}),
	resolution: effect_Schema.Struct({
		value: StyleExplanationValueSchema,
		branches: effect_Schema.Array(BranchDecision)
	}),
	conditions: effect_Schema.Struct({
		snapshot: effect_Schema.optionalKey(NativeConditionSnapshot),
		decisions: effect_Schema.Array(ConditionDecision),
		expressionMatches: effect_Schema.Array(ExpressionDecision)
	}),
	composition: effect_Schema.Struct({ properties: effect_Schema.Array(PropertyExplanation) }),
	dependencies: effect_Schema.Struct({
		declaredTokens: effect_Schema.Array(TokenName),
		activeTokens: effect_Schema.Array(TokenName),
		changedTokens: effect_Schema.Array(TokenName)
	}),
	transition: Transition,
	coverage: CoverageReport
});
const metadataCodec = makeDataCodec("style-explanation-metadata-v1", MetadataSchema);
const reportCodec = makeDataCodec("style-explanation-report-v1", ReportSchema);
function decodeError(label, issues) {
	const detail = issues.map((issue) => {
		return `${issue.path.length === 0 ? "<root>" : issue.path.join(".")}: ${issue.message}`;
	}).join("; ");
	return /* @__PURE__ */ new TypeError(`Invalid ${label}: ${detail}`);
}
function decodeStyleExplanationMetadata(input) {
	const decoded = metadataCodec.decode(input);
	if (!decoded.ok) throw decodeError("Crumbs style explanation metadata v1", decoded.issues);
	const exportPaths = decoded.value.exports.map((entry) => JSON.stringify(entry.path));
	if (new Set(exportPaths).size !== exportPaths.length) throw new TypeError("Invalid Crumbs style explanation metadata v1: duplicate export path");
	return decoded.value;
}
function decodeStyleExplanationReport(input) {
	const decoded = reportCodec.decode(input);
	if (!decoded.ok) throw decodeError("Crumbs style explanation report v1", decoded.issues);
	return decoded.value;
}
//#endregion
//#region src/devtools/explain-style.ts
const TOKEN_NAME = /^--crumbs-[A-Za-z0-9_-]+$/u;
const MAX_VALUE_DEPTH = 64;
var StyleExplanationInputError = class extends TypeError {
	code;
	constructor(code, message) {
		super(message);
		this.name = "StyleExplanationInputError";
		this.code = code;
	}
};
/** Explain one explicit exported style from a transformed module namespace. */
function explainStyle(input) {
	const module = readInputField(input, "module");
	const exportPath = readInputField(input, "exportPath");
	const currentSnapshot = readInputField(input, "current");
	const normalizedPath = validateExportPath(exportPath);
	const sourceStyle = readExportPath(module, normalizedPath);
	const sidecar = readOptionalOwnData(module, "__crumbsDev");
	let metadata;
	let exportMetadata;
	if (!sidecar.present && sidecar.accessor) throw new StyleExplanationInputError("CRUMBS_EXPLANATION_INVALID_METADATA", "The style explanation sidecar must be an own data property.");
	if (sidecar.present) try {
		metadata = decodeStyleExplanationMetadata(sidecar.value);
		exportMetadata = metadata.exports.find((entry) => samePath(entry.path, normalizedPath));
		if (exportMetadata === void 0 && !isDynamicStyleDescriptor(sourceStyle)) throw new StyleExplanationInputError("CRUMBS_EXPLANATION_EXPORT_PATH_INVALID", `The style explanation sidecar does not contain export path ${formatPath(normalizedPath)}.`);
	} catch (error) {
		if (error instanceof StyleExplanationInputError) throw error;
		throw new StyleExplanationInputError("CRUMBS_EXPLANATION_INVALID_METADATA", error instanceof Error ? error.message : "The style explanation sidecar is invalid.");
	}
	const context = {
		generatedNodes: /* @__PURE__ */ new WeakSet(),
		opaqueFound: false
	};
	const currentTheme = readSnapshotTheme(currentSnapshot);
	const previousSnapshotField = readOptionalOwnData(input, "previous");
	const previousSnapshot = previousSnapshotField.present ? previousSnapshotField.value : void 0;
	const previousTheme = previousSnapshot === void 0 ? void 0 : readSnapshotTheme(previousSnapshot);
	const currentResolution = resolveStyleTarget(sourceStyle, currentSnapshot, normalizedPath, metadata, context);
	const flattened = currentResolution.flattened;
	const currentMetadata = composeExportMetadata(metadata, normalizedPath, currentResolution);
	const dependencyPlan = readDependencyPlan(module);
	const declaredTokens = [...currentMetadata?.tokenDependencies ?? []].sort();
	const activeTokens = collectActiveTokens(flattened.style, context);
	const selectedDependencyEntries = dependencyPlan?.entries.filter((entry) => samePath(entry.path, normalizedPath) || currentResolution.branches.some((branch) => branch.selected && isPathPrefix(branch.path, entry.path))) ?? [];
	const dependencyTokens = [...new Set(selectedDependencyEntries.flatMap((entry) => entry.tokens))].sort();
	const dependencyEntry = selectedDependencyEntries.length === 0 ? void 0 : {
		path: normalizedPath,
		tokens: dependencyTokens
	};
	const dependencyMetadataMissing = metadata !== void 0 && (activeTokens.some((token) => !declaredTokens.includes(token)) || declaredTokens.length > 0 && dependencyEntry === void 0 || dependencyEntry !== void 0 && !sameStrings(dependencyTokens, declaredTokens));
	const coverage = combineCoverage(metadata === void 0 ? {
		status: "unavailable",
		reasons: ["metadata-missing"]
	} : currentMetadata?.coverage ?? {
		status: "partial",
		reasons: ["compatibility-only"]
	}, [...context.opaqueFound ? ["opaque-value"] : [], ...dependencyMetadataMissing ? ["dependency-metadata-missing"] : []]);
	const resolvedStyle = resolveStyleOutput(flattened, currentResolution.slots, currentTheme);
	const encodedResolution = encodeStyleOutput(resolvedStyle, flattened.style, currentResolution.slots, currentTheme, context);
	const propertyExplanations = createStylePropertyExplanations(flattened.style, resolvedStyle, currentResolution.slots, currentMetadata, metadata, normalizedPath, currentResolution, currentTheme, context);
	const themeTransition = createThemeTransition({
		exportPath: normalizedPath,
		currentTheme,
		previousTheme,
		previousWasProvided: previousSnapshot !== void 0,
		dependencyEntry,
		dependencyMetadataMissing,
		metadataAvailable: metadata !== void 0,
		style: flattenSlotsForDependencyResolution(flattened.style, currentResolution.slots)
	}, context);
	const transition = createExplicitInputTransition({
		exportPath: normalizedPath,
		sourceStyle,
		metadata,
		currentSnapshot,
		previousSnapshot,
		currentResolution,
		currentResolvedStyle: encodedResolution,
		previousTheme,
		metadataAvailable: metadata !== void 0,
		themeTransition,
		context
	});
	const conditions = readSnapshotConditions(currentSnapshot);
	const report = {
		$$type: STYLE_EXPLANATION_REPORT_TYPE,
		version: 1,
		target: {
			...metadata === void 0 ? {} : { moduleId: metadata.moduleId },
			exportPath: normalizedPath
		},
		resolution: {
			value: encodedResolution,
			branches: currentResolution.branches
		},
		conditions: {
			...conditions === void 0 ? {} : { snapshot: conditions },
			decisions: currentResolution.conditionDecisions,
			expressionMatches: currentResolution.expressionMatches
		},
		composition: { properties: propertyExplanations },
		dependencies: {
			declaredTokens,
			activeTokens,
			changedTokens: themeTransition.changedTokens
		},
		transition,
		coverage
	};
	try {
		return deepFreeze(decodeStyleExplanationReport(report));
	} catch (error) {
		if (error instanceof StyleExplanationInputError) throw error;
		throw new StyleExplanationInputError("CRUMBS_EXPLANATION_INVALID_METADATA", error instanceof Error ? `The style explanation report could not be encoded: ${error.message}` : "The style explanation report could not be encoded.");
	}
}
function resolveStyleTarget(source, snapshot, exportPath, metadata, context) {
	const tag = readOptionalOwnData(source, "$$type");
	let flattened;
	let slots;
	let branches = [];
	if (tag.present && tag.value === "crumbs.css.recipe") {
		const recipe = cloneRuntimeValue(source, context, /* @__PURE__ */ new Set(), 0);
		if (!isPlainRecord(recipe)) return emptyTargetResolution(source, exportPath, metadata, snapshot, context);
		const plan = createRecipeResolutionPlan(recipe);
		const selection = readSnapshotSelection(snapshot);
		const selected = {
			...plan.defaultSelection,
			...selection
		};
		flattened = flattenStyle(resolveRecipeResolutionPlan(plan, selection), context);
		branches = recipeBranchDecisions(plan, selected, exportPath, metadata?.moduleId);
	} else if (tag.present && tag.value === "crumbs.css.component-recipe") {
		const recipe = cloneRuntimeValue(source, context, /* @__PURE__ */ new Set(), 0);
		if (!isPlainRecord(recipe)) return emptyTargetResolution(source, exportPath, metadata, snapshot, context);
		const plan = createComponentRecipeResolutionPlan(recipe, { extensions: readSnapshotExtensions(snapshot) });
		const selection = readSnapshotSelection(snapshot);
		const selected = {
			...plan.defaultSelection,
			...selection
		};
		const resolved = resolveComponentRecipeResolutionPlan(plan, selection);
		slots = plan.slotOrder;
		const slotStyles = emptyRecord();
		for (const slot of slots) {
			const styles = readOptionalOwnData(resolved, slot);
			setOwn(slotStyles, slot, flattenStyle(styles.present ? styles.value : [], context).style);
		}
		flattened = { style: slotStyles };
		branches = componentBranchDecisions(plan, selected, exportPath, metadata?.moduleId);
	} else if (tag.present && tag.value === "crumbs.css.sprinkles-lookup-plan") {
		const lookup = cloneRuntimeValue(source, context, /* @__PURE__ */ new Set(), 0);
		if (!isPlainRecord(lookup)) return emptyTargetResolution(source, exportPath, metadata, snapshot, context);
		const plan = createSprinklesResolutionPlan(lookup);
		const selection = readSnapshotSelection(snapshot);
		flattened = flattenStyle(resolveSprinklesLookupPlan(plan, selection), context);
		branches = sprinklesBranchDecisions(plan, selection, exportPath, metadata?.moduleId);
	} else flattened = flattenStyle(source, context);
	const conditions = readSnapshotConditions(snapshot);
	const conditionTrace = createConditionTrace(metadata, exportPath, conditions);
	const conditionBranches = conditionTrace.branches;
	const expressionMatches = collectExpressionMatches(flattened.style, exportPath, conditions, readSnapshotTheme(snapshot), context);
	branches = [
		...branches,
		...conditionBranches,
		...expressionMatches.map((match, order) => ({
			kind: "expression",
			path: match.path,
			identity: `expression:${formatPath(match.path)}:${order}`,
			order,
			matched: true,
			selected: true
		}))
	];
	return {
		flattened,
		...slots === void 0 ? {} : { slots },
		branches,
		conditionDecisions: conditionTrace.decisions,
		expressionMatches
	};
}
function isDynamicStyleDescriptor(value) {
	const tag = readOptionalOwnData(value, "$$type");
	return tag.present && (tag.value === "crumbs.css.recipe" || tag.value === "crumbs.css.component-recipe" || tag.value === "crumbs.css.sprinkles-lookup-plan");
}
function composeExportMetadata(metadata, exportPath, resolution) {
	if (metadata === void 0) return void 0;
	const root = metadata.exports.find((entry) => samePath(entry.path, exportPath));
	const related = [];
	const seen = /* @__PURE__ */ new Set();
	const add = (entry) => {
		const key = JSON.stringify(entry.path);
		if (seen.has(key)) return;
		seen.add(key);
		related.push(entry);
	};
	if (root !== void 0) add(root);
	for (const branch of resolution.branches) {
		if (!branch.selected) continue;
		const branchEntries = metadata.exports.filter((entry) => isPathPrefix(branch.path, entry.path)).sort((left, right) => comparePath(left.path, right.path));
		for (const entry of branchEntries) add(entry);
	}
	const candidates = related.flatMap((entry) => entry.candidates).map((candidate, order) => ({
		...candidate,
		order
	}));
	const tokenDependencies = [...new Set(related.flatMap((entry) => entry.tokenDependencies))].sort();
	const coverage = root?.coverage ?? {
		status: "partial",
		reasons: ["compatibility-only"]
	};
	return {
		path: exportPath,
		candidates,
		branches: root?.branches ?? [],
		tokenDependencies,
		coverage
	};
}
function emptyTargetResolution(source, exportPath, metadata, snapshot, context) {
	const flattened = flattenStyle(source, context);
	const conditions = readSnapshotConditions(snapshot);
	const conditionTrace = createConditionTrace(metadata, exportPath, conditions);
	return {
		flattened,
		branches: conditionTrace.branches,
		conditionDecisions: conditionTrace.decisions,
		expressionMatches: collectExpressionMatches(flattened.style, exportPath, conditions, readSnapshotTheme(snapshot), context)
	};
}
function recipeBranchDecisions(plan, selection, exportPath, moduleId) {
	const decisions = [];
	const add = (path, order, matched, reason) => {
		decisions.push({
			kind: "recipe",
			path,
			identity: branchIdentity(moduleId, path),
			order,
			matched,
			selected: matched,
			...reason === void 0 ? {} : { reason }
		});
	};
	if (plan.recipe.base !== void 0) add([...exportPath, "base"], 0, true);
	let order = decisions.length;
	for (const variant of plan.variants) {
		const selectedValue = selection[variant.name];
		for (const value of Object.keys(variant.values)) {
			const matched = selectedValue !== void 0 && String(selectedValue) === value;
			add([
				...exportPath,
				"variants",
				variant.name,
				value
			], order++, matched, matched ? void 0 : selectedValue === void 0 ? "not-selected" : "selection-mismatch");
		}
	}
	for (let index = 0; index < plan.compoundMatchers.length; index += 1) {
		const matched = plan.compoundMatchers[index].matches(selection);
		add([
			...exportPath,
			"compoundVariants",
			index,
			"style"
		], order++, matched, matched ? void 0 : "compound-mismatch");
	}
	return decisions;
}
function componentBranchDecisions(plan, selection, exportPath, moduleId) {
	const decisions = [];
	let order = 0;
	const stateRejected = plan.stateConstraint !== void 0 && !matchesComponentRecipeSelectedState(plan.stateConstraint, selection);
	for (const slot of plan.slotOrder) if (plan.base[slot] !== void 0) {
		const path = [
			...exportPath,
			"base",
			slot
		];
		decisions.push({
			kind: "component-recipe",
			path,
			identity: branchIdentity(moduleId, path),
			order: order++,
			matched: true,
			selected: true
		});
	}
	for (const variant of plan.variants) {
		const selectedValue = selection[variant.name];
		for (const value of Object.keys(variant.values)) {
			const matched = (typeof selectedValue === "string" || typeof selectedValue === "boolean") && String(selectedValue) === value && !stateRejected;
			const path = [
				...exportPath,
				"variants",
				variant.name,
				value
			];
			decisions.push({
				kind: "component-recipe",
				path,
				identity: branchIdentity(moduleId, path),
				order: order++,
				matched,
				selected: matched,
				...!matched ? { reason: stateRejected ? "state-rejected" : selectedValue === void 0 ? "not-selected" : "selection-mismatch" } : {}
			});
		}
	}
	for (let index = 0; index < plan.compoundMatchers.length; index += 1) {
		const matched = !stateRejected && plan.compoundMatchers[index].matches(selection);
		const path = [
			...exportPath,
			"compoundVariants",
			index
		];
		decisions.push({
			kind: "component-recipe",
			path,
			identity: branchIdentity(moduleId, path),
			order: order++,
			matched,
			selected: matched,
			...!matched ? { reason: stateRejected ? "state-rejected" : "compound-mismatch" } : {}
		});
	}
	for (let index = 0; index < (plan.extensionPlan?.extensions.length ?? 0); index += 1) {
		const extension = plan.extensionPlan.extensions[index];
		const identity = nativeComponentContractIdentityKey(extension.identity);
		const path = [
			...exportPath,
			"extensions",
			index
		];
		decisions.push({
			kind: "extension",
			path,
			identity,
			order: order++,
			matched: true,
			selected: true
		});
	}
	if (stateRejected) {
		const path = [...exportPath, "state"];
		decisions.push({
			kind: "component-recipe",
			path,
			identity: branchIdentity(moduleId, path),
			order: order++,
			matched: false,
			selected: false,
			reason: "state-rejected"
		});
	}
	return decisions;
}
function sprinklesBranchDecisions(plan, selection, exportPath, moduleId) {
	const decisions = [];
	let order = 0;
	for (const name of Object.keys(selection)) {
		const value = selection[name];
		if (value === void 0 || value === null || value === false) continue;
		const targets = Object.hasOwn(plan.properties, name) ? [name] : Object.hasOwn(plan.shorthands, name) ? plan.shorthands[name] ?? [] : [];
		for (const target of targets) {
			const path = [
				...exportPath,
				"sprinkles",
				name,
				target
			];
			decisions.push({
				kind: "sprinkles",
				path,
				identity: branchIdentity(moduleId, path),
				order: order++,
				matched: true,
				selected: true
			});
		}
	}
	return decisions;
}
function createConditionTrace(metadata, exportPath, conditions) {
	if (metadata === void 0 || conditions === void 0) return {
		branches: [],
		decisions: []
	};
	const entries = metadata.exports.flatMap((entry) => entry.branches).filter((branch) => isPathPrefix(exportPath, branch.path)).filter((branch) => branch.kind === "condition").sort((left, right) => left.order - right.order);
	const localEntries = entries.length > 0 ? entries : [];
	const candidates = localEntries.map((entry, index) => ({
		when: conditionMatcher(entry.selector),
		value: index
	}));
	if (candidates.length === 0) return {
		branches: [],
		decisions: []
	};
	const decisions = traceNativeConditionBranches(candidates, conditions, -1).decisions.map((decision, index) => {
		const entry = localEntries[index];
		const matchedAxes = Object.keys(decision.matcher).filter((axis) => decision.matcher[axis] === conditions[axis]);
		return {
			path: entry.path,
			identity: entry.identity,
			matcher: decision.matcher,
			matchedAxes,
			specificity: decision.specificity,
			declarationOrder: entry.order,
			matched: decision.matched,
			selected: decision.selected
		};
	});
	return {
		branches: decisions.map((decision, index) => {
			const entry = localEntries[index];
			return {
				kind: "condition",
				path: entry.path,
				identity: entry.identity,
				order: entry.order,
				matched: decision.matched,
				selected: decision.selected,
				...!decision.matched ? { reason: "condition-unmatched" } : !decision.selected ? { reason: "superseded" } : {}
			};
		}),
		decisions
	};
}
function conditionMatcher(selector) {
	const matcher = emptyRecord();
	for (const [key, value] of Object.entries(selector)) if (typeof value === "string") setOwn(matcher, key, value);
	return matcher;
}
function collectExpressionMatches(value, basePath, conditions, theme, context) {
	if (conditions === void 0) return [];
	const matches = [];
	const visited = /* @__PURE__ */ new Set();
	const visit = (candidate, path) => {
		if (!isObject(candidate) || visited.has(candidate)) return;
		if (isNativeExpression(candidate)) {
			try {
				const traced = evaluateNativeExpressionWithTrace(candidate, {
					conditions,
					...theme === void 0 ? {} : { tokens: theme.tokens }
				});
				for (const result of traced.matches) matches.push({
					path,
					...result
				});
			} catch {
				context.opaqueFound = true;
			}
			return;
		}
		visited.add(candidate);
		try {
			for (const key of Reflect.ownKeys(candidate)) {
				if (typeof key !== "string") continue;
				const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
				if (descriptor !== void 0 && descriptor.enumerable && "value" in descriptor) visit(descriptor.value, [...path, key]);
			}
		} catch {
			context.opaqueFound = true;
		}
	};
	visit(value, basePath);
	return matches;
}
function readSnapshotSelection(snapshot) {
	const field = readOptionalOwnData(snapshot, "selection");
	if (!field.present || field.value === void 0) return emptyRecord();
	if (!isPlainRecord(field.value)) throw new TypeError("Style explanation selection must be a plain data record");
	const selection = emptyRecord();
	for (const key of Reflect.ownKeys(field.value)) {
		if (typeof key !== "string") throw new TypeError("Style explanation selection keys must be strings");
		const descriptor = Object.getOwnPropertyDescriptor(field.value, key);
		if (descriptor === void 0 || !descriptor.enumerable || !("value" in descriptor)) throw new TypeError("Style explanation selection must contain enumerable data properties");
		if (descriptor.value !== null && descriptor.value !== void 0 && typeof descriptor.value !== "string" && typeof descriptor.value !== "boolean" && typeof descriptor.value !== "number") throw new TypeError("Style explanation selection values must be primitive variant values");
		setOwn(selection, key, descriptor.value);
	}
	return selection;
}
function readSnapshotExtensions(snapshot) {
	const field = readOptionalOwnData(snapshot, "extensions");
	if (!field.present || field.value === void 0) return [];
	const extensions = readSafeArray(field.value);
	if (extensions === void 0) throw new TypeError("Style explanation extensions must be a dense data array");
	return extensions;
}
function branchIdentity(moduleId, path) {
	return `${moduleId ?? "export"}#${formatPath(path)}`;
}
function resolveStyleOutput(flattened, slots, theme) {
	if (flattened.rootOpaque !== void 0) return flattened.rootOpaque;
	if (slots === void 0) return theme === void 0 ? flattened.style : resolveThemeTokens(flattened.style, theme) ?? emptyRecord();
	const output = emptyRecord();
	for (const slot of slots) {
		const style = readOptionalOwnData(flattened.style, slot);
		const slotStyle = style.present && isPlainRecord(style.value) ? style.value : emptyRecord();
		setOwn(output, slot, theme === void 0 ? slotStyle : resolveThemeTokens(slotStyle, theme) ?? emptyRecord());
	}
	return output;
}
function flattenSlotsForDependencyResolution(style, slots) {
	if (slots === void 0) return style;
	const flattened = emptyRecord();
	for (const slot of slots) {
		const slotField = readOptionalOwnData(style, slot);
		if (!slotField.present || !isPlainRecord(slotField.value)) continue;
		for (const property of Object.keys(slotField.value)) {
			const descriptor = Object.getOwnPropertyDescriptor(slotField.value, property);
			if (descriptor !== void 0 && "value" in descriptor) setOwn(flattened, `${slot}.${property}`, descriptor.value);
		}
	}
	return flattened;
}
function encodeStyleOutput(resolvedStyle, originalStyle, slots, theme, context) {
	if (slots === void 0 || !isPlainRecord(resolvedStyle)) return encodeResolvedStyle(resolvedStyle, originalStyle, theme, context);
	const output = emptyRecord();
	for (const slot of slots) {
		const original = readOptionalOwnData(originalStyle, slot);
		const resolved = readOptionalOwnData(resolvedStyle, slot);
		setOwn(output, slot, encodeResolvedStyle(resolved.present ? resolved.value : emptyRecord(), original.present && isPlainRecord(original.value) ? original.value : emptyRecord(), theme, context));
	}
	return output;
}
function createStylePropertyExplanations(originalStyle, resolvedStyle, slots, metadata, allMetadata, exportPath, resolution, theme, context) {
	if (slots === void 0 || !isPlainRecord(resolvedStyle)) return createPropertyExplanations(originalStyle, resolvedStyle, metadata, theme, context);
	return slots.flatMap((slot) => {
		const original = readOptionalOwnData(originalStyle, slot);
		const resolved = readOptionalOwnData(resolvedStyle, slot);
		if (!resolved.present || !isPlainRecord(resolved.value)) return [];
		const slotMetadata = composeSlotMetadata(allMetadata, exportPath, slot, resolution);
		return createPropertyExplanations(original.present && isPlainRecord(original.value) ? original.value : emptyRecord(), resolved.value, slotMetadata ?? metadata, theme, context).map((property) => ({
			...property,
			slot
		}));
	});
}
function composeSlotMetadata(metadata, exportPath, slot, resolution) {
	if (metadata === void 0) return void 0;
	const selectedEntries = [];
	const seen = /* @__PURE__ */ new Set();
	for (const branch of resolution.branches) {
		if (!branch.selected) continue;
		const entries = metadata.exports.filter((entry) => isPathPrefix(branch.path, entry.path) && entry.path.slice(exportPath.length).includes(slot)).sort((left, right) => comparePath(left.path, right.path));
		for (const entry of entries) {
			const key = JSON.stringify(entry.path);
			if (seen.has(key)) continue;
			seen.add(key);
			selectedEntries.push(entry);
		}
	}
	const root = metadata.exports.find((entry) => samePath(entry.path, exportPath));
	return {
		path: [...exportPath, slot],
		candidates: selectedEntries.flatMap((entry) => entry.candidates).map((candidate, order) => ({
			...candidate,
			order
		})),
		branches: [],
		tokenDependencies: [...new Set(selectedEntries.flatMap((entry) => entry.tokenDependencies))].sort(),
		coverage: root?.coverage ?? {
			status: "partial",
			reasons: ["compatibility-only"]
		}
	};
}
function createExplicitInputTransition(args) {
	if (args.previousSnapshot === void 0) return args.themeTransition.report;
	const changedInputs = compareExplicitInputs(args.previousSnapshot, args.currentSnapshot, args.context);
	if (changedInputs.length === 0) return args.themeTransition.report;
	if (!args.metadataAvailable) return {
		status: "unavailable",
		changedInputs: [],
		affectedPaths: []
	};
	const previousResolution = resolveStyleTarget(args.sourceStyle, args.previousSnapshot, args.exportPath, args.metadata, args.context);
	const effectiveChange = resolutionFingerprint(encodeStyleOutput(resolveStyleOutput(previousResolution.flattened, previousResolution.slots, args.previousTheme), previousResolution.flattened.style, previousResolution.slots, args.previousTheme, args.context), previousResolution) !== resolutionFingerprint(args.currentResolvedStyle, args.currentResolution);
	const combined = [...args.themeTransition.report.changedInputs, ...changedInputs].sort(compareChangedInputs);
	return {
		status: effectiveChange ? "relevant-input-change" : "no-effective-change",
		changedInputs: combined,
		affectedPaths: effectiveChange ? [Object.freeze([...args.exportPath])] : []
	};
}
function compareExplicitInputs(previous, current, context) {
	const changes = [];
	for (const [kind, field] of [["selection", "selection"], ["condition", "conditions"]]) {
		const before = readSnapshotRecord(previous, field);
		const after = readSnapshotRecord(current, field);
		for (const key of [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()) {
			const previousValue = readOptionalOwnData(before, key);
			const currentValue = readOptionalOwnData(after, key);
			if (!previousValue.present && !currentValue.present || previousValue.present && currentValue.present && Object.is(previousValue.value, currentValue.value)) continue;
			changes.push({
				kind,
				path: [key],
				previous: encodeValue(previousValue.present ? previousValue.value : void 0, context, /* @__PURE__ */ new Set(), 0),
				current: encodeValue(currentValue.present ? currentValue.value : void 0, context, /* @__PURE__ */ new Set(), 0)
			});
		}
	}
	const beforeExtensions = extensionIdentities(previous);
	const afterExtensions = extensionIdentities(current);
	if (JSON.stringify(beforeExtensions) !== JSON.stringify(afterExtensions)) changes.push({
		kind: "extension",
		path: ["extensions"],
		previous: encodeValue(beforeExtensions, context, /* @__PURE__ */ new Set(), 0),
		current: encodeValue(afterExtensions, context, /* @__PURE__ */ new Set(), 0)
	});
	return changes.sort(compareChangedInputs);
}
function readSnapshotRecord(snapshot, fieldName) {
	const field = readOptionalOwnData(snapshot, fieldName);
	if (!field.present || !isPlainRecord(field.value)) return emptyRecord();
	const result = emptyRecord();
	for (const key of Object.keys(field.value)) {
		const entry = readOptionalOwnData(field.value, key);
		if (entry.present) setOwn(result, key, entry.value);
	}
	return result;
}
function extensionIdentities(snapshot) {
	return readSnapshotExtensions(snapshot).map((extension, index) => {
		const identity = readOptionalOwnData(extension, "identity");
		if (!identity.present) return `invalid-extension-${index}`;
		const owner = readOptionalOwnData(identity.value, "owner");
		const name = readOptionalOwnData(identity.value, "name");
		const version = readOptionalOwnData(identity.value, "version");
		if (!owner.present || !name.present || !version.present || typeof owner.value !== "string" || typeof name.value !== "string" || typeof version.value !== "number") return `invalid-extension-${index}`;
		return nativeComponentContractIdentityKey({
			owner: owner.value,
			name: name.value,
			version: version.value
		});
	});
}
function compareChangedInputs(left, right) {
	return left.kind.localeCompare(right.kind) || formatPath(left.path).localeCompare(formatPath(right.path));
}
function resolutionFingerprint(value, resolution) {
	return JSON.stringify({
		value,
		branches: resolution.branches.map((branch) => [
			branch.kind,
			branch.identity,
			branch.selected
		]),
		conditions: resolution.conditionDecisions.map((decision) => [decision.identity, decision.selected]),
		expressions: resolution.expressionMatches.map((match) => [
			match.path,
			match.value,
			match.selectedBranch,
			match.selectedCaseValue
		])
	});
}
function readInputField(input, key) {
	const field = readOptionalOwnData(input, key);
	if (!field.present) throw new StyleExplanationInputError("CRUMBS_EXPLANATION_INVALID_METADATA", `Missing own data field "${key}".`);
	return field.value;
}
function validateExportPath(value) {
	const segments = readSafeArray(value);
	if (segments === void 0 || segments.length === 0 || segments.some((segment) => typeof segment === "string" && segment.length === 0 || typeof segment === "number" && (!Number.isSafeInteger(segment) || segment < 0) || typeof segment !== "string" && typeof segment !== "number")) throw new StyleExplanationInputError("CRUMBS_EXPLANATION_EXPORT_PATH_INVALID", "The style explanation export path must be a non-empty array of non-empty strings and non-negative safe integers.");
	return Object.freeze([...segments]);
}
function readExportPath(module, path) {
	if (!isObject(module) || Array.isArray(module)) invalidExportPath(path);
	let value = module;
	for (const segment of path) {
		const next = readOptionalOwnData(value, segment);
		if (!next.present) invalidExportPath(path);
		value = next.value;
	}
	return value;
}
function invalidExportPath(path) {
	throw new StyleExplanationInputError("CRUMBS_EXPLANATION_EXPORT_PATH_INVALID", `The module has no safe own-data export at ${formatPath(path)}.`);
}
function readOptionalOwnData(value, key) {
	if (!isObject(value)) return { present: false };
	try {
		const descriptor = Object.getOwnPropertyDescriptor(value, key);
		if (descriptor === void 0) return { present: false };
		if (!("value" in descriptor)) return {
			present: false,
			accessor: true
		};
		return {
			present: true,
			value: descriptor.value
		};
	} catch {
		return { present: false };
	}
}
function readSafeArray(value) {
	if (!Array.isArray(value)) return void 0;
	try {
		const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
		if (lengthDescriptor === void 0 || !("value" in lengthDescriptor) || !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0 || lengthDescriptor.value > 1e5) return;
		const result = [];
		for (let index = 0; index < lengthDescriptor.value; index += 1) {
			const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
			if (descriptor === void 0 || !("value" in descriptor) || !descriptor.enumerable) return void 0;
			result.push(descriptor.value);
		}
		return result;
	} catch {
		return;
	}
}
function flattenStyle(input, context) {
	const style = emptyRecord();
	const ancestors = /* @__PURE__ */ new Set();
	const flatten = (value, depth) => {
		if (value === null || value === void 0 || value === false) return void 0;
		if (depth >= MAX_VALUE_DEPTH) return opaqueNode(context, "depth-limit");
		if (typeof value === "function") return opaqueNode(context, "function");
		if (typeof value === "symbol") return opaqueNode(context, "symbol");
		if (typeof value === "bigint") return opaqueNode(context, "bigint");
		if (typeof value !== "object") return opaqueNode(context, "unsupported-object");
		if (ancestors.has(value)) return opaqueNode(context, "cycle");
		let prototype;
		let keys;
		try {
			prototype = Object.getPrototypeOf(value);
			keys = Reflect.ownKeys(value);
		} catch {
			return opaqueNode(context, "unsupported-object");
		}
		if (Array.isArray(value)) {
			const entries = readSafeArray(value);
			if (entries === void 0 || keys.length !== entries.length + 1) return opaqueNode(context, "unsupported-object");
			ancestors.add(value);
			try {
				for (const entry of entries) {
					const result = flatten(entry, depth + 1);
					if (result !== void 0) {
						if (isOpaqueNode(result, context)) return result;
						mergeStyle(style, result);
					}
				}
			} finally {
				ancestors.delete(value);
			}
			return;
		}
		if (prototype !== Object.prototype && prototype !== null) return opaqueNode(context, "unsupported-object");
		ancestors.add(value);
		try {
			for (const key of keys) {
				if (typeof key !== "string") {
					context.opaqueFound = true;
					continue;
				}
				const descriptor = Object.getOwnPropertyDescriptor(value, key);
				if (descriptor === void 0 || !descriptor.enumerable) continue;
				if (!("value" in descriptor)) {
					setOwn(style, key, opaqueNode(context, "accessor"));
					continue;
				}
				setOwn(style, key, cloneRuntimeValue(descriptor.value, context, ancestors, depth + 1));
			}
		} catch {
			return opaqueNode(context, "unsupported-object");
		} finally {
			ancestors.delete(value);
		}
	};
	const rootOpaque = flatten(input, 0);
	return rootOpaque === void 0 ? { style } : {
		style,
		rootOpaque
	};
}
function cloneRuntimeValue(value, context, ancestors, depth) {
	if (value === null || value === void 0 || typeof value === "string" || typeof value === "boolean" || typeof value === "number") return value;
	if (typeof value === "function") return opaqueNode(context, "function");
	if (typeof value === "symbol") return opaqueNode(context, "symbol");
	if (typeof value === "bigint") return opaqueNode(context, "bigint");
	if (!isObject(value)) return opaqueNode(context, "unsupported-object");
	if (depth >= MAX_VALUE_DEPTH) return opaqueNode(context, "depth-limit");
	if (ancestors.has(value)) return opaqueNode(context, "cycle");
	const token = readTokenReference(value);
	if (token.kind === "valid") return token.reference;
	if (token.kind === "invalid") return opaqueNode(context, token.reason);
	let prototype;
	let keys;
	try {
		prototype = Object.getPrototypeOf(value);
		keys = Reflect.ownKeys(value);
	} catch {
		return opaqueNode(context, "unsupported-object");
	}
	if (prototype !== Object.prototype && prototype !== null && prototype !== Array.prototype) return opaqueNode(context, "unsupported-object");
	if (keys.some((key) => typeof key !== "string")) return opaqueNode(context, "symbol");
	ancestors.add(value);
	try {
		if (Array.isArray(value)) {
			const entries = readSafeArray(value);
			if (entries === void 0 || keys.length !== entries.length + 1) return opaqueNode(context, "unsupported-object");
			return entries.map((entry) => cloneRuntimeValue(entry, context, ancestors, depth + 1));
		}
		const output = emptyRecord();
		for (const key of keys) {
			const descriptor = Object.getOwnPropertyDescriptor(value, key);
			if (descriptor === void 0 || !descriptor.enumerable) continue;
			setOwn(output, key, "value" in descriptor ? cloneRuntimeValue(descriptor.value, context, ancestors, depth + 1) : opaqueNode(context, "accessor"));
		}
		return output;
	} catch {
		return opaqueNode(context, "unsupported-object");
	} finally {
		ancestors.delete(value);
	}
}
function readTokenReference(value) {
	let keys;
	let prototype;
	let tagDescriptor;
	try {
		const descriptor = Object.getOwnPropertyDescriptor(value, "$$type");
		if (descriptor === void 0) return { kind: "none" };
		tagDescriptor = descriptor;
		if (!("value" in tagDescriptor)) return {
			kind: "invalid",
			reason: "accessor"
		};
		if (tagDescriptor.value !== "crumbs.css.theme-token") return { kind: "none" };
		keys = Reflect.ownKeys(value);
		prototype = Object.getPrototypeOf(value);
	} catch {
		return {
			kind: "invalid",
			reason: "unsupported-object"
		};
	}
	const nameDescriptor = Object.getOwnPropertyDescriptor(value, "varName");
	if (prototype !== Object.prototype && prototype !== null) return {
		kind: "invalid",
		reason: "unsupported-object"
	};
	if (keys.length !== 2 || nameDescriptor === void 0 || !("value" in nameDescriptor) || !nameDescriptor.enumerable || !tagDescriptor.enumerable || typeof nameDescriptor.value !== "string" || !TOKEN_NAME.test(nameDescriptor.value)) return {
		kind: "invalid",
		reason: nameDescriptor !== void 0 && !("value" in nameDescriptor) ? "accessor" : "unsupported-object"
	};
	const reference = emptyRecord();
	setOwn(reference, "$$type", NativeThemeTokenReferenceType);
	setOwn(reference, "varName", nameDescriptor.value);
	return {
		kind: "valid",
		reference
	};
}
function readSnapshotTheme(snapshot) {
	const themeField = readOptionalOwnData(snapshot, "theme");
	if (!themeField.present || !isObject(themeField.value) || Array.isArray(themeField.value)) return void 0;
	const contractField = readOptionalOwnData(themeField.value, "contract");
	const tokensField = readOptionalOwnData(themeField.value, "tokens");
	if (!contractField.present || !tokensField.present || !isPlainRecord(tokensField.value)) return void 0;
	const tokens = emptyRecord();
	try {
		for (const key of Reflect.ownKeys(tokensField.value)) {
			if (typeof key !== "string") return void 0;
			const descriptor = Object.getOwnPropertyDescriptor(tokensField.value, key);
			if (descriptor === void 0 || !descriptor.enumerable || !("value" in descriptor) || typeof descriptor.value !== "string" && typeof descriptor.value !== "number") return void 0;
			setOwn(tokens, key, descriptor.value);
		}
	} catch {
		return;
	}
	return {
		contract: contractField.value,
		tokens,
		values: {}
	};
}
function readSnapshotConditions(snapshot) {
	const field = readOptionalOwnData(snapshot, "conditions");
	if (!field.present || field.value === void 0) return void 0;
	if (!isPlainRecord(field.value)) return void 0;
	const result = emptyRecord();
	try {
		for (const key of Reflect.ownKeys(field.value)) {
			if (typeof key !== "string") return void 0;
			const descriptor = Object.getOwnPropertyDescriptor(field.value, key);
			if (descriptor === void 0 || !descriptor.enumerable || !("value" in descriptor)) return void 0;
			setOwn(result, key, descriptor.value);
		}
	} catch {
		return;
	}
	return result;
}
function readDependencyPlan(module) {
	const moduleDescriptor = readOptionalOwnData(module, "__crumbsModule");
	if (!moduleDescriptor.present || !isPlainRecord(moduleDescriptor.value)) return void 0;
	const descriptor = moduleDescriptor.value;
	const tag = readOptionalOwnData(descriptor, "$$type");
	const version = readOptionalOwnData(descriptor, "version");
	const planField = readOptionalOwnData(descriptor, "dependencyPlan");
	if (!tag.present || tag.value !== "crumbs.css.native-module" || !version.present || version.value !== 2 || !planField.present || !isPlainRecord(planField.value)) return void 0;
	const planTag = readOptionalOwnData(planField.value, "$$type");
	const planVersion = readOptionalOwnData(planField.value, "version");
	const entriesField = readOptionalOwnData(planField.value, "entries");
	if (!planTag.present || planTag.value !== "crumbs.css.theme-dependency-plan" || !planVersion.present || planVersion.value !== 1 || !entriesField.present) return void 0;
	const entries = readSafeArray(entriesField.value);
	if (entries === void 0) return void 0;
	const copied = [];
	for (const entry of entries) {
		if (!isPlainRecord(entry)) return void 0;
		const path = readOptionalOwnData(entry, "path");
		const tokens = readOptionalOwnData(entry, "tokens");
		const safePath = readSafeArray(path.present ? path.value : void 0);
		const safeTokens = readSafeArray(tokens.present ? tokens.value : void 0);
		if (safePath === void 0 || safeTokens === void 0 || safePath.some((segment) => typeof segment !== "string" && typeof segment !== "number") || safeTokens.some((token) => typeof token !== "string")) return void 0;
		copied.push({
			path: safePath,
			tokens: safeTokens
		});
	}
	try {
		return createThemeDependencyPlan(copied);
	} catch {
		return;
	}
}
function collectActiveTokens(style, context) {
	const tokens = /* @__PURE__ */ new Set();
	const visited = /* @__PURE__ */ new Set();
	const visit = (value) => {
		if (!isObject(value) || visited.has(value)) return;
		const token = readTokenReference(value);
		if (token.kind === "valid") {
			const name = readOptionalOwnData(token.reference, "varName");
			if (name.present && typeof name.value === "string") tokens.add(name.value);
			return;
		}
		visited.add(value);
		try {
			for (const key of Reflect.ownKeys(value)) {
				if (typeof key !== "string") {
					context.opaqueFound = true;
					continue;
				}
				const descriptor = Object.getOwnPropertyDescriptor(value, key);
				if (descriptor !== void 0 && descriptor.enumerable && "value" in descriptor) visit(descriptor.value);
			}
		} catch {
			context.opaqueFound = true;
			return;
		}
	};
	visit(style);
	return [...tokens].sort();
}
function encodeResolvedStyle(value, originalStyle, theme, context) {
	if (isStyleValueNode(value, context)) return value;
	if (!isPlainRecord(value)) return encodeValue(value, context, /* @__PURE__ */ new Set(), 0);
	const output = emptyRecord();
	for (const key of Object.keys(value).sort()) {
		const descriptor = Object.getOwnPropertyDescriptor(value, key);
		if (descriptor === void 0 || !("value" in descriptor)) {
			setOwn(output, key, opaqueNode(context, "accessor"));
			continue;
		}
		const original = readOptionalOwnData(originalStyle, key);
		const token = original.present && isObject(original.value) ? readTokenReference(original.value) : { kind: "none" };
		if (token.kind === "valid" && theme !== void 0) {
			const varName = readOptionalOwnData(token.reference, "varName");
			const contract = safeContractIdentity(theme.contract);
			const resolvedValue = encodeValue(descriptor.value, context, /* @__PURE__ */ new Set(), 0);
			setOwn(output, key, styleValueNode(context, {
				kind: "theme-token",
				identity: {
					varName: varName.present ? varName.value : "",
					...contract === void 0 ? {} : { contract: encodeValue(contract, context, /* @__PURE__ */ new Set(), 0) }
				},
				resolvedValue
			}));
		} else setOwn(output, key, encodeValue(descriptor.value, context, /* @__PURE__ */ new Set(), 0));
	}
	return output;
}
function createPropertyExplanations(originalStyle, resolvedStyle, metadata, theme, context) {
	if (!isPlainRecord(resolvedStyle)) return [];
	const byProperty = /* @__PURE__ */ new Map();
	for (const candidate of metadata?.candidates ?? []) {
		const declarations = byProperty.get(candidate.canonicalProperty) ?? [];
		declarations.push(candidate);
		byProperty.set(candidate.canonicalProperty, declarations);
	}
	return Object.keys(resolvedStyle).sort().map((property) => {
		const descriptor = Object.getOwnPropertyDescriptor(resolvedStyle, property);
		const value = descriptor !== void 0 && "value" in descriptor ? encodeResolvedStyle({ [property]: descriptor.value }, originalStyle, theme, context) : opaqueNode(context, "accessor");
		const propertyValue = isPlainRecord(value) ? readOptionalOwnData(value, property) : {
			present: true,
			value
		};
		const declarations = [...byProperty.get(property) ?? []].sort((left, right) => left.order - right.order);
		const baseCoverage = metadata?.coverage ?? {
			status: "unavailable",
			reasons: ["metadata-missing"]
		};
		const encodedValue = propertyValue.present ? propertyValue.value : opaqueNode(context, "unsupported-object");
		const propertyHasOpaque = containsOpaque(encodedValue);
		return {
			property,
			value: encodedValue,
			...declarations.length === 0 ? {} : { winner: declarations.at(-1) },
			overridden: declarations.slice(0, -1),
			coverage: combineCoverage(baseCoverage, propertyHasOpaque ? ["opaque-value"] : [])
		};
	});
}
function createThemeTransition(args, context) {
	if (!args.metadataAvailable) return {
		report: {
			status: "unavailable",
			changedInputs: [],
			affectedPaths: []
		},
		changedTokens: []
	};
	if (!args.previousWasProvided) return {
		report: {
			status: "not-compared",
			changedInputs: [],
			affectedPaths: []
		},
		changedTokens: []
	};
	if (args.currentTheme === void 0 || args.previousTheme === void 0 || args.dependencyMetadataMissing) return {
		report: {
			status: "unavailable",
			changedInputs: [],
			affectedPaths: []
		},
		changedTokens: []
	};
	const changedInputs = compareThemeInputs(args.previousTheme, args.currentTheme, context);
	const plan = createThemeDependencyPlan([{
		path: ["style"],
		tokens: args.dependencyEntry?.tokens ?? []
	}]);
	const resolver = createThemeDependencyResolver({ style: args.style }, plan);
	resolver.resolve(args.previousTheme);
	const resolution = resolver.resolve(args.currentTheme);
	const changedTokens = resolution.metrics.changedTokens;
	const affectedPaths = changedTokens.length === 0 ? [] : [Object.freeze([...args.exportPath])];
	return {
		report: {
			status: resolution.metrics.notifications > 0 ? "relevant-input-change" : "no-effective-change",
			changedInputs,
			affectedPaths
		},
		changedTokens
	};
}
function compareThemeInputs(previous, current, context) {
	if (previous.contract !== current.contract) {
		const previousIdentity = safeContractIdentity(previous.contract);
		const currentIdentity = safeContractIdentity(current.contract);
		return [{
			kind: "theme-contract",
			path: ["contract"],
			...previousIdentity === void 0 ? {} : { previous: encodeValue(previousIdentity, context, /* @__PURE__ */ new Set(), 0) },
			...currentIdentity === void 0 ? {} : { current: encodeValue(currentIdentity, context, /* @__PURE__ */ new Set(), 0) }
		}];
	}
	const names = new Set([...Object.keys(previous.tokens), ...Object.keys(current.tokens)]);
	const changed = [];
	for (const token of [...names].sort()) {
		const previousValue = readOptionalOwnData(previous.tokens, token);
		const currentValue = readOptionalOwnData(current.tokens, token);
		const previousRaw = previousValue.present ? previousValue.value : void 0;
		const currentRaw = currentValue.present ? currentValue.value : void 0;
		if (previousValue.present === currentValue.present && Object.is(previousRaw, currentRaw)) continue;
		changed.push({
			kind: "theme-token",
			path: [token],
			previous: encodeValue(previousValue.present ? previousValue.value : void 0, context, /* @__PURE__ */ new Set(), 0),
			current: encodeValue(currentValue.present ? currentValue.value : void 0, context, /* @__PURE__ */ new Set(), 0)
		});
	}
	return changed;
}
function safeContractIdentity(contract) {
	try {
		return getThemeContractIdentity(contract);
	} catch {
		return;
	}
}
function encodeValue(value, context, ancestors, depth) {
	if (value === void 0) return styleValueNode(context, { kind: "undefined" });
	if (value === null || typeof value === "string" || typeof value === "boolean") return value;
	if (typeof value === "number") {
		if (!Number.isFinite(value)) return opaqueNode(context, "non-finite-number");
		return Object.is(value, -0) ? styleValueNode(context, { kind: "negative-zero" }) : value;
	}
	if (typeof value === "function") return opaqueNode(context, "function");
	if (typeof value === "symbol") return opaqueNode(context, "symbol");
	if (typeof value === "bigint") return opaqueNode(context, "bigint");
	if (!isObject(value)) return opaqueNode(context, "unsupported-object");
	if (context.generatedNodes.has(value)) return value;
	if (depth >= MAX_VALUE_DEPTH) return opaqueNode(context, "depth-limit");
	if (ancestors.has(value)) return opaqueNode(context, "cycle");
	let prototype;
	let keys;
	try {
		prototype = Object.getPrototypeOf(value);
		keys = Reflect.ownKeys(value);
	} catch {
		return opaqueNode(context, "unsupported-object");
	}
	if (prototype !== Object.prototype && prototype !== null && prototype !== Array.prototype) return opaqueNode(context, "unsupported-object");
	if (keys.some((key) => typeof key !== "string")) return opaqueNode(context, "symbol");
	ancestors.add(value);
	try {
		if (Array.isArray(value)) {
			const entries = readSafeArray(value);
			if (entries === void 0 || keys.length !== entries.length + 1) return opaqueNode(context, "unsupported-object");
			return entries.map((entry) => encodeValue(entry, context, ancestors, depth + 1));
		}
		const result = emptyRecord();
		for (const key of keys) {
			const descriptor = Object.getOwnPropertyDescriptor(value, key);
			if (descriptor === void 0 || !descriptor.enumerable) continue;
			setOwn(result, key, "value" in descriptor ? encodeValue(descriptor.value, context, ancestors, depth + 1) : opaqueNode(context, "accessor"));
		}
		return result;
	} catch {
		return opaqueNode(context, "unsupported-object");
	} finally {
		ancestors.delete(value);
	}
}
function styleValueNode(context, node) {
	const value = {
		$$type: STYLE_EXPLANATION_VALUE_TYPE,
		version: 1,
		...node
	};
	context.generatedNodes.add(value);
	return value;
}
function opaqueNode(context, reason) {
	context.opaqueFound = true;
	return styleValueNode(context, {
		kind: "opaque",
		reason
	});
}
function isStyleValueNode(value, context) {
	return isObject(value) && context.generatedNodes.has(value);
}
function isOpaqueNode(value, context) {
	return isStyleValueNode(value, context) && value.kind === "opaque";
}
function containsOpaque(value) {
	if (value !== null && typeof value === "object") {
		if ("kind" in value && value.kind === "opaque") return true;
		return Object.values(value).some((child) => containsOpaque(child));
	}
	return false;
}
function combineCoverage(base, extraReasons) {
	const reasons = [...new Set([...base.reasons, ...extraReasons])].sort();
	if (base.status === "unavailable") return {
		status: "unavailable",
		reasons
	};
	if (base.status === "partial" || reasons.length > 0) return {
		status: "partial",
		reasons
	};
	return {
		status: "complete",
		reasons: []
	};
}
function mergeStyle(target, source) {
	for (const key of Object.keys(source)) {
		const descriptor = Object.getOwnPropertyDescriptor(source, key);
		if (descriptor !== void 0 && "value" in descriptor) setOwn(target, key, descriptor.value);
	}
}
function setOwn(target, key, value) {
	Object.defineProperty(target, key, {
		value,
		enumerable: true,
		configurable: true,
		writable: true
	});
}
function emptyRecord() {
	return Object.create(null);
}
function isObject(value) {
	return typeof value === "object" && value !== null;
}
function isPlainRecord(value) {
	if (!isObject(value) || Array.isArray(value)) return false;
	try {
		const prototype = Object.getPrototypeOf(value);
		return prototype === Object.prototype || prototype === null;
	} catch {
		return false;
	}
}
function samePath(left, right) {
	return left.length === right.length && left.every((segment, index) => segment === right[index]);
}
function comparePath(left, right) {
	const length = Math.min(left.length, right.length);
	for (let index = 0; index < length; index += 1) {
		const a = left[index];
		const b = right[index];
		const order = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b));
		if (order !== 0) return order;
	}
	return left.length - right.length;
}
function isPathPrefix(prefix, path) {
	return prefix.length <= path.length && prefix.every((segment, index) => segment === path[index]);
}
function sameStrings(left, right) {
	return left.length === right.length && left.every((value, index) => value === right[index]);
}
function formatPath(path) {
	return path.map((segment) => typeof segment === "number" ? `[${segment}]` : segment).join(".");
}
function deepFreeze(value, visited = /* @__PURE__ */ new Set()) {
	if (!isObject(value) || visited.has(value)) return value;
	visited.add(value);
	for (const key of Reflect.ownKeys(value)) {
		const descriptor = Object.getOwnPropertyDescriptor(value, key);
		if (descriptor !== void 0 && "value" in descriptor) deepFreeze(descriptor.value, visited);
	}
	return Object.freeze(value);
}
//#endregion
exports.STYLE_EXPLANATION_METADATA_TYPE = STYLE_EXPLANATION_METADATA_TYPE;
exports.STYLE_EXPLANATION_REPORT_TYPE = STYLE_EXPLANATION_REPORT_TYPE;
exports.STYLE_EXPLANATION_VALUE_TYPE = STYLE_EXPLANATION_VALUE_TYPE;
exports.STYLE_EXPLANATION_VERSION = STYLE_EXPLANATION_VERSION;
exports.StyleExplanationInputError = StyleExplanationInputError;
exports.explainStyle = explainStyle;
