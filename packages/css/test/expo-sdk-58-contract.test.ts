import { describe, expect, it } from "bun:test";
import {
  assessPeerCompatibility,
  assertSdkNodeVersion,
  parseSdkCandidateArgs,
} from "../../../scripts/playground-sdk-candidate";
import { parseArgs, stage } from "../../../scripts/playground";
import ts from "typescript";
import { mkdtemp, readFile, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import manifest from "../package.json";
const candidate = {
  schemaVersion: 1 as const,
  observedAt: "2026-10-16",
  observed: {
    expoTag: "latest" as const,
    expoVersion: "58.0.11",
    templateVersion: "58.0.20",
  },
  dependencies: { expo: "58.0.11", react: "19.3.0", "react-native": "0.88.0" },
  devDependencies: { typescript: "6.0.3" },
  expectedOutcome: {
    kind: "peer-blocked" as const,
    packagePeer: ">=0.85 <0.87",
  },
};

describe("SDK 58 qualification boundaries", () => {
  it("admits RN 0.88 in the unpublished candidate without admitting RN 0.87", () => {
    expect(
      assessPeerCompatibility(
        candidate,
        manifest.peerDependencies["react-native"],
      ).compatible,
    ).toBe(true);
    expect(
      assessPeerCompatibility(
        {
          ...candidate,
          dependencies: { ...candidate.dependencies, "react-native": "0.87.0" },
        },
        manifest.peerDependencies["react-native"],
      ).compatible,
    ).toBe(false);
  });
  it("can retain an owned SDK install for subsequent worker qualification", () => {
    expect(parseSdkCandidateArgs(["--sdk=58", "--keep"]).keep).toBe(true);
    expect(parseSdkCandidateArgs([]).keep).toBe(false);
    expect(() => parseSdkCandidateArgs(["--keep", "--keep"])).toThrow();
  });
  it("selects SDK 58 explicitly and retains SDK 57 default", () => {
    expect(parseSdkCandidateArgs([]).sdk).toBe(57);
    expect(
      parseSdkCandidateArgs(["--sdk=58", "--pinned", "receipt.json"]),
    ).toMatchObject({ sdk: 58, pinned: true, output: "receipt.json" });
    for (const args of [
      ["--sdk=59"],
      ["--sdk=58", "--sdk=57"],
      ["--sdk=58", "--sdk=58"],
    ])
      expect(() => parseSdkCandidateArgs(args)).toThrow();
  });
  it("admits only the qualified stable RN intervals", () => {
    const peer = ">=0.85 <0.87 || >=0.88 <0.89";
    for (const [version, want] of [
      ["0.84.0", false],
      ["0.85.3", true],
      ["0.86.3", true],
      ["0.87.0", false],
      ["0.88.0", true],
      ["0.89.0", false],
    ] as const)
      expect(
        assessPeerCompatibility(
          {
            ...candidate,
            dependencies: {
              ...candidate.dependencies,
              "react-native": version,
            },
          },
          peer,
        ).compatible,
      ).toBe(want);
    for (const peer of [
      ">=0.85 || >=0.88",
      ">=0.85 <0.87 ||",
      ">=0.89 <0.88",
      ">=0.85 <0.87 || >=0.88",
    ])
      expect(() => assessPeerCompatibility(candidate, peer)).toThrow();
    expect(() =>
      assessPeerCompatibility(
        {
          ...candidate,
          dependencies: {
            ...candidate.dependencies,
            "react-native": "0.88.0-rc.1",
          },
        },
        peer,
      ),
    ).toThrow();
  });
  it("enforces SDK 58's genuine Node engine boundaries", () => {
    for (const version of [
      "v22.13.0",
      "v24.3.0",
      "v24.15.0",
      "v26.0.0",
      "v27.0.0",
    ])
      expect(() => assertSdkNodeVersion(version, 58)).not.toThrow();
    for (const version of [
      "v22.12.9",
      "v23.0.0",
      "v24.0.0",
      "v25.0.0",
      "v24.3.0-rc.1",
      "not-node",
    ])
      expect(() => assertSdkNodeVersion(version, 58)).toThrow();
  });
  it("retains explicit installed SDK profiles and rejects conflicting selectors", () => {
    expect(parseArgs(["packed", "--sdk=57"]).sdk).toBe(57);
    expect(parseArgs(["packed", "--sdk=58"]).sdk).toBe(58);
    expect(() => parseArgs(["packed", "--sdk=56", "--sdk=58"])).toThrow();
    expect(() => parseArgs(["workspace", "--sdk=58"])).toThrow();
  });
  it("retains SDK 56 with matching optional peers and a compatible React patch", async () => {
    const parent = await mkdtemp(join(tmpdir(), "crumbs-sdk56-cohort-test-"));
    try {
      const directory = await stage("file:/tmp/crumbs.tgz", parent, {
        sdk: 56,
      });
      const manifest = JSON.parse(
        await readFile(join(directory, "package.json"), "utf8"),
      );
      expect(manifest.dependencies["react-native"]).toBe("0.85.3");
      expect(manifest.dependencies.react).toBe("19.2.8");
      expect(manifest.devDependencies["react-native-worklets"]).toBe("0.8.3");
      expect(manifest.devDependencies["@expo/ui"]).toBe("56.0.10");
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });
  it("resolves export-only native declarations in the staged SDK 58 app", async () => {
    const parent = await mkdtemp(join(tmpdir(), "crumbs-native-exports-test-"));
    try {
      const dir = await stage("file:/tmp/crumbs.tgz", parent, { sdk: 58 });
      const native = join(dir, "node_modules/react-native");
      await mkdir(join(native, "types_generated"), { recursive: true });
      await writeFile(
        join(native, "package.json"),
        JSON.stringify({
          name: "react-native",
          exports: {
            ".": {
              types: "./types_generated/index.d.ts",
              default: "./index.js",
            },
          },
        }),
      );
      await writeFile(
        join(native, "types_generated/index.d.ts"),
        "export interface ViewStyle {opacity?:number}",
      );
      await writeFile(
        join(native, "index.js"),
        "export const View = undefined",
      );
      const config = JSON.parse(
        await readFile(join(dir, "tsconfig.json"), "utf8"),
      );
      const options = ts.parseJsonConfigFileContent(
        {
          compilerOptions: {
            ...config.compilerOptions,
            moduleResolution: "bundler",
          },
        },
        ts.sys,
        dir,
      ).options;
      expect(
        ts.resolveModuleName(
          "react-native",
          join(dir, "src/App.tsx"),
          options,
          ts.sys,
        ).resolvedModule?.resolvedFileName,
      ).toBe(join(native, "types_generated/index.d.ts"));
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });
  it("stages SDK 58 without altering SDK 57's installed profile", async () => {
    const parent = await mkdtemp(join(tmpdir(), "crumbs-sdk58-stage-test-"));
    try {
      for (const [sdk, expo] of [
        [57, "57.0.27"],
        [58, "58.0.11"],
      ] as const) {
        const dir = await stage("file:/tmp/crumbs.tgz", parent, { sdk });
        const manifest = JSON.parse(
          await readFile(join(dir, "package.json"), "utf8"),
        );
        expect(manifest.dependencies.expo).toBe(expo);
        expect(manifest.dependencies["@opsydyn/crumbs-css"]).toBe(
          "file:/tmp/crumbs.tgz",
        );
        expect(manifest.exports["./runtime-extensions"].default).toBe(
          "./src/shared-storybook/components/runtime-extensions/runtime.tsx",
        );
      }
      await expect(
        stage("file:/tmp/crumbs.tgz", parent, { sdk56: true, sdk: 58 }),
      ).rejects.toThrow();
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });
});
