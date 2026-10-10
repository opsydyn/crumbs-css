Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let react = require("react");
let react_native = require("react-native");
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
function admitMotionDefinition(input) {
	if (typeof input === "object" && input !== null) {
		const found = admitted.get(input);
		if (found) return found;
	}
	const x = motionRecord(input, [
		"$$type",
		"formatVersion",
		"states",
		"transition"
	], NativeStylesDiagnosticCode.InvalidMotionDefinition, "motion");
	if (x.$$type !== "crumbs.css.motion-definition") return motionError(NativeStylesDiagnosticCode.InvalidMotionDefinition, "motion", "invalid definition tag");
	if (x.formatVersion !== 1) return motionError(NativeStylesDiagnosticCode.MotionUnsupportedVersion, "motion.formatVersion", "unsupported definition format");
	if (!Object.isFrozen(input)) return motionError(NativeStylesDiagnosticCode.InvalidMotionDefinition, "motion", "definition must be frozen");
	const d = build(x.states, x.transition, true);
	admitted.set(input, d);
	return d;
}
function motionChannels(definition) {
	const d = admitMotionDefinition(definition);
	const first = d.states[Object.keys(d.states)[0]];
	return Object.freeze(channels.filter((k) => Object.hasOwn(first, k)));
}
//#endregion
//#region src/motion/policy.ts
function admitMotionTarget(definition, input) {
	const d = admitMotionDefinition(definition);
	if (typeof input !== "string" || !Object.hasOwn(d.states, input)) return motionError(NativeStylesDiagnosticCode.InvalidMotionTarget, "motion.target", "expected known state name");
	return input;
}
function admitMotionOptions(definition, input) {
	const d = admitMotionDefinition(definition), code = NativeStylesDiagnosticCode.InvalidMotionOptions, x = motionRecord(input, void 0, code, "motion.options");
	if (Object.keys(x).some((k) => ![
		"initial",
		"motion",
		"duration"
	].includes(k)) || !Object.hasOwn(x, "initial") || !Object.hasOwn(x, "motion") || typeof x.initial !== "string" || !Object.hasOwn(d.states, x.initial) || x.motion !== "full" && x.motion !== "reduced") return motionError(code, "motion.options", "expected known initial state and full/reduced motion");
	let duration = d.transition.duration;
	if (Object.hasOwn(x, "duration")) try {
		duration = validateMotionDuration(x.duration);
	} catch {
		return motionError(code, "motion.options.duration", "expected finite milliseconds from 0 to 60000");
	}
	return Object.freeze({
		initial: x.initial,
		motion: x.motion,
		duration
	});
}
//#endregion
//#region src/motion/machine.ts
const result = (state, commands = []) => ({
	state: Object.freeze(state),
	commands: Object.freeze(commands)
});
const cancelled = (run, reason) => ({
	run: run.token,
	result: {
		status: "cancelled",
		target: run.target,
		reason
	}
});
const finished = (run, mode) => ({
	run: run.token,
	result: {
		status: "finished",
		target: run.target,
		mode
	}
});
function settle(state, terminals, operation = {}) {
	return terminals.map((t) => ({
		type: "settle",
		epoch: state.epoch,
		operation,
		...t
	}));
}
function transaction(state, effects, terminals = [], reached, failedCleanup = false) {
	if (!effects.length) return result(state, settle(state, terminals));
	const carried = /* @__PURE__ */ new Map();
	for (const t of state.operation?.terminals ?? []) carried.set(t.run, t);
	for (const t of terminals) carried.set(t.run, t);
	const pending = [...carried.values()], retired = [];
	while (pending.length > 2) retired.push(pending.shift());
	const token = {}, operation = Object.freeze({
		token,
		terminals: Object.freeze(pending),
		failedCleanup,
		...reached === void 0 ? {} : { reached }
	});
	return result({
		...state,
		operation
	}, [...settle(state, retired), ...effects.map((effect) => ({
		...effect,
		epoch: state.epoch,
		operation: token
	}))]);
}
const stops = (state) => state.channels.map((channel) => ({
	type: "stop",
	channel
}));
const writes = (state, target) => state.channels.map((channel) => ({
	type: "set",
	channel,
	value: state.definition.states[target][channel]
}));
function immediate(state, run, retiring = []) {
	return transaction({
		...state,
		run: Object.freeze({
			...run,
			stage: "immediate"
		}),
		cohort: void 0,
		reached: void 0
	}, [...stops(state), ...writes(state, run.target)], [...retiring, finished(run, "immediate")], run.target);
}
function failure(state) {
	const op = state.operation, terminals = [...op?.terminals ?? []];
	if (state.run && !terminals.some((t) => t.run === state.run.token)) terminals.push({
		run: state.run.token,
		result: {
			status: "failed",
			target: state.run.target,
			code: "CRUMBS_CSS_MOTION_DRIVER_FAILED"
		}
	});
	const failed = terminals.map((t) => ({
		run: t.run,
		result: {
			status: "failed",
			target: t.result.target,
			code: "CRUMBS_CSS_MOTION_DRIVER_FAILED"
		}
	}));
	const next = {
		...state,
		run: void 0,
		cohort: void 0,
		operation: void 0,
		reached: void 0
	};
	return op?.failedCleanup ? result(next, settle(next, failed)) : transaction(next, stops(state), failed, void 0, true);
}
function progress(state) {
	const run = state.run;
	if (!run || state.operation) return result(state);
	if (run.stage === "reading" && state.cohort && state.channels.every((k) => Object.hasOwn(state.cohort.samples, k))) {
		const samples = state.cohort.samples;
		return transaction({
			...state,
			cohort: void 0,
			run: Object.freeze({
				...run,
				stage: "running"
			})
		}, [...state.channels.map((channel) => ({
			type: "set",
			channel,
			value: samples[channel]
		})), ...state.channels.map((channel) => ({
			type: "start",
			channel,
			run: run.token,
			value: state.definition.states[run.target][channel],
			policy: run.policy
		}))]);
	}
	if (run.stage === "running" && run.done.length === state.channels.length) return transaction({
		...state,
		run: void 0,
		reached: void 0
	}, stops(state), [finished(run, "animated")], run.target);
	return result(state);
}
function createMotionMachine(definition, initial) {
	const d = admitMotionDefinition(definition);
	admitMotionTarget(d, initial);
	return Object.freeze({
		definition: d,
		channels: motionChannels(d),
		phase: "created",
		reached: initial
	});
}
function currentMotionRun(state) {
	return state.run && Object.freeze({
		token: state.run.token,
		target: state.run.target
	});
}
function inspectMotionMachine(state) {
	return Object.freeze({
		phase: state.phase,
		activeRuns: state.run ? 1 : 0,
		readCohorts: state.cohort ? 1 : 0
	});
}
function motionOperationIsCurrent(state, epoch, operation) {
	return state.epoch === epoch && state.operation?.token === operation;
}
function reduceMotion(state, event) {
	if (event.type === "activate") {
		if (state.phase === "active") return result(state);
		return result({
			...state,
			phase: "active",
			epoch: event.epoch,
			options: event.options,
			run: void 0,
			cohort: void 0,
			operation: void 0
		}, settle(state, state.operation?.terminals ?? []));
	}
	if (event.type === "request" || event.type === "set") admitMotionTarget(state.definition, event.target);
	if (state.phase === "created") return motionError(NativeStylesDiagnosticCode.MotionNotActive, "motion", "commands require committed activation");
	if (state.epoch !== event.epoch) return result(state);
	if (event.type === "driverFailed" || event.type === "operationSucceeded") {
		if (state.operation?.token !== event.operation) return result(state);
		if (event.type === "driverFailed") return failure(state);
		const op = state.operation, next = {
			...state,
			operation: void 0,
			...state.run?.stage === "immediate" ? { run: void 0 } : {},
			...op.reached === void 0 ? {} : { reached: op.reached }
		}, p = progress(next);
		return result(p.state, [...settle(next, op.terminals, event.operation), ...p.commands]);
	}
	if (state.phase !== "active") {
		if (event.type === "request") return result(state, settle(state, [{
			run: event.run,
			result: {
				status: "cancelled",
				target: event.target,
				reason: "deactivated"
			}
		}]));
		return result(state);
	}
	switch (event.type) {
		case "options": {
			const next = {
				...state,
				options: event.options
			};
			return state.run && event.options.motion === "reduced" ? immediate(next, state.run) : result(next);
		}
		case "request": {
			if (state.run?.target === event.target) return result(state);
			const retiring = state.run ? [cancelled(state.run, "superseded")] : [], policy = Object.freeze({
				duration: state.options.duration,
				easing: state.definition.transition.easing,
				motion: state.options.motion
			});
			const run = Object.freeze({
				token: event.run,
				target: event.target,
				policy,
				stage: "reading",
				done: Object.freeze([])
			});
			if (!state.run && state.reached === event.target) return result(state, settle(state, [finished(run, "immediate")]));
			if (policy.motion === "reduced" || policy.duration === 0) return immediate(state, run, retiring);
			const cohort = state.cohort ?? Object.freeze({
				token: event.cohort,
				samples: Object.freeze({})
			});
			const next = {
				...state,
				run,
				cohort,
				reached: void 0
			};
			if (state.cohort) return result(next, settle(next, retiring));
			return transaction(next, [...stops(state), ...state.channels.map((channel) => ({
				type: "read",
				channel,
				cohort: cohort.token
			}))], retiring);
		}
		case "read": {
			if (state.cohort?.token !== event.cohort || !state.run || !state.channels.includes(event.channel) || Object.hasOwn(state.cohort.samples, event.channel)) return result(state);
			let value;
			try {
				value = validateMotionChannel(event.channel, event.value);
			} catch {
				return failure(state);
			}
			return progress({
				...state,
				cohort: Object.freeze({
					...state.cohort,
					samples: Object.freeze({
						...state.cohort.samples,
						[event.channel]: value
					})
				})
			});
		}
		case "completed": {
			const run = state.run;
			if (run?.token !== event.run || run.stage !== "running" || !state.channels.includes(event.channel) || run.done.includes(event.channel)) return result(state);
			if (event.finished !== true) {
				if (event.finished !== false) return failure(state);
				return transaction({
					...state,
					run: void 0,
					cohort: void 0,
					reached: void 0
				}, stops(state), [cancelled(run, "driver-stopped")]);
			}
			return progress({
				...state,
				run: Object.freeze({
					...run,
					done: Object.freeze([...run.done, event.channel])
				})
			});
		}
		case "cancel":
			if (state.run?.token !== event.run) return result(state);
			return transaction({
				...state,
				run: void 0,
				cohort: void 0,
				reached: void 0
			}, stops(state), [cancelled(state.run, "cancelled")]);
		case "set": return transaction({
			...state,
			run: void 0,
			cohort: void 0,
			reached: void 0
		}, [...stops(state), ...writes(state, event.target)], state.run ? [cancelled(state.run, "set")] : [], event.target);
		case "deactivate": return transaction({
			...state,
			phase: "inactive",
			run: void 0,
			cohort: void 0,
			reached: state.run ? void 0 : state.reached
		}, stops(state), state.run ? [cancelled(state.run, "deactivated")] : []);
	}
}
//#endregion
//#region src/motion/owner.ts
function createMotionOwner(definition, initial, driver) {
	const d = admitMotionDefinition(definition);
	admitMotionTarget(d, initial);
	let state = createMotionMachine(d, initial), epoch = {}, processing = false;
	const channels = motionChannels(d), values = Object.create(null);
	for (const channel of channels) values[channel] = driver.createValue(d.states[initial][channel]);
	const style = driver.createStyle(Object.freeze(values));
	const settlements = /* @__PURE__ */ new Map();
	const events = [];
	let pending;
	function acknowledge(work) {
		if (!work.corrections.length) work.waiting.clear();
		if (work.waiting.size || !motionOperationIsCurrent(state, work.epoch, work.token)) return false;
		let failed = false;
		if (work.delayed) for (const correction of work.corrections) try {
			driver.set(values[correction.channel], correction.value);
		} catch {
			failed = true;
			break;
		}
		pending = void 0;
		events.unshift({
			type: failed ? "driverFailed" : "operationSucceeded",
			epoch: work.epoch,
			operation: work.token
		});
		return failed;
	}
	function send(event) {
		events.push(event);
		if (processing) return false;
		processing = true;
		let anyFailure = false;
		try {
			while (events.length) {
				const nextEvent = events.shift();
				if (nextEvent.type === "stopAcknowledged") {
					const work = pending;
					if (work && work.epoch === nextEvent.epoch && work.token === nextEvent.operation && motionOperationIsCurrent(state, work.epoch, work.token)) {
						work.waiting.delete(nextEvent.channel);
						anyFailure = acknowledge(work) || anyFailure;
					}
					continue;
				}
				const reduction = reduceMotion(state, nextEvent);
				state = reduction.state;
				if (pending && !motionOperationIsCurrent(state, pending.epoch, pending.token)) pending = void 0;
				let work, failed = false;
				for (const c of reduction.commands) {
					if (c.type === "settle") {
						const record = settlements.get(c.run);
						if (record) {
							settlements.delete(c.run);
							record.resolve(Object.freeze(c.result));
						}
						continue;
					}
					if (!motionOperationIsCurrent(state, c.epoch, c.operation)) continue;
					work ??= {
						epoch: c.epoch,
						token: c.operation,
						waiting: /* @__PURE__ */ new Set(),
						corrections: [],
						delayed: false
					};
					pending = work;
					if (failed && c.type !== "stop") continue;
					try {
						const value = values[c.channel];
						switch (c.type) {
							case "stop":
								work.waiting.add(c.channel);
								if (driver.stop(value, void 0, () => {
									send({
										type: "stopAcknowledged",
										epoch: c.epoch,
										operation: c.operation,
										channel: c.channel
									});
								}) === true) work.delayed = true;
								else work.waiting.delete(c.channel);
								break;
							case "read":
								driver.stop(value, (sample) => {
									send({
										type: "read",
										epoch: c.epoch,
										cohort: c.cohort,
										channel: c.channel,
										value: sample
									});
								});
								break;
							case "set":
								work.corrections.push(c);
								driver.set(value, c.value);
								break;
							case "start":
								driver.timing(value, c.value, c.policy).start((finished) => {
									send({
										type: "completed",
										epoch: c.epoch,
										run: c.run,
										channel: c.channel,
										finished
									});
								});
								break;
						}
					} catch {
						failed = true;
						anyFailure = true;
					}
				}
				if (work) if (failed) {
					pending = void 0;
					events.unshift({
						type: "driverFailed",
						epoch: work.epoch,
						operation: work.token
					});
				} else anyFailure = acknowledge(work) || anyFailure;
			}
		} finally {
			processing = false;
			events.length = 0;
		}
		return anyFailure;
	}
	function assertActivated() {
		if (inspectMotionMachine(state).phase === "created") motionError(NativeStylesDiagnosticCode.MotionNotActive, "motion", "commands require committed activation");
	}
	const controller = Object.freeze({
		style,
		animateTo(target) {
			admitMotionTarget(d, target);
			assertActivated();
			const current = currentMotionRun(state);
			if (current?.target === target) return settlements.get(current.token).run;
			const token = {};
			let resolve;
			const result = new Promise((done) => {
				resolve = done;
			});
			const run = Object.freeze({
				result,
				cancel() {
					send({
						type: "cancel",
						epoch,
						run: token
					});
				}
			});
			settlements.set(token, {
				run,
				resolve
			});
			send({
				type: "request",
				epoch,
				run: token,
				target,
				cohort: {}
			});
			return run;
		},
		set(target) {
			admitMotionTarget(d, target);
			assertActivated();
			if (send({
				type: "set",
				epoch,
				target
			})) motionError(NativeStylesDiagnosticCode.MotionDriverFailed, "motion.set", "native driver operation failed");
		},
		cancel() {
			assertActivated();
			const current = currentMotionRun(state);
			if (current) send({
				type: "cancel",
				epoch,
				run: current.token
			});
		}
	});
	return Object.freeze({
		controller,
		activate(options) {
			const admitted = admitMotionOptions(definition, options);
			if (inspectMotionMachine(state).phase === "active") return;
			epoch = {};
			send({
				type: "activate",
				epoch,
				options: admitted
			});
		},
		commitOptions(options) {
			const admitted = admitMotionOptions(definition, options);
			send({
				type: "options",
				epoch,
				options: admitted
			});
		},
		deactivate() {
			if (inspectMotionMachine(state).phase !== "active") return;
			send({
				type: "deactivate",
				epoch
			});
		},
		inspect() {
			return {
				...inspectMotionMachine(state),
				values: channels.length,
				retainedSettlements: settlements.size,
				frameListeners: 0
			};
		}
	});
}
//#endregion
//#region src/motion/animated.ts
const curves = {
	linear: react_native.Easing.linear,
	"ease-in": react_native.Easing.in(react_native.Easing.quad),
	"ease-out": react_native.Easing.out(react_native.Easing.quad),
	"ease-in-out": react_native.Easing.inOut(react_native.Easing.quad)
};
const transforms = [
	"translateX",
	"translateY",
	"scale",
	"scaleX",
	"scaleY"
];
function createAnimatedMotionDriver() {
	const platform = react_native.Platform.OS;
	if (platform !== "ios" && platform !== "android" && platform !== "web") return motionError(NativeStylesDiagnosticCode.MotionUnsupportedPlatform, "motion.platform", "expected ios, android or web");
	const useNativeDriver = platform !== "web";
	const states = /* @__PURE__ */ new WeakMap();
	return {
		createValue(initial) {
			const value = new react_native.Animated.Value(initial);
			states.set(value, { active: false });
			return value;
		},
		createStyle(values) {
			const style = {};
			if (values.opacity) style.opacity = values.opacity;
			const transform = transforms.filter((k) => values[k]).map((k) => Object.freeze({ [k]: values[k] }));
			if (transform.length) style.transform = Object.freeze(transform);
			return Object.freeze(style);
		},
		stop(value, onValue, onStopped) {
			const current = states.get(value);
			const node = value;
			if (onValue) {
				current.active = false;
				node.stopAnimation(onValue);
				return;
			}
			if (current.stop) {
				current.stop.reply = onStopped;
				return true;
			}
			const pending = useNativeDriver && current.active;
			current.active = false;
			if (!pending) {
				node.stopAnimation();
				return;
			}
			const stop = { reply: onStopped };
			current.stop = stop;
			try {
				node.stopAnimation(() => {
					if (states.get(value) !== current || current.stop !== stop) return;
					delete current.stop;
					stop.reply?.();
				});
			} catch (error) {
				delete current.stop;
				throw error;
			}
			return true;
		},
		set(value, next) {
			value.setValue(next);
		},
		timing(value, next, policy) {
			const animation = react_native.Animated.timing(value, {
				toValue: next,
				duration: policy.duration,
				easing: curves[policy.easing],
				useNativeDriver,
				isInteraction: false
			});
			return {
				start(callback) {
					const current = { active: true };
					states.set(value, current);
					animation.start((result) => {
						if (states.get(value) === current) current.active = false;
						callback(result.finished);
					});
				},
				stop() {
					animation.stop();
				}
			};
		}
	};
}
//#endregion
//#region src/motion/react.ts
function useNativeMotion(definition, options) {
	admitMotionDefinition(definition);
	const admitted = admitMotionOptions(definition, options);
	const owner = (0, react.useMemo)(() => createMotionOwner(definition, admitted.initial, createAnimatedMotionDriver()), [definition]);
	(0, react.useLayoutEffect)(() => {
		owner.activate(admitted);
		return () => owner.deactivate();
	}, [owner]);
	(0, react.useLayoutEffect)(() => owner.commitOptions(admitted), [
		owner,
		admitted.initial,
		admitted.motion,
		admitted.duration
	]);
	return owner.controller;
}
//#endregion
exports.useNativeMotion = useNativeMotion;
