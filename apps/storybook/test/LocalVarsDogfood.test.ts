import { expect, test } from "bun:test";
import { initialLocalCards, updateLocalCardA } from "../src/components/local-vars-model";
test("card A replaces its complete snapshot without changing card B", () => {
  const initial = initialLocalCards();
  expect(initial).toEqual({ a: { accent: "#2457d6", alpha: .25 }, b: { accent: "#c42f73", alpha: .75 } });
  const updated = updateLocalCardA(initial, "opacity");
  expect(updated.a).toEqual({ accent: "#2457d6", alpha: .5 });
  expect(updated.b).toBe(initial.b);
  const accentCleared = updateLocalCardA(updated, "accent-clear");
  expect(accentCleared.a).toEqual({ alpha: .5 });
  expect(accentCleared.b).toBe(initial.b);
  const cleared = updateLocalCardA(accentCleared, "clear");
  expect(cleared.a).toEqual({});
  expect(cleared.b).toBe(initial.b);
});
