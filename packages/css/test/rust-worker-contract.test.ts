import { describe, expect, it } from "bun:test";
import * as runner from "../../../scripts/playground-sdk-candidate";
const expected = {
  app: "src/rust-probe.ts",
  dependency: "node_modules/@crumbs/rust-probe/index.js",
};
describe("SDK 58 actual Rust execution contract", () => {
  it("rejects flag-only and all-Babel success", () => {
    expect(typeof runner.assertRustWorkerEvidence).toBe("function");
    expect(() => runner.assertRustWorkerEvidence([], expected)).toThrow("Rust");
    expect(() =>
      runner.assertRustWorkerEvidence(
        [{ _e: "transform:babel", file: expected.app }],
        expected,
      ),
    ).toThrow("Rust");
  });
  it("requires both eligible app and dependency completion, not just fallback events", () => {
    expect(typeof runner.assertRustWorkerEvidence).toBe("function");
    const app = {
      _e: "transform:noxcturnal:full",
      file: expected.app,
      status: "complete",
    };
    expect(() => runner.assertRustWorkerEvidence([app], expected)).toThrow(
      "dependency",
    );
    expect(() =>
      runner.assertRustWorkerEvidence(
        [app, { ...app, file: expected.dependency, status: "fallback" }],
        expected,
      ),
    ).toThrow("dependency");
    expect(
      runner.assertRustWorkerEvidence(
        [app, { ...app, file: expected.dependency }],
        expected,
      ).rustFiles,
    ).toEqual([expected.app, expected.dependency]);
  });
  it("retains explicit upstream fallback reasons without calling fallback Rust success", () => {
    expect(typeof runner.assertRustWorkerEvidence).toBe("function");
    const records = [
      ...Object.values(expected).map((file) => ({
        _e: "transform:noxcturnal:full",
        file,
        status: "complete",
      })),
      {
        _e: "transform:noxcturnal:fallback",
        file: "src/worklet.ts",
        reason: "full-metro:react-native-worklets",
      },
    ];
    expect(
      runner.assertRustWorkerEvidence(records, expected).fallbacks,
    ).toEqual([
      { file: "src/worklet.ts", reason: "full-metro:react-native-worklets" },
    ]);
  });
});


it("reports cache-hit events without certifying fresh Rust execution", async () => {
  const { summarizeRustWorkerEvents, assertRustWorkerEvidence } = await import("../../../scripts/sdk-worker-evidence");
  expect(summarizeRustWorkerEvents([])).toEqual({ rustFiles: [], fallbacks: [] });
  expect(() => assertRustWorkerEvidence([], expected)).toThrow("Missing actual Rust completion");
});

it("rejects source or configuration changes in an environment-only cache transition", async () => {
  const { assertEnvironmentOnlyInputs } = await import("../../../scripts/sdk-worker-evidence");
  const primed = { "src/rust-probe.ts": "entry-rust", "app.json": "rust-enabled" };
  expect(() => assertEnvironmentOnlyInputs(primed, { ...primed, "src/rust-probe.ts": "entry-rust-env" })).toThrow("src/rust-probe.ts");
  expect(() => assertEnvironmentOnlyInputs(primed, { ...primed, "app.json": "changed" })).toThrow("app.json");
  expect(() => assertEnvironmentOnlyInputs(primed, { ...primed })).not.toThrow();
});
