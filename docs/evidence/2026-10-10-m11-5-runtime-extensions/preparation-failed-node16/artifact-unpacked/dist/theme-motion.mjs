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
//#region src/motion/definition.ts
const channels = Object.freeze([
	"opacity",
	"translateX",
	"translateY",
	"scale",
	"scaleX",
	"scaleY"
]);
const easings = new Set([
	"linear",
	"ease-in",
	"ease-out",
	"ease-in-out"
]);
function motionError(code, path, message) {
	throw new Error(formatNativeStylesDiagnostic(code, `${path}: ${message}`));
}
function motionRecord(input, fields, code, path) {
	if (typeof input !== "object" || input === null || Array.isArray(input) || ![null, Object.prototype].includes(Object.getPrototypeOf(input))) return motionError(code, path, "expected plain data record");
	const keys = Reflect.ownKeys(input);
	if (fields && (keys.length !== fields.length || fields.some((k) => !Object.hasOwn(input, k)))) return motionError(code, path, "unexpected or missing fields");
	const data = Object.create(null);
	for (const key of keys) {
		const d = Object.getOwnPropertyDescriptor(input, key);
		if (typeof key !== "string" || !d || !("value" in d) || !d.enumerable) return motionError(code, path, "expected own enumerable data fields");
		Object.defineProperty(data, key, {
			value: d.value,
			enumerable: true
		});
	}
	return data;
}
function validateMotionChannel(channel, input) {
	if (typeof input !== "number" || !Number.isFinite(input) || (channel === "opacity" ? input < 0 || input > 1 : !Number.isFinite(Math.fround(input)))) return motionError(NativeStylesDiagnosticCode.InvalidMotionDefinition, `motion.channel.${channel}`, "expected finite native channel value");
	return input === 0 ? 0 : input;
}
function validateMotionDuration(input) {
	if (typeof input !== "number" || !Number.isFinite(input) || input < 0 || input > 6e4) return motionError(NativeStylesDiagnosticCode.InvalidMotionDefinition, "motion.duration", "expected finite milliseconds from 0 to 60000");
	return input === 0 ? 0 : input;
}
function build(statesInput, transitionInput, frozen) {
	const code = NativeStylesDiagnosticCode.InvalidMotionDefinition, states = motionRecord(statesInput, void 0, code, "motion.states"), names = Object.keys(states);
	if (names.length < 1 || names.length > 16) return motionError(code, "motion.states", "expected 1–16 states");
	const transition = motionRecord(transitionInput, ["duration", "easing"], code, "motion.transition");
	if (frozen && (!Object.isFrozen(statesInput) || !Object.isFrozen(transitionInput))) return motionError(code, "motion", "definition data must be completely frozen");
	if (typeof transition.easing !== "string" || !easings.has(transition.easing)) return motionError(code, "motion.easing", "unsupported easing");
	const duration = validateMotionDuration(transition.duration), copy = Object.create(null);
	let keys;
	for (const name of names) {
		if (name.length > 64 || !/^[A-Za-z][A-Za-z0-9._-]*$/.test(name) || [
			"__proto__",
			"prototype",
			"constructor"
		].includes(name)) return motionError(code, "motion.states", "invalid state name");
		const raw = states[name], target = motionRecord(raw, void 0, code, `motion.states.${name}`), actual = Object.keys(target);
		if (frozen && !Object.isFrozen(raw)) return motionError(code, `motion.states.${name}`, "target must be frozen");
		if (actual.length < 1 || actual.some((k) => !channels.includes(k)) || keys && (actual.length !== keys.length || keys.some((k) => !Object.hasOwn(target, k)))) return motionError(code, `motion.states.${name}`, "states require the same nonempty supported channels");
		keys ??= actual;
		const next = Object.create(null);
		for (const channel of channels) if (Object.hasOwn(target, channel)) next[channel] = validateMotionChannel(channel, target[channel]);
		copy[name] = Object.freeze(next);
	}
	return Object.freeze({
		$$type: "crumbs.css.motion-definition",
		formatVersion: 1,
		states: Object.freeze(copy),
		transition: Object.freeze({
			duration,
			easing: transition.easing
		})
	});
}
const admitted = /* @__PURE__ */ new WeakMap();
function defineMotion(input) {
	const x = motionRecord(input, ["states", "transition"], NativeStylesDiagnosticCode.InvalidMotionDefinition, "motion");
	const d = build(x.states, x.transition, false);
	admitted.set(d, d);
	return d;
}
//#endregion
export { defineMotion };
