import { expect, it } from "bun:test";
import { utimesSync, writeFileSync } from "node:fs";
import { createCompileSession } from "../bench/context-reuse/compile-session";
import { createQualificationReceiptPlugin } from "../bench/context-reuse/identity";
import { ControlledBackend, ControlledClock, deferred, flushGate, sessionFixture } from "./support/context-reuse";

function setup(capacity = 1, mode: "immediate" | "repeat" | "fresh" = "immediate", idleMs = 1000) {
  const fixture = sessionFixture(); const backend = new ControlledBackend(); const clock = new ControlledClock();
  const session = createCompileSession({ settings: { capacity, admission: mode === "repeat" ? "repeat" : "immediate" }, mode, idleMs, backend, clock });
  return { fixture, backend, clock, session };
}
it("awaits eviction disposal before creating replacement; accounts for creating and disposing", async () => {
  const { fixture, backend, session } = setup();
  try {
    await session.compile(fixture.request("A"));
    const disposal = deferred(); backend.beforeDispose = () => disposal.promise;
    const replacement = session.compile(fixture.request("B")); await flushGate();
    expect(backend.events.filter(event => event.startsWith("create:")).length).toBe(2); // start + completed A only
    expect(session.snapshot().disposing).toBe(1); expect(session.snapshot().live).toBe(1);
    disposal.resolve(); await replacement;
    expect(backend.peak).toBe(1); expect(session.snapshot().retained).toBe(1);
    const creation = deferred(); backend.beforeCreate = () => creation.promise;
    const third = session.compile(fixture.request("C")); await flushGate();
    expect(session.snapshot().creating).toBe(1); expect(session.snapshot().live).toBe(1);
    creation.resolve(); await third;
  } finally { await session.close(); fixture.remove(); }
});
it("failed eviction disables admission, quarantines the handle and uses fresh without replacement", async () => {
  const { fixture, backend, session } = setup();
  try {
    await session.compile(fixture.request("A")); backend.disposeError = new Error("dispose failed");
    expect((await session.compile(fixture.request("B"))).source).toContain("66");
    expect(session.snapshot()).toMatchObject({ state: "disabled", live: 1, quarantined: 1, retained: 0 });
    await session.compile(fixture.request("C")); expect(backend.sequence).toBe(1); expect(backend.live).toBe(1);
    const first = session.close(); const second = session.close(); expect(second).toBe(first);
    await expect(first).rejects.toThrow("dispose failed"); await expect(second).rejects.toThrow("dispose failed");
  } finally { fixture.remove(); }
});
it("preserves original build and native errors when cleanup also fails", async () => {
  for (const failure of ["build", "native"] as const) {
    const { fixture, backend, session } = setup(); const original = new Error(`original ${failure}`);
    try {
      backend.disposeError = new Error("cleanup failure");
      if (failure === "build") backend.buildError = original;
      let caught: unknown;
      try { await session.runNative(fixture.request(), () => { throw original; }); } catch (error) { caught = error; }
      expect(caught).toBe(original); expect(session.snapshot().quarantined).toBe(1);
      backend.buildError = undefined;
      expect((await session.compile(fixture.request())).source).toContain("65");
      await expect(session.close()).rejects.toThrow("cleanup failure");
    } finally { fixture.remove(); }
  }
});
it("serialises compilation and native evaluation; commits successful admission only after evaluation", async () => {
  const { fixture, backend, session } = setup(2); const native = deferred(); const entered = deferred(); const values: string[] = [];
  try {
    const first = session.runNative(fixture.request("A"), async receipt => { entered.resolve(); await native.promise; values.push(receipt.source); return "A"; });
    await entered.promise;
    expect(session.snapshot().retained).toBe(0);
    const second = session.runNative(fixture.request("B"), receipt => { values.push(receipt.source); return Promise.resolve("B"); });
    await flushGate(); expect(backend.sequence).toBe(1);
    native.resolve(); expect(await Promise.all([first, second])).toEqual(["A", "B"]);
    expect(values[0]).toContain("65"); expect(values[1]).toContain("66"); expect(session.snapshot().retained).toBe(2);
  } finally { await session.close(); fixture.remove(); }
});
it("close drains admitted work, rejects new work, and returns the same completion promise", async () => {
  const { fixture, session } = setup(2); const hold = deferred(); const entered = deferred();
  try {
    const first = session.runNative(fixture.request("A"), async () => { entered.resolve(); await hold.promise; return 1; }); await entered.promise;
    const second = session.compile(fixture.request("B")); const close = session.close(); expect(session.close()).toBe(close);
    expect(session.snapshot().state).toBe("closing"); await expect(session.compile(fixture.request("C"))).rejects.toThrow("closed");
    hold.resolve(); expect(await first).toBe(1); expect((await second).source).toContain("66"); await close;
    expect(session.snapshot()).toMatchObject({ state: "closed", live: 0, retained: 0, probation: 0 });
    await expect(session.invalidate("late")).rejects.toThrow("closed");
  } finally { fixture.remove(); }
});
it("stale queued timers and queued requests cannot expire a newer generation", async () => {
  const { fixture, clock, session } = setup();
  try {
    await session.compile(fixture.request()); const stale = clock.timers.at(-1)!;
    expect(stale.unreferenced).toBe(true);
    const next = session.compile(fixture.request()); stale.callback(); await next; await flushGate();
    expect(session.snapshot().live).toBe(1); expect(session.snapshot().hits).toBe(1);
    const beforeInvalidate = clock.timers.at(-1)!;
    await session.invalidate("configuration replacement"); await session.compile(fixture.request()); beforeInvalidate.callback(); await flushGate();
    expect(session.snapshot().live).toBe(1);
  } finally { await session.close(); fixture.remove(); }
});
it("controlled 1/30/120 second timers support three idle/reopen cycles", async () => {
  for (const idleMs of [1000, 30000, 120000]) {
    const { fixture, backend, clock, session } = setup(1, "repeat", idleMs);
    try {
      for (let cycle = 0; cycle < 3; cycle++) {
        await session.compile(fixture.request()); await session.compile(fixture.request());
        clock.advance(idleMs - 1); await flushGate(); expect(session.snapshot().live).toBe(1);
        clock.advance(1); await flushGate(); expect(session.snapshot()).toMatchObject({ state: "open", live: 0, retained: 0, probation: 0 });
      }
      expect(backend.sequence).toBe(3); expect(session.snapshot().disposals).toBe(3);
    } finally { await session.close(); fixture.remove(); }
  }
});
it("build/create/native failures do not cache errors or last-good output; repaired work recovers", async () => {
  const { fixture, backend, session } = setup(2, "repeat");
  try {
    await session.compile(fixture.request()); backend.createError = new Error("create failed");
    await expect(session.compile(fixture.request())).rejects.toThrow("create failed"); expect(session.snapshot().probation).toBe(0);
    backend.createError = undefined; await session.compile(fixture.request()); await session.compile(fixture.request());
    backend.buildError = new Error("rebuild failed"); await expect(session.compile(fixture.request())).rejects.toThrow("rebuild failed");
    expect(session.snapshot().retained).toBe(0); backend.buildError = undefined;
    fixture.put("A.css.ts", "export const value = 999;"); expect((await session.compile(fixture.request())).source).toContain("999");
    await expect(session.runNative(fixture.request(), async () => { throw new Error("native failed"); })).rejects.toThrow("native failed");
    expect(session.snapshot().retained).toBe(0); expect(session.snapshot().probation).toBe(0);
  } finally { await session.close(); fixture.remove(); }
});
it("configuration/project changes drain old resources and unstable builds select fresh", async () => {
  const { fixture, backend, session } = setup(2); const other = sessionFixture();
  const otherRequest = () => ({ ...other.request(), domain: { ...other.request().domain, loadedArtifacts: fixture.request().domain.loadedArtifacts } });
  try {
    await session.compile(fixture.request()); fixture.put("tsconfig.json", '{"compilerOptions":{"jsx":"react"}}');
    await session.compile(fixture.request()); expect(session.snapshot().live).toBe(0);
    await session.compile(fixture.request()); expect(session.snapshot().live).toBe(1);
    await session.compile(otherRequest()); expect(session.snapshot().live).toBe(0);
    await session.compile(otherRequest()); expect(session.snapshot().live).toBe(1);
    backend.beforeRebuild = async () => { other.put("A.css.ts", "export const value = 1234;"); backend.beforeRebuild = undefined; };
    const result = await session.compile(otherRequest()); expect(result.source).toContain("1234");
    expect(session.snapshot()).toMatchObject({ live: 0, lastBypassReason: "source-unstable" });
  } finally { await session.close(); fixture.remove(); other.remove(); }
});
it("restart-required identity disables retention and unknown configuration selects fresh", async () => {
  const { fixture, backend, session } = setup();
  try {
    await session.compile(fixture.request()); fixture.put("compiler.cjs", "module.exports=2");
    await session.compile(fixture.request()); expect(session.snapshot()).toMatchObject({ state: "disabled", live: 0, lastBypassReason: "loaded-artifact-changed" });
    await session.compile(fixture.request()); expect(backend.sequence).toBe(1);
  } finally { await session.close(); fixture.remove(); }
  const fresh = setup();
  try {
    await fresh.session.compile({ ...fresh.fixture.request(), esbuildOptions: { alias: {} } });
    expect(fresh.session.snapshot()).toMatchObject({ live: 0, lastBypassReason: "unknown-build-option" });
  } finally { await fresh.session.close(); fresh.fixture.remove(); }
});
it("validates session settings and freezes detached compile receipts and snapshots", async () => {
  const { fixture, session } = setup();
  try {
    for (const idleMs of [0, -1, Infinity, 1.5]) expect(() => createCompileSession({ settings: { capacity: 1, admission: "immediate" }, mode: "immediate", idleMs })).toThrow();
    expect(() => createCompileSession({ settings: { capacity: 1, admission: "repeat" }, mode: "immediate", idleMs: 1000 })).toThrow();
    const receipt = await session.compile(fixture.request());
    for (const value of [receipt, receipt.inputs, Object.values(receipt.inputs)[0], receipt.watchFiles, session.snapshot()]) expect(Object.isFrozen(value)).toBe(true);
  } finally { await session.close(); fixture.remove(); }
});
it("real esbuild sessions fail closed on source changes, recover syntax errors and close directly", async () => {
  const fixture = sessionFixture();
  const session = createCompileSession({ settings: { capacity: 2, admission: "immediate" }, mode: "immediate", idleMs: 1000 });
  try {
    fixture.put("theme.ts", "export const token = 111;"); fixture.put("A.css.ts", "import { token } from './theme'; export const value = token;");
    const first = await session.compile(fixture.request()); expect(first.source).toContain("111");
    expect(await session.compile(fixture.request())).toEqual(first); expect(session.snapshot().hits).toBe(1);
    fixture.put("theme.ts", "export const token = 222;"); const second = await session.compile(fixture.request()); expect(second.source).toContain("222"); expect(second.source).not.toContain("111");
    expect(second.inputs).not.toBe(first.inputs); expect(second.watchFiles.some(path => path.endsWith("theme.ts"))).toBe(true);
    expect(session.snapshot()).toMatchObject({ live: 0, lastBypassReason: "source-changed" });
    fixture.put("A.css.ts", "export const value = 333;"); const third = await session.compile(fixture.request()); expect(third.source).toContain("333"); expect(third.watchFiles.some(path => path.endsWith("theme.ts"))).toBe(false);
    expect(session.snapshot()).toMatchObject({ live: 0, lastBypassReason: "source-changed" });
    fixture.put("A.css.ts", "export const value = ;"); await expect(session.compile(fixture.request())).rejects.toThrow(); expect(session.snapshot().live).toBe(0);
    fixture.put("A.css.ts", "export const value = 444;"); expect((await session.compile(fixture.request())).source).toContain("444");
    expect(session.snapshot()).toMatchObject({ live: 0, hits: 1, lastBypassReason: "source-changed" });
  } finally { await session.close(); expect(session.snapshot().live).toBe(0); fixture.remove(); }
});
it("real retained sessions fail closed on changed and restored inputs with unchanged file metadata", async () => {
  const fixture = sessionFixture();
  const fresh = createCompileSession({ settings: { capacity: 2, admission: "immediate" }, mode: "fresh", idleMs: 1000 });
  const retained = createCompileSession({ settings: { capacity: 2, admission: "immediate" }, mode: "immediate", idleMs: 1000 });
  const filePath = fixture.request().filePath;
  const original = "import { token } from './theme';\nexport const value = token;\n";
  const editedBase = "import { token } from './theme';\nexport const value = 9;\n";
  const edited = editedBase + " ".repeat(original.length - editedBase.length);
  const removedBase = "export const value = 143;\n";
  const removed = removedBase + " ".repeat(original.length - removedBase.length);
  const baselineTime = new Date("2020-01-01T00:00:00.000Z");
  const setSource = (source: string) => { writeFileSync(filePath, source); utimesSync(filePath, baselineTime, baselineTime); };
  try {
    fixture.put("theme.ts", "export const token = 141;");
    expect(edited.length).toBe(original.length);
    expect(removed.length).toBe(original.length);
    for (const [index, source] of [original, edited, removed, original].entries()) {
      setSource(source);
      const actual = await retained.compile(fixture.request());
      const expected = await fresh.compile(fixture.request());
      expect(actual).toEqual(expected);
      if (index > 0) expect(retained.snapshot()).toMatchObject({ live: 0, lastBypassReason: "source-changed" });
    }
  } finally { await retained.close(); await fresh.close(); fixture.remove(); }
});
it("real idle timer releases contexts and permits reopening", async () => {
  const fixture = sessionFixture(); const session = createCompileSession({ settings: { capacity: 1, admission: "immediate" }, mode: "immediate", idleMs: 20 });
  try {
    await session.compile(fixture.request());
    for (let i = 0; i < 30 && session.snapshot().live > 0; i++) await new Promise(resolve => setTimeout(resolve, 10));
    expect(session.snapshot()).toMatchObject({ state: "open", live: 0 }); await session.compile(fixture.request()); expect(session.snapshot().live).toBe(1);
  } finally { await session.close(); fixture.remove(); }
});
it("fresh mode retains no resources and buffer/input-domain conflicts bypass retention", async () => {
  const { fixture, backend, session } = setup(1, "fresh");
  try { await session.compile(fixture.request()); await session.compile(fixture.request()); expect(backend.sequence).toBe(0); expect(session.snapshot()).toMatchObject({ live: 0, retained: 0, probation: 0, bypasses: 2 }); }
  finally { await session.close(); fixture.remove(); }
  const retained = setup();
  try {
    await retained.session.compile(retained.fixture.request());
    await retained.session.compile({ ...retained.fixture.request(), entryBytes: Buffer.from("old Metro buffer") });
    expect(retained.session.snapshot()).toMatchObject({ live: 0, lastBypassReason: "entry-buffer-mismatch" });
  } finally { await retained.session.close(); retained.fixture.remove(); }
});
it("a queued failure preserves its error and lets a later request run", async () => {
  const { fixture, backend, session } = setup(2); const original = new Error("queued build failed");
  let once = true; backend.beforeRebuild = async () => { if (once) { once = false; throw original; } };
  try {
    const failed = session.compile(fixture.request("A")); const repaired = session.compile(fixture.request("B"));
    let caught: unknown; try { await failed; } catch (error) { caught = error; }
    expect(caught).toBe(original); expect((await repaired).source).toContain("66"); expect(session.snapshot().live).toBe(1);
  } finally { await session.close(); fixture.remove(); }
});
it("queued work owns a request snapshot and session capacity is detached from caller settings", async () => {
  const fixture = sessionFixture(); const backend = new ControlledBackend(); const clock = new ControlledClock();
  const settings: { capacity: number; admission: "immediate" } = { capacity: 1, admission: "immediate" };
  const session = createCompileSession({ settings, mode: "immediate", idleMs: 1000, backend, clock });
  const hold = deferred(); const entered = deferred();
  try {
    const first = session.runNative(fixture.request("A"), async () => { entered.resolve(); await hold.promise; return 1; }); await entered.promise;
    const mutable = { ...fixture.request("B") }; const second = session.compile(mutable);
    mutable.filePath = fixture.request("C").filePath; settings.capacity = 0;
    hold.resolve(); await first; expect((await second).source).toContain("66"); expect(backend.peak).toBe(1);
  } finally { await session.close(); fixture.remove(); }
});
it("a request arriving during idle disposal waits before opening its next generation", async () => {
  const { fixture, backend, clock, session } = setup(); const disposal = deferred();
  try {
    await session.compile(fixture.request("A")); backend.beforeDispose = () => disposal.promise;
    clock.advance(1000); await flushGate(); expect(session.snapshot().disposing).toBe(1);
    const next = session.compile(fixture.request("B")); await flushGate(); expect(backend.sequence).toBe(1);
    disposal.resolve(); await next; expect(backend.sequence).toBe(2); expect(backend.peak).toBe(1);
  } finally { await session.close(); fixture.remove(); }
});
it("close and idle teardown do not report success after a disposal failure", async () => {
  for (const via of ["close", "idle"] as const) {
    const { fixture, backend, clock, session } = setup();
    try {
      await session.compile(fixture.request()); backend.disposeError = new Error("teardown failed");
      if (via === "idle") { clock.advance(1000); await flushGate(); expect(session.snapshot()).toMatchObject({ state: "disabled", quarantined: 1 }); }
      const close = session.close(); await expect(close).rejects.toThrow("teardown failed"); expect(session.close()).toBe(close);
      expect(session.snapshot()).toMatchObject({ state: "closed", live: 1, quarantined: 1, disposals: 0, cleanupFailures: 1 });
    } finally { fixture.remove(); }
  }
});
it("real session reuses stable inputs and falls back to fresh output when dependency bytes change", async () => {
  const fixture = sessionFixture();
  const fresh = createCompileSession({ settings: { capacity: 2, admission: "immediate" }, mode: "fresh", idleMs: 1000 });
  const retained = createCompileSession({ settings: { capacity: 2, admission: "immediate" }, mode: "immediate", idleMs: 1000 });
  try {
    fixture.put("theme.ts", "export const token = 111;"); fixture.put("A.css.ts", "import { token } from './theme'; export const value = token;");
    const first = await retained.compile(fixture.request()); expect(first).toEqual(await fresh.compile(fixture.request()));
    expect(await retained.compile(fixture.request())).toEqual(await fresh.compile(fixture.request()));
    expect(retained.snapshot().hits).toBe(1);
    fixture.put("theme.ts", "export const token = 222;");
    expect(await retained.compile(fixture.request())).toEqual(await fresh.compile(fixture.request()));
    expect(retained.snapshot()).toMatchObject({ live: 0, hits: 1, lastBypassReason: "source-changed" });
  } finally { await retained.close(); await fresh.close(); fixture.remove(); }
});

it("real retained builds route changing receipt callbacks to the current request", async () => {
  const fixture = sessionFixture(); const calls: string[] = [];
  const session = createCompileSession({ settings: { capacity: 1, admission: "immediate" }, mode: "immediate", idleMs: 1000 });
  try {
    const first = createQualificationReceiptPlugin(() => { calls.push("first"); });
    const second = createQualificationReceiptPlugin(() => { calls.push("second"); });
    await session.compile({ ...fixture.request(), esbuildOptions: { plugins: [first] } });
    await session.compile({ ...fixture.request(), esbuildOptions: { plugins: [second] } });
    expect(calls).toEqual(["first", "second"]); expect(session.snapshot().hits).toBe(1);
  } finally { await session.close(); fixture.remove(); }
});
it("a second project's unrecognised loaded-artifact inventory cannot become retained", async () => {
  const { fixture, backend, session } = setup(); const other = sessionFixture();
  try {
    await session.compile(fixture.request()); await session.compile(other.request());
    expect(session.snapshot()).toMatchObject({ state: "disabled", live: 0, lastBypassReason: "loaded-artifact-changed" });
    other.put("compiler.cjs", "module.exports=2"); await session.compile(other.request()); await session.compile(other.request());
    expect(backend.sequence).toBe(1); expect(session.snapshot().live).toBe(0);
  } finally { await session.close(); fixture.remove(); other.remove(); }
});
