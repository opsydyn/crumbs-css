//#region src/expressions/index.ts
/**
* Versioned, inspectable native expression data. Expression nodes contain no
* closures, React values or runtime services, so a compiler can serialise and
* analyse them before a later evaluator is introduced.
*/
const NativeExpressionType = "crumbs.css.expression";
const NativeExpressionVersion = 1;
const NativeExpressionProgramType = "crumbs.css.expression-program";
const NativeExpressionProgramVersion = 1;
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
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function assertRecord(value, message) {
	if (!isRecord(value)) throw new TypeError(message);
}
function assertExactKeys(value, keys) {
	const allowed = new Set(keys);
	for (const key of Object.keys(value)) if (!allowed.has(key)) throw new TypeError(`Unsupported native expression field: ${key}`);
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
function freezeDependencies(dependencies) {
	const unique = /* @__PURE__ */ new Map();
	for (const dependency of dependencies) {
		const key = nativeExpressionDependencyKey(dependency);
		if (!unique.has(key)) unique.set(key, Object.freeze({ ...dependency }));
	}
	return Object.freeze([...unique.entries()].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([, dependency]) => dependency));
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
function mergeDependencies(...dependencies) {
	return freezeDependencies(dependencies.flat());
}
function domainKey(domain) {
	switch (domain.kind) {
		case "number": return "number:unitless";
		case "length": return `length:px:${domain.allowNegative ? "negative" : "nonnegative"}`;
		case "duration": return "duration:ms";
		case "opacity": return "opacity:fraction";
		case "color": return "color:native";
		case "enum": return `enum:${domain.values.join("|")}`;
	}
}
function nativeExpressionDomainKey(domain) {
	return domainKey(createNativeExpressionDomain(domain));
}
function assertDomainInput(value) {
	assertRecord(value, "native expression domain must be an object");
	if (typeof value.kind !== "string") throw new TypeError("native expression domain kind is required");
	switch (value.kind) {
		case "number":
			assertExactKeys(value, ["kind", "unit"]);
			if (value.unit !== "unitless") throw new TypeError("number domains use unitless");
			return;
		case "length":
			assertExactKeys(value, [
				"kind",
				"unit",
				"allowNegative"
			]);
			if (value.unit !== "px") throw new TypeError("length domains use px");
			if (typeof value.allowNegative !== "boolean") throw new TypeError("length domain allowNegative must be a boolean");
			return;
		case "duration":
			assertExactKeys(value, ["kind", "unit"]);
			if (value.unit !== "ms") throw new TypeError("duration domains use ms");
			return;
		case "opacity":
			assertExactKeys(value, ["kind", "unit"]);
			if (value.unit !== "fraction") throw new TypeError("opacity domains use fraction");
			return;
		case "color":
			assertExactKeys(value, ["kind", "format"]);
			if (value.format !== "native") throw new TypeError("color domains use native format");
			return;
		case "enum":
			assertExactKeys(value, ["kind", "values"]);
			if (!Array.isArray(value.values) || value.values.length === 0) throw new TypeError("enum domains need at least one value");
			if (value.values.some((entry) => typeof entry !== "string" || entry.trim().length === 0)) throw new TypeError("enum domain values must be non-empty strings");
			if (new Set(value.values).size !== value.values.length) throw new TypeError("enum domain values must be unique");
			return;
		default: throw new TypeError("Unsupported native expression domain");
	}
}
function createNativeExpressionDomain(input) {
	assertDomainInput(input);
	if (input.kind === "enum") {
		const values = Object.freeze([...input.values].sort());
		return Object.freeze({
			...input,
			values
		});
	}
	return Object.freeze({ ...input });
}
function assertExpression(value) {
	if (!isNativeExpression(value)) throw new TypeError("native expression node is invalid");
}
function assertSameDomain(left, right) {
	if (domainKey(left.domain) !== domainKey(right.domain)) throw new TypeError("expression domains must match");
}
function assertNumericDomain(domain) {
	if (![
		"number",
		"length",
		"duration",
		"opacity"
	].includes(domain.kind)) throw new TypeError("scalar operation requires a numeric expression domain");
}
function assertAdditiveDomain(domain) {
	if (![
		"number",
		"length",
		"duration"
	].includes(domain.kind)) throw new TypeError("add only supports number, length, and duration domains");
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
function makeNode(node) {
	return Object.freeze(node);
}
function createNativeExpressionLiteral(domain, value) {
	const canonicalDomain = createNativeExpressionDomain(domain);
	assertLiteralValue(canonicalDomain, value);
	return makeNode({
		$$type: NativeExpressionType,
		version: 1,
		kind: "literal",
		domain: canonicalDomain,
		value,
		dependencies: Object.freeze([])
	});
}
function createNativeExpressionTokenReference(token, domain) {
	const name = nonEmptyString(token, "token reference name must be non-empty");
	return makeNode({
		$$type: NativeExpressionType,
		version: 1,
		kind: "token-reference",
		domain: createNativeExpressionDomain(domain),
		token: name,
		dependencies: freezeDependencies([tokenDependency(name)])
	});
}
function createNativeExpressionConditionReference(condition) {
	if (typeof condition !== "string" || !Object.prototype.hasOwnProperty.call(CONDITION_VALUES, condition)) throw new TypeError(`Unsupported native condition: ${String(condition)}`);
	return makeNode({
		$$type: NativeExpressionType,
		version: 1,
		kind: "condition-reference",
		domain: createNativeExpressionDomain({
			kind: "enum",
			values: CONDITION_VALUES[condition]
		}),
		condition,
		dependencies: freezeDependencies([conditionDependency(condition)])
	});
}
function createNativeExpressionAlias(name, expression) {
	const alias = nonEmptyString(name, "alias name must be non-empty");
	assertExpression(expression);
	return makeNode({
		$$type: NativeExpressionType,
		version: 1,
		kind: "alias",
		domain: expression.domain,
		name: alias,
		expression,
		dependencies: expression.dependencies
	});
}
function createNativeExpressionFallback(primary, fallback) {
	assertExpression(primary);
	assertExpression(fallback);
	assertSameDomain(primary, fallback);
	return makeNode({
		$$type: NativeExpressionType,
		version: 1,
		kind: "fallback",
		domain: primary.domain,
		primary,
		fallback,
		onMissing: "use-fallback",
		dependencies: mergeDependencies(primary.dependencies, fallback.dependencies)
	});
}
function createNativeExpressionCompose(expressions) {
	if (expressions.length === 0) throw new TypeError("composition needs at least one expression");
	const [first, ...rest] = expressions;
	assertExpression(first);
	for (const expression of rest) {
		assertExpression(expression);
		assertSameDomain(first, expression);
	}
	return makeNode({
		$$type: NativeExpressionType,
		version: 1,
		kind: "compose",
		domain: first.domain,
		expressions: Object.freeze([...expressions]),
		order: "left-to-right",
		dependencies: mergeDependencies(...expressions.map((expression) => expression.dependencies))
	});
}
function createNativeExpressionAdd(left, right) {
	assertExpression(left);
	assertExpression(right);
	assertAdditiveDomain(left.domain);
	assertSameDomain(left, right);
	return makeNode({
		$$type: NativeExpressionType,
		version: 1,
		kind: "add",
		domain: left.domain,
		left,
		right,
		dependencies: mergeDependencies(left.dependencies, right.dependencies)
	});
}
function createNativeExpressionSubtract(left, right) {
	assertExpression(left);
	assertExpression(right);
	assertAdditiveDomain(left.domain);
	assertSameDomain(left, right);
	return makeNode({
		$$type: NativeExpressionType,
		version: 1,
		kind: "subtract",
		domain: left.domain,
		left,
		right,
		dependencies: mergeDependencies(left.dependencies, right.dependencies)
	});
}
function createNativeExpressionScale(expression, factor) {
	assertExpression(expression);
	assertNumericDomain(expression.domain);
	finiteNumber(factor, "scale factor must be finite");
	return makeNode({
		$$type: NativeExpressionType,
		version: 1,
		kind: "scale",
		domain: expression.domain,
		expression,
		factor,
		dependencies: expression.dependencies
	});
}
function createNativeExpressionClamp(expression, minimum, maximum) {
	assertExpression(expression);
	assertNumericDomain(expression.domain);
	finiteNumber(minimum, "clamp minimum must be finite");
	finiteNumber(maximum, "clamp maximum must be finite");
	if (minimum > maximum) throw new TypeError("clamp minimum must not exceed maximum");
	if (expression.domain.kind === "opacity" && (minimum < 0 || maximum > 1)) throw new TypeError("opacity clamp bounds must be between 0 and 1");
	return makeNode({
		$$type: NativeExpressionType,
		version: 1,
		kind: "clamp",
		domain: expression.domain,
		expression,
		minimum,
		maximum,
		dependencies: expression.dependencies
	});
}
function createNativeExpressionMatch(options) {
	if (typeof options.condition !== "string" || !Object.prototype.hasOwnProperty.call(CONDITION_VALUES, options.condition)) throw new TypeError(`Unsupported native condition: ${String(options.condition)}`);
	const values = CONDITION_VALUES[options.condition];
	if (!Array.isArray(options.cases) || options.cases.length === 0) throw new TypeError("exhaustive match needs at least one case");
	const allowed = new Set(values);
	const seen = /* @__PURE__ */ new Set();
	const cases = options.cases.map((entry) => {
		assertRecord(entry, "exhaustive match case must be an object");
		assertExactKeys(entry, ["value", "expression"]);
		if (!allowed.has(entry.value)) throw new TypeError("invalid exhaustive match case");
		const value = entry.value;
		if (seen.has(value)) throw new TypeError("duplicate exhaustive match case");
		seen.add(value);
		assertExpression(entry.expression);
		return {
			value,
			expression: entry.expression
		};
	});
	const [firstCase] = cases;
	if (!firstCase) throw new TypeError("exhaustive match needs at least one case");
	for (const entry of cases.slice(1)) assertSameDomain(firstCase.expression, entry.expression);
	if (options.fallback !== void 0) {
		assertExpression(options.fallback);
		assertSameDomain(firstCase.expression, options.fallback);
	} else if (seen.size !== values.length) {
		const missing = values.filter((value) => !seen.has(value));
		throw new TypeError(`exhaustive match is missing cases: ${missing.join(", ")}`);
	}
	const sortedCases = Object.freeze([...cases].sort((left, right) => values.indexOf(left.value) - values.indexOf(right.value)));
	const output = {
		$$type: NativeExpressionType,
		version: 1,
		kind: "match",
		domain: firstCase.expression.domain,
		condition: options.condition,
		cases: sortedCases,
		exhaustive: true,
		dependencies: mergeDependencies([conditionDependency(options.condition)], ...cases.map((entry) => entry.expression.dependencies), ...options.fallback === void 0 ? [] : [options.fallback.dependencies])
	};
	if (options.fallback !== void 0) Object.assign(output, { fallback: options.fallback });
	return makeNode(output);
}
function createNativeExpressionProgram(root) {
	assertExpression(root);
	return Object.freeze({
		$$type: NativeExpressionProgramType,
		version: 1,
		root,
		dependencies: root.dependencies
	});
}
function nativeExpressionDependencyKey(dependency) {
	if (dependency.kind === "token") return `token:${dependency.name}`;
	return `condition:${dependency.key}`;
}
function isNativeExpression(value) {
	if (!isRecord(value)) return false;
	return value.$$type === "crumbs.css.expression" && value.version === 1 && typeof value.kind === "string" && NODE_KINDS.includes(value.kind) && isRecord(value.domain) && Array.isArray(value.dependencies);
}
function isNativeExpressionProgram(value) {
	if (!isRecord(value)) return false;
	return value.$$type === "crumbs.css.expression-program" && value.version === 1 && isNativeExpression(value.root) && Array.isArray(value.dependencies);
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
	if (!isRecord(value)) throw evaluationError("invalid-input", message);
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
function evaluateNativeExpression(expression, state) {
	assertExpression(expression);
	return evaluateNode(expression, normalizeEvaluationState(state));
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
function foldNode(expression) {
	switch (expression.kind) {
		case "literal":
		case "token-reference":
		case "condition-reference": return expression;
		case "alias": return createNativeExpressionAlias(expression.name, foldChild(expression.expression));
		case "fallback": return createNativeExpressionFallback(foldChild(expression.primary), foldChild(expression.fallback));
		case "compose": return createNativeExpressionCompose(expression.expressions.map((entry) => foldChild(entry)));
		case "add": return createNativeExpressionAdd(foldChild(expression.left), foldChild(expression.right));
		case "subtract": return createNativeExpressionSubtract(foldChild(expression.left), foldChild(expression.right));
		case "scale": return createNativeExpressionScale(foldChild(expression.expression), expression.factor);
		case "clamp": return createNativeExpressionClamp(foldChild(expression.expression), expression.minimum, expression.maximum);
		case "match": {
			const cases = expression.cases.map((entry) => ({
				value: entry.value,
				expression: foldChild(entry.expression)
			}));
			return createNativeExpressionMatch({
				condition: expression.condition,
				cases,
				...expression.fallback === void 0 ? {} : { fallback: foldChild(expression.fallback) }
			});
		}
	}
}
function foldChild(expression) {
	const folded = foldNode(expression);
	if (folded.dependencies.length === 0 && folded.kind !== "literal") {
		const value = evaluateNativeExpression(folded, { conditions: DEFAULT_EVALUATION_CONDITIONS });
		return createNativeExpressionLiteral(folded.domain, value);
	}
	return folded;
}
function foldNativeExpression(expression) {
	assertExpression(expression);
	const folded = foldNode(expression);
	if (folded.dependencies.length === 0) {
		const value = evaluateNativeExpression(folded, { conditions: DEFAULT_EVALUATION_CONDITIONS });
		return createNativeExpressionLiteral(folded.domain, value);
	}
	return folded;
}
function dependencySetsEqual(left, right) {
	if (left.length !== right.length) return false;
	return left.every((dependency, index) => nativeExpressionDependencyKey(dependency) === nativeExpressionDependencyKey(right[index]));
}
function dependencyChanged(dependency, previous, next) {
	if (dependency.kind === "condition") return previous.conditions[dependency.key] !== next.conditions[dependency.key];
	const previousTokens = previous.tokens ?? {};
	const nextTokens = next.tokens ?? {};
	const previousPresent = Object.hasOwn(previousTokens, dependency.name) && previousTokens[dependency.name] !== void 0;
	if (previousPresent !== (Object.hasOwn(nextTokens, dependency.name) && nextTokens[dependency.name] !== void 0)) return true;
	return previousPresent && !Object.is(previousTokens[dependency.name], nextTokens[dependency.name]);
}
function createNativeExpressionRuntime(program, initialState) {
	if (!isNativeExpressionProgram(program)) throw evaluationError("invalid-input", "native expression program is invalid");
	if (!dependencySetsEqual(program.dependencies, program.root.dependencies)) throw evaluationError("invalid-input", "program dependencies do not match its root");
	const root = foldNativeExpression(program.root);
	const dependencies = root.dependencies;
	let currentState = normalizeEvaluationState(initialState);
	let currentValue = evaluateNativeExpression(root, currentState);
	let evaluations = 1;
	let skipped = 0;
	let disposed = false;
	return {
		getValue: () => currentValue,
		getState: () => currentState,
		getStats: () => Object.freeze({
			evaluations,
			skipped,
			declaredDependencies: dependencies,
			disposed
		}),
		update(nextState) {
			if (disposed) throw new Error("native expression runtime has been disposed");
			const normalized = normalizeEvaluationState(nextState);
			if (!dependencies.some((dependency) => dependencyChanged(dependency, currentState, normalized))) {
				currentState = normalized;
				skipped += 1;
				return false;
			}
			const nextValue = evaluateNativeExpression(root, normalized);
			currentState = normalized;
			currentValue = nextValue;
			evaluations += 1;
			return true;
		},
		dispose() {
			disposed = true;
		}
	};
}
//#endregion
export { NativeExpressionEvaluationError, NativeExpressionProgramType, NativeExpressionProgramVersion, NativeExpressionType, NativeExpressionVersion, createNativeExpressionAdd, createNativeExpressionAlias, createNativeExpressionClamp, createNativeExpressionCompose, createNativeExpressionConditionReference, createNativeExpressionDomain, createNativeExpressionFallback, createNativeExpressionLiteral, createNativeExpressionMatch, createNativeExpressionProgram, createNativeExpressionRuntime, createNativeExpressionScale, createNativeExpressionSubtract, createNativeExpressionTokenReference, evaluateNativeExpression, evaluateNativeExpressionWithTrace, foldNativeExpression, isNativeExpression, isNativeExpressionProgram, nativeExpressionDependencyKey, nativeExpressionDomainKey };
