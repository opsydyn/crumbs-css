import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as matrix from "../../../scripts/release-sdk-matrix";

const hash = "a".repeat(64),
  revision = "b".repeat(40);
const expected = {
  tarballSha256: hash,
  sourceRevision: revision,
  packageVersion: "1.2.0",
  tarballIntegrity: "sha512-" + Buffer.alloc(64).toString("base64"),
};
const files = [
  { path: "package.json", sha256: "c".repeat(64) },
  { path: "dist/theme.mjs", sha256: "d".repeat(64) },
];
function receipt(sdk: number): any {
  return {
    schemaVersion: 2,
    sdk,
    contractPassed: true,
    sdkSupported: true,
    source: { revision, dirty: false },
    crumbs: { version: "1.2.0", tarballSha256: hash, files },
    installed: {
      version: "1.2.0",
      fileCount: 2,
      integrity: expected.tarballIntegrity,
      lockSha256: "e".repeat(64),
      versions: {
        expo: `${sdk}.0.0`,
        "react-native":
          sdk === 56 ? "0.85.3" : sdk === 57 ? "0.86.3" : "0.88.0",
      },
    },
    checks: Object.fromEntries(
      [
        "npmResolution",
        "installedBytes",
        "types",
        "motion",
        "exports",
        "runtimeGraph",
      ].map((k) => [k, "passed"]),
    ),
    runtimeBundles: ["ios", "android", "web"].map((platform) => ({
      file: `/app/dist/_expo/static/js/${platform}/index.js.map`,
      crumbs: 1,
    })),
  };
}
function verify(rows: any[]) {
  return (matrix as any).requireSdkReleaseEvidence(rows, expected);
}
function valid() {
  return [56, 57, 58].map(receipt);
}

describe("exact release SDK matrix", () => {
  it("accepts all three clean SDK consumers of the same artifact", () => {
    expect(() => verify(valid())).not.toThrow();
  });
  it("rejects missing and duplicated cohorts rather than counting three reports", () => {
    expect(() => verify(valid().slice(0, 2))).toThrow(/SDK 58/);
    expect(() => verify([receipt(56), receipt(57), receipt(57)])).toThrow(
      /duplicate|SDK 58/,
    );
  });
  it("rejects a passing receipt for different bytes, source or package version", () => {
    for (const mutate of [
      (r: any) => (r.crumbs.tarballSha256 = "f".repeat(64)),
      (r: any) => (r.source.revision = "c".repeat(40)),
      (r: any) => (r.source.dirty = true),
      (r: any) => (r.crumbs.version = "1.1.1"),
      (r: any) => (r.installed.version = "1.1.1"),
      (r: any) => (r.installed.integrity = "sha512-wrong-artifact"),
      (r: any) =>
        (r.crumbs.files = [...files, { path: "extra", sha256: hash }]),
    ]) {
      const rows = valid();
      mutate(rows[2]);
      expect(() => verify(rows)).toThrow(/SDK 58/);
    }
  });
  it("requires every installed, type, motion and runtime export check", () => {
    for (const key of Object.keys(receipt(58).checks)) {
      const rows = valid();
      rows[2].checks[key] = "not-run";
      expect(() => verify(rows)).toThrow(/SDK 58/);
    }
    const rows = valid();
    rows[2].contractPassed = false;
    expect(() => verify(rows)).toThrow(/SDK 58/);
  });
  it("rejects missing platform provenance and mismatched native versions", () => {
    const rows = valid();
    rows[2].runtimeBundles.pop();
    expect(() => verify(rows)).toThrow(/SDK 58/);
    const mismatch = valid();
    mismatch[2].installed.versions["react-native"] = "0.86.3";
    expect(() => verify(mismatch)).toThrow(/SDK 58/);
  });
});

it("seals receipt bytes and rejects independently edited evidence", () => {
  const root = mkdtempSync(join(tmpdir(), "crumbs-sdk-matrix-"));
  try {
    for (const sdk of [56, 57, 58])
      writeFileSync(
        join(root, `sdk-${sdk}-qualification.json`),
        JSON.stringify(receipt(sdk)),
      );
    expect(() =>
      (matrix as any).checkSdkReleaseMatrix(root, expected, true),
    ).not.toThrow();
    expect(() =>
      (matrix as any).checkSdkReleaseMatrix(root, expected),
    ).not.toThrow();
    const path = join(root, "sdk-58-qualification.json");
    writeFileSync(path, readFileSync(path, "utf8") + "\n");
    expect(() => (matrix as any).checkSdkReleaseMatrix(root, expected)).toThrow(
      /receipt hashes/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
