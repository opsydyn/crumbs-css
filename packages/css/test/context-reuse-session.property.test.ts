import { expect, it } from "bun:test";
import fc from "fast-check";
import { createCompileSession } from "../bench/context-reuse/compile-session";
import { ControlledBackend, ControlledClock, flushGate, sessionFixture } from "./support/context-reuse";

it("matches independent resource ownership traces, including failures and cleanup quarantine", async () => {
  const event = fc.record({ action: fc.constantFrom("success", "build-fail", "create-fail", "native-fail", "invalidate", "idle", "cleanup-fail"), key: fc.constantFrom("A", "B", "C", "D") });
  await fc.assert(fc.asyncProperty(fc.integer({ min: 1, max: 4 }), fc.constantFrom("immediate" as const, "repeat" as const), fc.array(event, { minLength: 1, maxLength: 200 }), async (capacity, admission, events) => {
    const fixture = sessionFixture(); const backend = new ControlledBackend(); const clock = new ControlledClock();
    const session = createCompileSession({ settings: { capacity, admission }, mode: admission, idleMs: 1000, backend, clock });
    const owned = new Map<string, number>(); const probation = new Map<string, number>(); let time = 0; let disabled = false; let quarantine = 0;
    const oldest = (map: Map<string, number>) => [...map].sort((a, b) => a[1] - b[1])[0]?.[0];
    try {
      for (const { action, key } of events) {
        backend.buildError = undefined; backend.createError = undefined; backend.disposeError = undefined;
        if (action === "invalidate" || action === "idle" || action === "cleanup-fail") {
          if (action === "cleanup-fail" && owned.size > 0) {
            backend.disposeError = new Error("cleanup model failure"); quarantine += owned.size; disabled = true;
          }
          if (action === "idle") { clock.advance(1000); await flushGate(); }
          else { try { await session.invalidate(action); } catch (error) { expect(action).toBe("cleanup-fail"); } }
          owned.clear(); probation.clear();
        } else {
          const kind = disabled ? "fresh" : owned.has(key) ? "reuse" : admission === "immediate" || probation.has(key) ? "create" : "fresh";
          const victim = kind === "create" && owned.size === capacity ? oldest(owned) : undefined;
          if (victim !== undefined) owned.delete(victim);
          if (action === "build-fail") backend.buildError = new Error("build model failure");
          if (action === "create-fail") backend.createError = new Error("create model failure");
          const fails = action === "build-fail" || action === "native-fail" || (action === "create-fail" && kind === "create");
          let caught: unknown;
          try {
            await session.runNative(fixture.request(key), async () => { if (action === "native-fail") throw new Error("native model failure"); return key; });
          } catch (error) { caught = error; }
          expect(caught !== undefined).toBe(fails);
          if (fails) { owned.delete(key); probation.delete(key); }
          else if (!disabled) {
            time++;
            if (kind === "fresh") { probation.set(key, time); if (probation.size > 2 * capacity) probation.delete(oldest(probation)!); }
            else { probation.delete(key); owned.set(key, time); }
          }
        }
        const snapshot = session.snapshot();
        expect(snapshot.live).toBe(owned.size + quarantine);
        expect(snapshot.retained).toBe(owned.size);
        expect(snapshot.probation).toBe(probation.size);
        expect(snapshot.quarantined).toBe(quarantine);
        expect(snapshot.state).toBe(disabled ? "disabled" : "open");
        expect(snapshot.creating).toBe(0); expect(snapshot.disposing).toBe(0);
        expect(backend.peak).toBeLessThanOrEqual(capacity);
        expect(snapshot.live).toBeLessThanOrEqual(capacity);
      }
    } finally {
      backend.disposeError = undefined;
      let closeFailed = false;
      try { await session.close(); } catch { closeFailed = true; }
      expect(closeFailed).toBe(quarantine > 0);
      expect(session.snapshot().live).toBe(quarantine);
      fixture.remove();
    }
  }), { seed: 10506, numRuns: 500 });
}, 120000);
