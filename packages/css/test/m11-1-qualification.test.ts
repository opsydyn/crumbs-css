import { expect, test } from "bun:test";
import { assertM11SourceStable, assertM11InstalledRoot, m11Acceptance } from "../../../scripts/m11-1-qualification";
test("qualification rejects a changed source or a workspace package escape", () => {
  expect(() => assertM11SourceStable("before", "after")).toThrow(/Source changed/);
  expect(() => assertM11InstalledRoot("/private/tmp/consumer", "/repo/packages/css")).toThrow(/escaped/);
  expect(() => assertM11InstalledRoot("/private/tmp/consumer", "/private/tmp/consumer/node_modules/@opsydyn/crumbs-css")).not.toThrow();
  expect(() => assertM11InstalledRoot("/private/tmp/consumer", "/private/tmp/consumer-else/node_modules/@opsydyn/crumbs-css")).toThrow(/escaped/);
});
test("host success alone leaves native acceptance incomplete", () => {
  expect(m11Acceptance({ host: "passed", ios: "not-run", android: "not-run" })).toBe("incomplete");
  expect(m11Acceptance({ host: "passed", ios: "passed", android: "passed" })).toBe("passed");
  expect(m11Acceptance({ host: "failed", ios: "passed", android: "passed" })).toBe("failed");
});
