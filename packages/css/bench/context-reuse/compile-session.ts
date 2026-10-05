import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { clearAdmissionState, createAdmissionState, forgetAdmissionKey, planAdmission, type AdmissionSettings } from "./admission-policy";
import { assessReuse, captureConfiguration, createQualificationReceiptPlugin, reuseReasons, verifyBuildInputs, type CompileRequest, type ConfigurationReceipt, type ReuseReason } from "./identity";

export type CompileReceipt = Readonly<{ source: string; inputs: Readonly<Record<string, unknown>>; watchFiles: readonly string[] }>;
export type CompileHandle = { rebuild(): Promise<CompileReceipt>; dispose(): Promise<void> };
export type CompileBackend = { fresh(request: CompileRequest): Promise<CompileReceipt>; create(request: CompileRequest): Promise<CompileHandle> };
export type SessionClock = { now(): number; schedule(delayMs: number, callback: () => void): { cancel(): void; unref(): void } };
export type SessionSnapshot = Readonly<{
  state: "open" | "closing" | "closed" | "disabled"; generation: number;
  live: number; creating: number; disposing: number; quarantined: number; retained: number; probation: number; pending: number;
  hits: number; misses: number; bypasses: number; evictions: number; disposals: number; cleanupFailures: number; queueWaitMs: number;
  lastBypassReason: ReuseReason | undefined;
}>;
export type CompileSession = {
  compile(request: CompileRequest): Promise<CompileReceipt>;
  runNative<T>(request: CompileRequest, evaluate: (receipt: CompileReceipt) => Promise<T>): Promise<T>;
  invalidate(reason: string): Promise<void>; snapshot(): SessionSnapshot; close(): Promise<void>;
};
function freeze<T>(value: T): T {
  if (value && typeof value === "object") { for (const child of Object.values(value)) freeze(child); Object.freeze(value); }
  return value;
}
function immutableReceipt(receipt: CompileReceipt): CompileReceipt {
  if (typeof receipt.source !== "string" || !receipt.inputs || !Array.isArray(receipt.watchFiles)) throw new Error("Missing current compile receipt");
  return freeze(structuredClone(receipt));
}
// Own queued request data; retain executable plugin identity without freezing caller objects.
function requestSnapshot(request: CompileRequest): CompileRequest {
  const options = request.esbuildOptions && Object.fromEntries(Object.entries(request.esbuildOptions).map(([key, value]) => [key,
    Array.isArray(value) ? Object.freeze([...value]) : value && typeof value === "object" ? Object.freeze({ ...value }) : value,
  ]));
  const domain = request.domain && Object.fromEntries(Object.entries(request.domain).map(([key, value]) => [key, Array.isArray(value) ? Object.freeze([...value]) : value]));
  return Object.freeze({ ...request, esbuildOptions: options, domain: domain as CompileRequest["domain"],
    ...(request.entryBytes === undefined ? {} : { entryBytes: new Uint8Array(request.entryBytes) }),
  });
}
// Only the real backend uses this private adapter; the public tooling handle interface stays unchanged.
const updateHandleRequest = new WeakMap<CompileHandle, (request: CompileRequest) => void>();
const realClock: SessionClock = {
  now: () => performance.now(),
  schedule(delayMs, callback) { const timer = setTimeout(callback, delayMs); return { cancel: () => clearTimeout(timer), unref: () => timer.unref() }; },
};
// Conservative qualification work is measured later. This is not an atomic filesystem snapshot.
function sourceInventory(request: CompileRequest): string {
  const files = new Map<string, string>();
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) files.set(path, createHash("sha256").update(readFileSync(path)).digest("hex"));
      // Declared symlink targets have their own input root; don't follow links into an open domain.
    }
  };
  for (const root of request.domain.allowedInputRoots) visit(resolve(request.cwd, root));
  return JSON.stringify([...files].sort(([a], [b]) => a.localeCompare(b)));
}
export function createCompileSession({ settings, idleMs, mode, backend = createRealBackend(), clock = realClock }: {
  settings: AdmissionSettings; idleMs: number; mode: "fresh" | "immediate" | "repeat"; backend?: CompileBackend; clock?: SessionClock;
}): CompileSession {
  let policy = createAdmissionState(settings);
  const capacity = policy.settings.capacity;
  if (!["fresh", "immediate", "repeat"].includes(mode) || (mode !== "fresh" && mode !== settings.admission)) throw new TypeError("Session mode must agree with admission settings");
  if (!Number.isSafeInteger(idleMs) || idleMs <= 0 || idleMs > 2147483647) throw new RangeError("Idle duration must be a positive timer-safe integer");
  let state: SessionSnapshot["state"] = "open";
  let disabled = false; let generation = 0; let pending = 0; let creating = 0;
  let loadedArtifactDomain: string | undefined;
  let loadedReceipt: ConfigurationReceipt | undefined; let previousReceipt: ConfigurationReceipt | undefined;
  let queue: Promise<void> = Promise.resolve(); let closePromise: Promise<void> | undefined;
  let timer: ReturnType<SessionClock["schedule"]> | undefined; let timerToken = 0;
  const handles = new Map<string, CompileHandle>(); const disposing = new Set<CompileHandle>(); const quarantine = new Set<CompileHandle>();
  const cleanupErrors: unknown[] = [];
  const totals = { hits: 0, misses: 0, bypasses: 0, evictions: 0, disposals: 0, queueWaitMs: 0 };
  let lastBypassReason: ReuseReason | undefined;
  const cancelIdle = () => { timerToken++; timer?.cancel(); timer = undefined; };
  const disable = () => { disabled = true; if (state === "open") state = "disabled"; policy = clearAdmissionState(policy); };
  async function disposeKey(key: string) {
    const handle = handles.get(key); if (!handle) return;
    handles.delete(key); policy = forgetAdmissionKey(policy, key); disposing.add(handle);
    try { await handle.dispose(); totals.disposals++; }
    catch (error) { quarantine.add(handle); cleanupErrors.push(error); disable(); }
    finally { disposing.delete(handle); }
  }
  async function drain() {
    for (const key of [...handles.keys()]) await disposeKey(key);
    policy = clearAdmissionState(policy); previousReceipt = undefined; generation++;
  }
  function armIdle() {
    if (pending || state !== "open" || (!handles.size && !policy.probation.length)) return;
    cancelIdle(); const token = timerToken; const ownerGeneration = generation;
    timer = clock.schedule(idleMs, () => {
      if (token !== timerToken || ownerGeneration !== generation || pending || state !== "open") return;
      timer = undefined;
      void enqueue(async () => {
        if (token !== timerToken || ownerGeneration !== generation || pending !== 1 || state !== "open") return;
        await drain();
      }, false).catch(error => { cleanupErrors.push(error); disable(); });
    }); timer.unref();
  }
  function enqueue<T>(work: () => Promise<T>, cancel = true): Promise<T> {
    if (cancel) cancelIdle();
    const queuedAt = clock.now(); pending++;
    const result = queue.then(async () => {
      totals.queueWaitMs += Math.max(0, clock.now() - queuedAt);
      try { return await work(); } finally { pending--; armIdle(); }
    });
    queue = result.then(() => undefined, () => undefined); return result;
  }
  function admitted<T>(work: () => Promise<T>): Promise<T> {
    if (state === "closing" || state === "closed") return Promise.reject(new Error("Compile session is closed"));
    return enqueue(work);
  }
  async function fresh<T>(request: CompileRequest, evaluate: (receipt: CompileReceipt) => Promise<T>) {
    totals.bypasses++; return evaluate(immutableReceipt(await backend.fresh(request)));
  }
  async function perform<T>(request: CompileRequest, evaluate: (receipt: CompileReceipt) => Promise<T>): Promise<T> {
    if (mode === "fresh" || disabled) return fresh(request, evaluate);
    let current: ConfigurationReceipt;
    try { current = captureConfiguration(request); }
    catch (error) {
      const captureReason = error instanceof Error && "reason" in error && reuseReasons.includes(error.reason as ReuseReason) ? error.reason as ReuseReason : "incomplete-resolution-domain";
      const assessment = loadedReceipt ? assessReuse(request, loadedReceipt, previousReceipt) : undefined;
      lastBypassReason = assessment && assessment.kind !== "eligible" ? assessment.reason : captureReason;
      if (assessment?.kind === "restart-required") disable();
      await drain(); return fresh(request, evaluate);
    }
    const artifactDomain = JSON.stringify([...new Set(request.domain.loadedArtifacts.map(path => resolve(request.cwd, path)))].sort());
    if (loadedArtifactDomain !== undefined && loadedArtifactDomain !== artifactDomain) {
      // A module owner cannot prove that a newly declared implementation has been loaded.
      lastBypassReason = "loaded-artifact-changed"; disable(); await drain(); return fresh(request, evaluate);
    }
    loadedArtifactDomain ??= artifactDomain;
    loadedReceipt ??= current;
    const eligibility = assessReuse(request, loadedReceipt, previousReceipt);
    if (eligibility.kind !== "eligible") {
      lastBypassReason = eligibility.reason;
      if (eligibility.kind === "restart-required") disable();
      await drain(); previousReceipt = eligibility.kind === "fresh" ? current : undefined;
      return fresh(request, evaluate);
    }
    if (!previousReceipt) generation++;
    previousReceipt = eligibility.receipt;
    const plan = planAdmission(policy, eligibility.key);
    if (plan.kind === "reuse") totals.hits++; else totals.misses++;
    if (plan.evict !== undefined) {
      totals.evictions++; await disposeKey(plan.evict);
      if (disabled) { await drain(); return fresh(request, evaluate); }
    }
    try {
      const before = sourceInventory(request);
      let receipt: CompileReceipt;
      if (plan.kind === "fresh") receipt = immutableReceipt(await backend.fresh(request));
      else {
        if (plan.kind === "create") {
          if (handles.size + creating + disposing.size + quarantine.size >= capacity) throw new Error("Owned context capacity exceeded");
          creating++; try { handles.set(plan.key, await backend.create(request)); } finally { creating--; }
        }
        const handle = handles.get(plan.key); if (!handle) throw new Error("Missing retained compile handle");
        updateHandleRequest.get(handle)?.(request);
        receipt = immutableReceipt(await handle.rebuild());
      }
      const stable = before === sourceInventory(request);
      const after = assessReuse(request, loadedReceipt, previousReceipt);
      if (!stable || !verifyBuildInputs(request, Object.keys(receipt.inputs)) || after.kind !== "eligible") {
        lastBypassReason = !stable ? "source-unstable" : after.kind !== "eligible" ? after.reason : "incomplete-resolution-domain";
        if (after.kind === "restart-required") disable();
        await drain(); return fresh(request, evaluate);
      }
      const result = await evaluate(receipt); policy = plan.onSuccess; return result;
    } catch (error) {
      policy = forgetAdmissionKey(policy, plan.key); await disposeKey(plan.key); if (disabled) await drain(); throw error;
    }
  }
  return {
    compile(request) {
      try { const owned = requestSnapshot(request); return admitted(() => perform(owned, async receipt => receipt)); }
      catch (error) { return Promise.reject(error); }
    },
    runNative(request, evaluate) {
      try { const owned = requestSnapshot(request); return admitted(() => perform(owned, evaluate)); }
      catch (error) { return Promise.reject(error); }
    },
    invalidate: _reason => admitted(async () => { const before = cleanupErrors.length; await drain(); if (cleanupErrors.length > before) throw new AggregateError(cleanupErrors.slice(before), "Context cleanup failed"); }),
    snapshot: () => Object.freeze({ state, generation, pending, creating, disposing: disposing.size, quarantined: quarantine.size,
      live: handles.size + creating + disposing.size + quarantine.size, retained: policy.retained.length, probation: policy.probation.length,
      ...totals, cleanupFailures: cleanupErrors.length, lastBypassReason }),
    close() {
      if (closePromise) return closePromise;
      state = "closing"; cancelIdle();
      closePromise = enqueue(async () => {
        try { await drain(); if (cleanupErrors.length) throw new AggregateError(cleanupErrors, `Context cleanup failed: ${cleanupErrors.map(String).join("; ")}`); }
        finally { state = "closed"; }
      }); return closePromise;
    },
  };
}
type BuildResult = { outputFiles?: { text: string }[]; metafile?: { inputs: Record<string, unknown> } };
type EsbuildContext = { rebuild(): Promise<BuildResult>; dispose(): Promise<void> };
function createRealBackend(): CompileBackend {
  const integrationLoader = createRequire(import.meta.url); const manifest = integrationLoader.resolve("@vanilla-extract/integration/package.json");
  const integration = integrationLoader("@vanilla-extract/integration") as {
    compile(request: Record<string, unknown>): Promise<{ source: string; watchFiles: string[] }>;
    vanillaExtractTransformPlugin(options: { identOption: string }): unknown;
  };
  const integrationRequire = createRequire(manifest);
  const esbuild = integrationRequire("esbuild") as { context(options: Record<string, unknown>): Promise<EsbuildContext> };
  if (JSON.parse(readFileSync(manifest, "utf8")).version !== "8.0.10" || JSON.parse(readFileSync(integrationRequire.resolve("esbuild/package.json"), "utf8")).version !== "0.27.7") throw new Error("Qualification requires esbuild 0.27.7 / integration 8.0.10");
  return {
    async fresh(request) {
      let inputs: Readonly<Record<string, unknown>> | undefined;
      const plugin = createQualificationReceiptPlugin(current => { inputs = current; });
      try {
        const result = await integration.compile({ filePath: request.filePath, cwd: request.cwd, identOption: request.identOption,
          esbuildOptions: { ...request.esbuildOptions, plugins: [...(request.esbuildOptions.plugins as unknown[] | undefined ?? []), plugin] } });
        if (!inputs) throw new Error("Missing current fresh compile inputs");
        return immutableReceipt({ ...result, inputs });
      } finally { inputs = undefined; }
    },
    async create(request) {
      type ReceiptPlugin = ReturnType<typeof createQualificationReceiptPlugin>;
      let currentRequest: CompileRequest | undefined = request;
      let slot: { inputs?: Readonly<Record<string, unknown>> } | undefined;
      const plugin = createQualificationReceiptPlugin(inputs => {
        if (!slot) return;
        slot.inputs = inputs;
        // Factory-recognised collectors expose only onEnd; route their current callback without
        // installing a request closure into the persistent esbuild context.
        for (const collector of currentRequest?.esbuildOptions.plugins as ReceiptPlugin[] | undefined ?? []) {
          collector.setup({ onEnd: callback => { callback({ metafile: { inputs: { ...inputs } } }); } });
        }
      });
      const opts = request.esbuildOptions; const cwd = request.cwd;
      const context = await esbuild.context({ entryPoints: [request.filePath], metafile: true, bundle: true,
        external: ["@vanilla-extract", ...(opts.external as string[] | undefined ?? [])], platform: "node", write: false,
        plugins: [integration.vanillaExtractTransformPlugin({ identOption: request.identOption }), plugin],
        absWorkingDir: request.cwd, loader: opts.loader, define: opts.define, tsconfig: opts.tsconfig, conditions: opts.conditions });
      const handle: CompileHandle = {
        async rebuild() {
          const current: { inputs?: Readonly<Record<string, unknown>> } = {}; slot = current;
          try {
            const result = await context.rebuild();
            if (!current.inputs || result.outputFiles?.length !== 1) throw new Error("Missing current retained compile receipt");
            return immutableReceipt({ source: result.outputFiles[0]!.text, inputs: current.inputs,
              watchFiles: Object.keys(current.inputs).map(path => join(cwd, path)) });
          } finally { slot = undefined; currentRequest = undefined; }
        }, dispose: () => context.dispose(),
      };
      updateHandleRequest.set(handle, next => { currentRequest = next; });
      return handle;
    },
  };
}
