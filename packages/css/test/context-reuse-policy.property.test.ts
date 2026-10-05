import { expect, it } from "bun:test";
import fc from "fast-check";
import { clearAdmissionState, createAdmissionState, forgetAdmissionKey, planAdmission } from "../bench/context-reuse/admission-policy";

it("matches an independent timestamp model across bounded admission traces", () => {
  const event = fc.record({ action: fc.constantFrom("success", "abort", "forget", "clear"), key: fc.constantFrom(..."ABCDEFGHIJKLMNOP") });
  fc.assert(fc.property(
    fc.integer({ min: 1, max: 16 }), fc.constantFrom("immediate" as const, "repeat" as const),
    fc.array(event, { minLength: 1, maxLength: 200 }),
    (capacity, admission, events) => {
      let state = createAdmissionState({ capacity, admission });
      const retained = new Map<string, number>();
      const probation = new Map<string, number>();
      let tick = 0;
      const ordered = (map: Map<string, number>) => [...map].sort((a, b) => a[1] - b[1]).map(([key]) => key);
      const snapshots: { state: typeof state; bytes: string }[] = [];
      for (const { action, key } of events) {
        snapshots.push({ state, bytes: JSON.stringify(state) });
        if (action === "clear") {
          state = clearAdmissionState(state);
          retained.clear(); probation.clear();
        } else if (action === "forget") {
          state = forgetAdmissionKey(state, key);
          retained.delete(key); probation.delete(key);
        } else {
          const plan = planAdmission(state, key);
          const kind = retained.has(key) ? "reuse" : admission === "immediate" || probation.has(key) ? "create" : "fresh";
          const victim = kind === "create" && retained.size === capacity ? ordered(retained)[0] : undefined;
          expect(plan.kind).toBe(kind);
          expect(plan.evict).toBe(victim);
          expect(plan.key).toBe(key);
          if (action === "success") {
            tick++;
            if (kind === "fresh") {
              probation.set(key, tick);
              if (probation.size > 2 * capacity) probation.delete(ordered(probation)[0]!);
            } else {
              if (victim !== undefined) retained.delete(victim);
              probation.delete(key);
              retained.set(key, tick);
            }
            state = plan.onSuccess;
          }
        }
        expect(state.retained).toEqual(ordered(retained));
        expect(state.probation).toEqual(ordered(probation));
        expect(state.retained.length).toBeLessThanOrEqual(capacity);
        expect(state.probation.length).toBeLessThanOrEqual(2 * capacity);
        expect(new Set([...state.retained, ...state.probation]).size).toBe(state.retained.length + state.probation.length);
      }
      for (const snapshot of snapshots) {
        expect(JSON.stringify(snapshot.state)).toBe(snapshot.bytes);
        for (const value of [snapshot.state, snapshot.state.settings, snapshot.state.retained, snapshot.state.probation]) expect(Object.isFrozen(value)).toBe(true);
      }
    },
  ), { seed: 10505, numRuns: 500 });
});
