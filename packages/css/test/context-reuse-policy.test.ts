import { expect, it } from "bun:test";
import { clearAdmissionState, createAdmissionState, forgetAdmissionKey, planAdmission, type AdmissionSettings } from "../bench/context-reuse/admission-policy";

it("immediate admission touches successful hits and evicts B after A,B,A,C", () => {
  let state = createAdmissionState({ capacity: 2, admission: "immediate" });
  for (const key of ["A", "B", "A"]) state = planAdmission(state, key).onSuccess;
  expect(state.retained).toEqual(["B", "A"]);
  const plan = planAdmission(state, "C");
  expect(plan.kind).toBe("create");
  expect(plan.evict).toBe("B");
  expect(plan.onSuccess.retained).toEqual(["A", "C"]);
  expect(state.retained).toEqual(["B", "A"]);
});

it("repeat admission promotes A,A and restarts after retained eviction", () => {
  let state = createAdmissionState({ capacity: 1, admission: "repeat" });
  for (const [key, kind] of [["A", "fresh"], ["A", "create"], ["A", "reuse"], ["B", "fresh"], ["B", "create"], ["A", "fresh"]] as const) {
    const plan = planAdmission(state, key);
    expect(plan.kind).toBe(kind);
    state = plan.onSuccess;
  }
  expect(state.retained).toEqual(["B"]);
  expect(state.probation).toEqual(["A"]);
});

it("prunes probation at twice capacity without lifetime frequency", () => {
  let state = createAdmissionState({ capacity: 1, admission: "repeat" });
  for (const key of ["A", "B", "C"]) state = planAdmission(state, key).onSuccess;
  expect(state.probation).toEqual(["B", "C"]);
  expect(planAdmission(state, "A").kind).toBe("fresh");
});

it("forgets failed promotions and retained keys; clears both lists", () => {
  const first = planAdmission(createAdmissionState({ capacity: 2, admission: "repeat" }), "A").onSuccess;
  expect(planAdmission(forgetAdmissionKey(first, "A"), "A").kind).toBe("fresh");
  const retained = planAdmission(first, "A").onSuccess;
  expect(retained.probation).toEqual([]);
  const mixed = planAdmission(retained, "B").onSuccess;
  expect(forgetAdmissionKey(mixed, "A").retained).toEqual([]);
  expect(forgetAdmissionKey(mixed, "B").probation).toEqual([]);
  expect(clearAdmissionState(mixed)).toEqual({ settings: mixed.settings, retained: [], probation: [] });
  expect(mixed.retained).toEqual(["A"]);
  expect(mixed.probation).toEqual(["B"]);
});

it("copies caller settings and freezes every snapshot", () => {
  const settings: { capacity: number; admission: "immediate" } = { capacity: 2, admission: "immediate" };
  const state = createAdmissionState(settings);
  settings.capacity = 9;
  expect(state.settings.capacity).toBe(2);
  const next = planAdmission(state, "A").onSuccess;
  for (const snapshot of [state, next, forgetAdmissionKey(next, "A"), clearAdmissionState(next)]) {
    for (const value of [snapshot, snapshot.settings, snapshot.retained, snapshot.probation]) expect(Object.isFrozen(value)).toBe(true);
  }
  expect(() => (next.retained as string[]).push("B")).toThrow();
  expect(state.retained).toEqual([]);
});

it("rejects malformed settings and unsafe doubled capacity", () => {
  const invalid: unknown[] = [null, undefined, {}, { capacity: 2, admission: "unknown" }];
  for (const capacity of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER, "2", null, undefined]) invalid.push({ capacity, admission: "immediate" });
  for (const settings of invalid) expect(() => createAdmissionState(settings as AdmissionSettings)).toThrow();
  expect(createAdmissionState({ capacity: Math.floor(Number.MAX_SAFE_INTEGER / 2), admission: "repeat" }).retained).toEqual([]);
});

it("rejects invalid keys and preserves exact non-empty strings", () => {
  const state = createAdmissionState({ capacity: 2, admission: "immediate" });
  for (const key of ["", null, undefined, 42]) {
    expect(() => planAdmission(state, key as string)).toThrow();
    expect(() => forgetAdmissionKey(state, key as string)).toThrow();
  }
  expect(planAdmission(state, " ").onSuccess.retained).toEqual([" "]);
});
