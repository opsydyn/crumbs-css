Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
//#region src/extensions/error.ts
const codes = new Set([
	"extension.invalid-config",
	"extension.invalid-argument",
	"extension.resource-limit",
	"extension.build-only-call",
	"extension.unsupported-version",
	"extension.unresolved-import",
	"extension.invalid-factory",
	"extension.invalid-result"
]);
function safeExtensionPath(path) {
	return typeof path === "string" ? path.replace(/[\x00-\x1f\x7f]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0")).slice(0, 256) : "<extension>";
}
var ExtensionError = class extends Error {
	name = "ExtensionError";
	code;
	path;
	constructor(code, path, reason) {
		const admitted = typeof code === "string" && codes.has(code) ? code : "extension.invalid-config";
		const safePath = safeExtensionPath(path);
		super(`${admitted} at ${safePath}: ${typeof reason === "string" ? reason : "invalid extension input"}`);
		this.code = admitted;
		this.path = safePath;
	}
};
//#endregion
//#region src/extensions/admission.ts
const reserved = new Set("await break case catch class const continue debugger default delete do else enum export extends false finally for function if implements import in instanceof interface let new null package private protected public return static super switch this throw true try typeof var void while with yield eval arguments".split(" "));
const builtins = new Set("assert async_hooks buffer child_process cluster console constants crypto dgram diagnostics_channel dns domain events fs http http2 https inspector module net os path perf_hooks process punycode querystring readline repl sqlite stream string_decoder sys timers tls trace_events tty url util v8 vm wasi worker_threads zlib".split(" "));
function extensionFailure(path, reason) {
	throw new ExtensionError("extension.invalid-argument", path, reason);
}
function extensionLimit(path) {
	throw new ExtensionError("extension.resource-limit", path, "portable data limit exceeded");
}
/** Descriptor-only read: no accessors or hidden keys are accepted. */
function extensionDataProperties(value, path) {
	const fields = Object.getOwnPropertyDescriptors(value);
	if (Object.getOwnPropertySymbols(value).length) extensionFailure(path, "symbol fields");
	for (const [key, d] of Object.entries(fields)) if (!("value" in d) || !d.enumerable && !(Array.isArray(value) && key === "length")) extensionFailure(path, "expected own enumerable data");
	return fields;
}
function admitExtensionConfig(input) {
	const invalid = () => {
		throw new ExtensionError("extension.invalid-config", "config", "expected explicit package path and named factory");
	};
	if (!input || typeof input !== "object" || Array.isArray(input)) return invalid();
	const proto = Object.getPrototypeOf(input);
	if (proto !== Object.prototype && proto !== null) return invalid();
	let fields;
	try {
		fields = extensionDataProperties(input, "config");
	} catch {
		return invalid();
	}
	if (Object.keys(fields).length !== 2 || !fields.importPath || !fields.importName) return invalid();
	const p = fields.importPath.value, n = fields.importName.value;
	if (typeof p !== "string" || typeof n !== "string" || p.length > 512 || n.length > 128 || reserved.has(n) || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(n)) return invalid();
	const parts = p.split("/"), count = p.startsWith("@") ? 2 : 1, packageParts = parts.slice(0, count);
	if (packageParts.length !== count || packageParts.some((part, index) => !/^[a-z0-9][a-z0-9._-]*$/.test(index === 0 && count === 2 ? part.slice(1) : part)) || packageParts.join("/").length > 214 || builtins.has(parts[0])) return invalid();
	if (parts.slice(count).some((part) => !/^[A-Za-z0-9._-]+$/.test(part) || part === "." || part === "..")) return invalid();
	return Object.freeze({
		importPath: p,
		importName: n
	});
}
/** Copies ordinary admitted data. The compiler bridges its known evaluator realm first. */
function copyExtensionArguments(args, path) {
	if (args.length > 16) extensionLimit(path);
	let visited = 1, characters = 0;
	const active = /* @__PURE__ */ new Set();
	function addCharacters(count, p) {
		characters += count;
		if (characters > 65536) extensionLimit(p);
	}
	function copy(value, depth, p) {
		if (++visited > 4096) extensionLimit(p);
		if (typeof value === "string") {
			if (value.length > 16384) extensionLimit(p);
			addCharacters(value.length, p);
			return value;
		}
		if (value === null || value === void 0 || typeof value === "boolean") return value;
		if (typeof value === "number") {
			if (!Number.isFinite(value)) extensionFailure(p, "finite number required");
			return value;
		}
		if (typeof value !== "object") extensionFailure(p, "portable data required");
		if (active.has(value)) extensionFailure(p, "cyclic data");
		if (depth > 32) extensionLimit(p);
		const array = Array.isArray(value), proto = Object.getPrototypeOf(value);
		if (array ? proto !== Array.prototype : proto !== null && proto !== Object.prototype) extensionFailure(p, "ordinary prototype required");
		const fields = extensionDataProperties(value, p), keys = Object.keys(fields).filter((k) => !(array && k === "length"));
		if (keys.length > 256) extensionLimit(p);
		if (array && (keys.length !== value.length || keys.some((k, i) => k !== String(i)))) extensionFailure(p, "dense undecorated array required");
		active.add(value);
		const out = array ? [] : Object.create(proto === null ? null : Object.prototype);
		try {
			for (const key of keys) {
				if (key.length > 128) extensionLimit(p);
				if (!array) addCharacters(key.length, p);
				Object.defineProperty(out, key, {
					value: copy(fields[key].value, depth + 1, `${p}[${JSON.stringify(key)}]`),
					enumerable: true,
					writable: true,
					configurable: true
				});
			}
		} finally {
			active.delete(value);
		}
		return Object.freeze(out);
	}
	const fields = extensionDataProperties(args, path);
	if (Object.getPrototypeOf(args) !== Array.prototype || Object.keys(fields).length !== args.length + 1) extensionFailure(path, "ordinary argument tuple required");
	const out = [];
	for (let i = 0; i < args.length; i++) {
		const d = fields[String(i)];
		if (!d) extensionFailure(path, "dense argument tuple required");
		out.push(copy(d.value, 1, `${path}[${i}]`));
	}
	return Object.freeze(out);
}
//#endregion
//#region src/extensions/model.ts
const RuntimeExtensionSymbol = Symbol.for("crumbs.css.runtime-extension");
//#endregion
//#region src/extensions/factory.ts
function defineExtension(..._proof) {
	return Object.freeze({ factory(config) {
		const endpoint = admitExtensionConfig(config);
		return (...args) => {
			const descriptor = Object.freeze({
				$$type: "crumbs.css.runtime-extension",
				version: 1,
				...endpoint,
				args: copyExtensionArguments(args, "args")
			});
			const placeholder = () => {
				throw new ExtensionError("extension.build-only-call", "extension", "compile this placeholder through a .css.ts module");
			};
			Object.defineProperty(placeholder, RuntimeExtensionSymbol, {
				value: descriptor,
				enumerable: false,
				writable: false,
				configurable: false
			});
			return Object.freeze(placeholder);
		};
	} });
}
//#endregion
exports.ExtensionError = ExtensionError;
exports.defineExtension = defineExtension;
