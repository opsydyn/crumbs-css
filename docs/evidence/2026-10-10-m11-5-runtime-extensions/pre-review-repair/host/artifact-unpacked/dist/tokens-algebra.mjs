//#region src/token-algebra/error.ts
/** Stable codes cross package boundaries; messages never include submitted values. */
var TokenAlgebraError = class extends TypeError {
	code;
	constructor(code) {
		const safe = typeof code === "string" && [
			"algebra.invalid-color",
			"algebra.invalid-typography",
			"algebra.invalid-option",
			"algebra.invalid-descriptor",
			"algebra.out-of-range"
		].includes(code) ? code : "algebra.invalid-option";
		super(`Token algebra rejected input (${safe}).`);
		this.name = "TokenAlgebraError";
		this.code = safe;
	}
};
function reject(code) {
	throw new TokenAlgebraError(code);
}
//#endregion
//#region src/token-algebra/admission.ts
const canonical = (n) => n === 0 ? 0 : n;
/** Descriptor-first extraction; never execute a caller accessor. */
function record(value, required, optional, code) {
	if (value === null || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) reject(code);
	const keys = Reflect.ownKeys(value);
	if (keys.length < required.length || keys.length > required.length + optional.length) reject(code);
	const result = Object.create(null);
	for (const key of keys) {
		if (typeof key !== "string" || !required.includes(key) && !optional.includes(key)) reject(code);
		const d = Object.getOwnPropertyDescriptor(value, key);
		if (!d || !d.enumerable || !("value" in d) || d.value === void 0) reject(code);
		Object.defineProperty(result, key, {
			value: d.value,
			enumerable: true
		});
	}
	if (required.some((k) => !Object.hasOwn(result, k))) reject(code);
	return result;
}
function numeric(value, code) {
	if (typeof value !== "number") reject(code);
	if (!Number.isFinite(value)) reject("algebra.out-of-range");
	return canonical(value);
}
function fraction(value, code) {
	const n = numeric(value, code);
	if (n < 0 || n > 1) reject("algebra.out-of-range");
	return n;
}
function positive(value, code) {
	const n = numeric(value, code);
	if (n <= 0) reject("algebra.out-of-range");
	return n;
}
function metric(value, positiveOnly, code) {
	const n = numeric(value, code), f = Math.fround(n);
	if (!Number.isFinite(f) || positiveOnly && (n <= 0 || f <= 0)) reject("algebra.out-of-range");
	return n;
}
function components(value, code) {
	if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) reject(code);
	const keys = Reflect.ownKeys(value);
	if (keys.length !== 4 || keys.some((k) => ![
		"0",
		"1",
		"2",
		"length"
	].includes(k))) reject(code);
	const length = Object.getOwnPropertyDescriptor(value, "length");
	if (!length || !("value" in length) || length.value !== 3 || length.enumerable || length.configurable) reject(code);
	const numbers = [];
	for (const key of [
		"0",
		"1",
		"2"
	]) {
		const d = Object.getOwnPropertyDescriptor(value, key);
		if (!d || !d.enumerable || !("value" in d)) reject(code);
		numbers.push(fraction(d.value, code));
	}
	return [
		numbers[0],
		numbers[1],
		numbers[2]
	];
}
function colorOperand(value) {
	const code = "algebra.invalid-descriptor";
	const r = record(value, [
		"$$type",
		"version",
		"space",
		"components",
		"alpha"
	], [], code);
	if (r.$$type !== "crumbs.css.algebra-color" || r.version !== 1 || r.space !== "srgb") reject(code);
	return {
		components: components(r.components, code),
		alpha: fraction(r.alpha, code)
	};
}
function publishColor(rgb, alpha) {
	return Object.freeze({
		$$type: "crumbs.css.algebra-color",
		version: 1,
		space: "srgb",
		components: Object.freeze([
			canonical(rgb[0]),
			canonical(rgb[1]),
			canonical(rgb[2])
		]),
		alpha: canonical(alpha)
	});
}
function typographyOperand(value) {
	const code = "algebra.invalid-descriptor";
	const r = record(value, [
		"$$type",
		"version",
		"unit",
		"fontSize",
		"lineHeight",
		"letterSpacing"
	], [], code);
	if (r.$$type !== "crumbs.css.typography" || r.version !== 1 || r.unit !== "native") reject(code);
	return {
		fontSize: metric(r.fontSize, true, code),
		lineHeight: metric(r.lineHeight, true, code),
		letterSpacing: metric(r.letterSpacing, false, code)
	};
}
function publishTypography(fontSize, lineHeight, letterSpacing) {
	return Object.freeze({
		$$type: "crumbs.css.typography",
		version: 1,
		unit: "native",
		fontSize: metric(fontSize, true, "algebra.invalid-typography"),
		lineHeight: metric(lineHeight, true, "algebra.invalid-typography"),
		letterSpacing: metric(letterSpacing, false, "algebra.invalid-typography")
	});
}
//#endregion
//#region src/token-algebra/color.ts
function createColor(input) {
	const code = "algebra.invalid-color";
	if (typeof input === "string") {
		if (input.length > 9 || !/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(input)) reject(code);
		let hex = input.slice(1);
		if (hex.length < 5) hex = [...hex].map((c) => c + c).join("");
		if (hex.length === 6) hex += "ff";
		const bytes = [
			0,
			2,
			4,
			6
		].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
		return publishColor([
			bytes[0],
			bytes[1],
			bytes[2]
		], bytes[3]);
	}
	const r = record(input, ["space", "components"], ["alpha"], code);
	if (r.space !== "srgb") reject(code);
	return publishColor(components(r.components, code), Object.hasOwn(r, "alpha") ? fraction(r.alpha, code) : 1);
}
const decode = (c) => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
const encode = (c) => c <= .0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - .055;
function roundoff(n) {
	if (!Number.isFinite(n) || n < -8 * Number.EPSILON || n > 1 + 8 * Number.EPSILON) reject("algebra.out-of-range");
	return canonical(Math.max(0, Math.min(1, n)));
}
function mixColor(left, right, options) {
	const l = colorOperand(left), r = colorOperand(right), o = record(options, ["ratio", "space"], [], "algebra.invalid-option");
	const t = fraction(o.ratio, "algebra.invalid-option");
	if (o.space !== "srgb" && o.space !== "srgb-linear") reject("algebra.invalid-option");
	if (t === 0) return publishColor(l.components, l.alpha);
	if (t === 1) return publishColor(r.components, r.alpha);
	const a0 = (1 - t) * l.alpha, a1 = t * r.alpha, alpha = roundoff(a0 + a1);
	if (alpha === 0) return publishColor([
		0,
		0,
		0
	], 0);
	return publishColor(l.components.map((c, i) => {
		const other = r.components[i];
		const mixed = (a0 * (o.space === "srgb" ? c : decode(c)) + a1 * (o.space === "srgb" ? other : decode(other))) / alpha;
		return roundoff(o.space === "srgb" ? mixed : encode(mixed));
	}), alpha);
}
function setColorAlpha(value, alpha) {
	return publishColor(colorOperand(value).components, fraction(alpha, "algebra.invalid-option"));
}
function multiplyColorAlpha(value, factor) {
	const c = colorOperand(value);
	return publishColor(c.components, c.alpha * fraction(factor, "algebra.invalid-option"));
}
function toNativeColor(value) {
	const c = colorOperand(value);
	return "#" + [...c.components, c.alpha].map((n) => Math.round(n * 255).toString(16).padStart(2, "0")).join("");
}
//#endregion
//#region src/token-algebra/typography.ts
function createTypography(input) {
	const code = "algebra.invalid-typography";
	const r = record(input, ["fontSize", "lineHeight"], ["letterSpacing"], code);
	const fontSize = metric(r.fontSize, true, code);
	const l = record(r.lineHeight, [], ["ratio", "value"], code);
	const keys = Object.keys(l);
	if (keys.length !== 1) reject(code);
	return publishTypography(fontSize, keys[0] === "ratio" ? fontSize * positive(l.ratio, code) : positive(l.value, code), Object.hasOwn(r, "letterSpacing") ? metric(r.letterSpacing, false, code) : 0);
}
function scaleTypography(value, factor) {
	const v = typographyOperand(value), f = positive(factor, "algebra.invalid-option");
	return publishTypography(v.fontSize * f, v.lineHeight * f, v.letterSpacing * f);
}
function createTypographyScale(base, options) {
	const value = typographyOperand(base), code = "algebra.invalid-option";
	const o = record(options, ["ratio", "steps"], [], code), ratio = positive(o.ratio, code);
	if (o.steps === null || typeof o.steps !== "object") reject(code);
	const names = Reflect.ownKeys(o.steps);
	if (names.length < 1 || names.length > 32 || names.some((n) => typeof n !== "string" || !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(n))) reject(code);
	const steps = record(o.steps, names, [], code);
	const admitted = names.sort().map((name) => {
		const step = numeric(steps[name], code);
		if (!Number.isInteger(step)) reject(code);
		if (step < -16 || step > 16) reject("algebra.out-of-range");
		const factor = positive(ratio ** step, code);
		return [name, publishTypography(value.fontSize * factor, value.lineHeight * factor, value.letterSpacing * factor)];
	});
	return Object.freeze(Object.fromEntries(admitted));
}
function toNativeTypography(value) {
	return Object.freeze(typographyOperand(value));
}
//#endregion
export { TokenAlgebraError, createColor, createTypography, createTypographyScale, mixColor, multiplyColorAlpha, scaleTypography, setColorAlpha, toNativeColor, toNativeTypography };
