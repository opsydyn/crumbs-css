import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { CompileRequest } from "../../bench/context-reuse/identity";

export function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
export function sessionFixture() {
  const cwd = realpathSync(mkdtempSync(join(tmpdir(), "crumbs-session-")));
  const put = (name: string, text: string) => { const path = join(cwd, name); writeFileSync(path, text); return path; };
  const manifest = put("package.json", '{"name":"session-fixture"}');
  const config = put("tsconfig.json", "{}"); const lock = put("bun.lock", "lock-v1"); const artifact = put("compiler.cjs", "module.exports=1");
  for (const key of ["A", "B", "C", "D"]) put(`${key}.css.ts`, `export const value = ${key.charCodeAt(0)};`);
  const request = (key = "A"): CompileRequest => ({ cwd, filePath: join(cwd, `${key}.css.ts`), identOption: "debug", esbuildOptions: {}, domain: { configurationFiles: [manifest, config], installationFiles: [lock], loadedArtifacts: [artifact], symlinkPaths: [], allowedInputRoots: [cwd] } });
  return { cwd, put, request, remove: () => rmSync(cwd, { recursive: true, force: true }) };
}
export class ControlledClock {
  time = 0;
  timers: { deadline: number; callback: () => void; cancelled: boolean; unreferenced: boolean }[] = [];
  now = () => this.time;
  schedule = (delayMs: number, callback: () => void) => {
    const timer = { deadline: this.time + delayMs, callback, cancelled: false, unreferenced: false }; this.timers.push(timer);
    return { cancel: () => { timer.cancelled = true; }, unref: () => { timer.unreferenced = true; } };
  };
  advance(ms: number) { this.time += ms; for (const timer of this.timers) if (!timer.cancelled && timer.deadline <= this.time) { timer.cancelled = true; timer.callback(); } }
}
export class ControlledBackend {
  events: string[] = []; live = 0; peak = 0; sequence = 0;
  beforeCreate: (() => Promise<void>) | undefined;
  beforeRebuild: (() => Promise<void>) | undefined;
  beforeDispose: (() => Promise<void>) | undefined;
  createError: Error | undefined;
  buildError: Error | undefined;
  disposeError: Error | undefined;
  private receipt(request: CompileRequest) {
    const path = resolve(request.cwd, request.filePath);
    return { source: readFileSync(path, "utf8"), inputs: { [path]: { bytes: readFileSync(path).length } }, watchFiles: [path] };
  }
  fresh = async (request: CompileRequest) => { this.events.push("fresh"); if (this.buildError) throw this.buildError; return this.receipt(request); };
  create = async (request: CompileRequest) => {
    this.events.push("create:start"); await this.beforeCreate?.(); if (this.createError) throw this.createError;
    this.live++; this.peak = Math.max(this.peak, this.live); const id = ++this.sequence; this.events.push(`create:${id}`);
    let disposed = false;
    return {
      rebuild: async () => { this.events.push(`rebuild:${id}`); await this.beforeRebuild?.(); if (this.buildError) throw this.buildError; return this.receipt(request); },
      dispose: async () => { this.events.push(`dispose:start:${id}`); await this.beforeDispose?.(); if (this.disposeError) throw this.disposeError; if (disposed) throw new Error("double dispose"); disposed = true; this.live--; this.events.push(`dispose:${id}`); },
    };
  };
}
export async function flushGate() { for (let i = 0; i < 20; i++) await Promise.resolve(); }
