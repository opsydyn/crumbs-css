import { expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sdk56NpmPeerArguments } from "../../../scripts/qualify-sdk56-tarball";

test("SDK56 qualification rejects conflicting peers despite inherited npm bypasses", () => {
  const root = mkdtempSync(join(tmpdir(), "crumbs-sdk56-peer-policy-"));
  try {
    const env = {
      ...process.env,
      npm_config_cache: join(root, "cache"),
      npm_config_userconfig: join(root, "user.npmrc"),
      npm_config_globalconfig: join(root, "global.npmrc"),
    };
    writeFileSync(env.npm_config_globalconfig, "");
    for (const [name, version, peers] of [
      ["provider", "2.0.0", {}],
      ["consumer", "1.0.0", { "@fixture/crumbs-peer-provider": "^1.0.0" }],
    ] as const) {
      const folder = join(root, name);
      mkdirSync(folder);
      writeFileSync(
        join(folder, "package.json"),
        JSON.stringify({
          name: "@fixture/crumbs-peer-" + name,
          version,
          peerDependencies: peers,
        }),
      );
      const packed = Bun.spawnSync(
        [
          "npm",
          "pack",
          "--ignore-scripts",
          "--json",
          "--pack-destination",
          root,
        ],
        { cwd: folder, env, stdout: "pipe", stderr: "pipe" },
      );
      expect(packed.exitCode).toBe(0);
    }
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({
        name: "strict-peer-control",
        private: true,
        dependencies: {
          "@fixture/crumbs-peer-provider":
            "file:./fixture-crumbs-peer-provider-2.0.0.tgz",
          "@fixture/crumbs-peer-consumer":
            "file:./fixture-crumbs-peer-consumer-1.0.0.tgz",
        },
      }),
    );
    for (const poison of ["env", "config"]) {
      writeFileSync(
        env.npm_config_userconfig,
        poison === "config" ? "legacy-peer-deps=true\nforce=true\n" : "",
      );
      const poisoned = {
        ...env,
        ...(poison === "env"
          ? { npm_config_legacy_peer_deps: "true", npm_config_force: "true" }
          : {}),
      };
      const resolution = Bun.spawnSync(
        [
          "npm",
          "install",
          "--package-lock-only",
          "--offline",
          "--ignore-scripts",
          "--no-audit",
          "--no-fund",
          ...sdk56NpmPeerArguments,
        ],
        { cwd: root, env: poisoned, stdout: "pipe", stderr: "pipe" },
      );
      expect(resolution.exitCode).not.toBe(0);
      expect(resolution.stderr.toString()).toContain("ERESOLVE");
      rmSync(join(root, "package-lock.json"), { force: true });
    }
    // A lockfile created with bypasses must not make npm ci acceptable either.
    const poisoned = {
      ...env,
      npm_config_legacy_peer_deps: "true",
      npm_config_force: "true",
    };
    const common = ["--offline", "--ignore-scripts", "--no-audit", "--no-fund"];
    const bypassed = Bun.spawnSync(
      ["npm", "install", "--package-lock-only", ...common],
      { cwd: root, env: poisoned, stdout: "pipe", stderr: "pipe" },
    );
    expect(bypassed.exitCode).toBe(0);
    const ci = Bun.spawnSync(
      ["npm", "ci", ...common, ...sdk56NpmPeerArguments],
      { cwd: root, env: poisoned, stdout: "pipe", stderr: "pipe" },
    );
    expect(ci.exitCode).not.toBe(0);
    expect(ci.stderr.toString()).toContain("ERESOLVE");
    rmSync(join(root, "package-lock.json"), { force: true });
    // A compatible cohort still resolves and installs under the same poisoned host.
    writeFileSync(
      join(root, "provider/package.json"),
      JSON.stringify({
        name: "@fixture/crumbs-peer-provider",
        version: "1.0.0",
      }),
    );
    expect(
      Bun.spawnSync(
        [
          "npm",
          "pack",
          "--ignore-scripts",
          "--json",
          "--pack-destination",
          root,
        ],
        { cwd: join(root, "provider"), env, stdout: "pipe", stderr: "pipe" },
      ).exitCode,
    ).toBe(0);
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({
        name: "strict-peer-control",
        private: true,
        dependencies: {
          "@fixture/crumbs-peer-provider":
            "file:./fixture-crumbs-peer-provider-1.0.0.tgz",
          "@fixture/crumbs-peer-consumer":
            "file:./fixture-crumbs-peer-consumer-1.0.0.tgz",
        },
      }),
    );
    for (const args of [["install", "--package-lock-only"], ["ci"]]) {
      const valid = Bun.spawnSync(
        ["npm", ...args, ...common, ...sdk56NpmPeerArguments],
        { cwd: root, env: poisoned, stdout: "pipe", stderr: "pipe" },
      );
      expect(valid.exitCode).toBe(0);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 30000);
