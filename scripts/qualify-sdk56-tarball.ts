import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve, isAbsolute } from "node:path";
import { stage, packageName } from "./playground";
import { verifyInstalledArtifact } from "./packed-distribution-contract";
import {
  verifyCandidatePackageFiles,
  stagePureMotionProbe,
  assertSdkNodeVersion,
} from "./playground-sdk-candidate";
import { verifyRuntimeBundles } from "./runtime-bundle-contract";

export const sdk56NpmPeerArguments = Object.freeze([
  "--strict-peer-deps",
  "--no-legacy-peer-deps",
  "--no-force",
]);

/** Retained SDK56, consuming the supplied artifact without rebuilding or repacking. */
async function main() {
  const [tarballArg, outputArg, ...extra] = process.argv.slice(2);
  if (
    !tarballArg?.endsWith(".tgz") ||
    !outputArg ||
    extra.length ||
    !isAbsolute(tarballArg) ||
    !isAbsolute(outputArg)
  )
    throw Error(
      "Expected: qualify-sdk56-tarball.ts /absolute/package.tgz /absolute/qualification.json",
    );
  const tarball = resolve(tarballArg),
    output = resolve(outputArg),
    repo = resolve(import.meta.dir, ".."),
    pkgRoot = join(repo, "packages/css");
  const logs = join(dirname(output), "sdk-56-logs");
  await mkdir(logs, { recursive: true });
  const temporary = await mkdtemp(join(tmpdir(), "crumbs-sdk56-release-"));
  const hash = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
  const bytes = await readFile(tarball),
    checks: Record<string, string> = {};
  const report: Record<string, any> = {
    schemaVersion: 2,
    sdk: 56,
    contractPassed: false,
    sdkSupported: false,
    checks,
    recordedAt: new Date().toISOString(),
    nativeDeviceAcceptance: "not-run",
    performanceQualification: "not-run",
  };
  async function run(
    label: string,
    args: string[],
    cwd: string,
    extraEnv: Record<string, string> = {},
  ) {
    console.log("SDK56: " + label);
    const child = Bun.spawn(args, {
      cwd,
      env: {
        ...process.env,
        CI: "1",
        EXPO_NO_METRO_WORKSPACE_ROOT: "1",
        EXPO_NO_TELEMETRY: "1",
        npm_config_cache: join(temporary, "npm-cache"),
        npm_config_legacy_peer_deps: "false",
        npm_config_force: "false",
        npm_config_strict_peer_deps: "true",
        ...extraEnv,
      },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exit] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    await writeFile(join(logs, label + ".log"), stdout + "\n" + stderr);
    if (exit !== 0) throw Error(`${label} failed (${exit}); see ${logs}`);
    return stdout.trim();
  }
  try {
    assertSdkNodeVersion(
      await run("node-version", ["node", "--version"], repo),
    );
    const pkg = JSON.parse(
      await readFile(join(pkgRoot, "package.json"), "utf8"),
    );
    const pack = JSON.parse(
      await run(
        "inventory",
        ["npm", "pack", "--dry-run", "--ignore-scripts", "--json"],
        pkgRoot,
      ),
    );
    const files = await Promise.all(
      pack[0].files.map(async (f: { path: string }) => ({
        path: f.path,
        sha256: hash(await readFile(join(pkgRoot, f.path))),
      })),
    );
    report.crumbs = { version: pkg.version, tarballSha256: hash(bytes), files };
    report.source = {
      revision: await run(
        "source-revision",
        ["git", "rev-parse", "HEAD"],
        repo,
      ),
      dirty:
        (
          await run(
            "source-status",
            ["git", "status", "--porcelain", "--untracked-files=no"],
            repo,
          )
        ).length > 0,
    };
    const consumer = await stage("file:" + tarball, temporary, { sdk: 56 });
    report.consumer = consumer;
    const wanted = JSON.parse(
      await readFile(join(consumer, "package.json"), "utf8"),
    );
    await run(
      "npm-resolution",
      [
        "npm",
        "install",
        "--package-lock-only",
        ...sdk56NpmPeerArguments,
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
      ],
      consumer,
    );
    checks.npmResolution = "passed";
    await run(
      "install",
      ["npm", "ci", ...sdk56NpmPeerArguments, "--no-audit", "--no-fund"],
      consumer,
    );
    const installed = await verifyInstalledArtifact(consumer, pkg);
    await verifyCandidatePackageFiles(installed.packageRoot, files);
    const lockBytes = await readFile(join(consumer, "package-lock.json")),
      lock = JSON.parse(lockBytes.toString()),
      integrity =
        "sha512-" + createHash("sha512").update(bytes).digest("base64");
    if (lock.packages["node_modules/" + packageName]?.integrity !== integrity)
      throw Error("Installed SDK56 lock integrity differs");
    const versions: Record<string, string> = {};
    for (const name of Object.keys({
      ...wanted.dependencies,
      ...wanted.devDependencies,
    })) {
      if (name === packageName) continue;
      const actual = JSON.parse(
        await readFile(
          join(consumer, "node_modules", name, "package.json"),
          "utf8",
        ),
      ).version;
      const requested = { ...wanted.dependencies, ...wanted.devDependencies }[
        name
      ];
      if (!Bun.semver.satisfies(actual, requested))
        throw Error(
          "Installed SDK56 version differs: " +
            name +
            " " +
            actual +
            " vs " +
            requested,
        );
      versions[name] = actual;
    }
    report.installed = {
      ...installed,
      version: pkg.version,
      integrity,
      lockSha256: hash(lockBytes),
      fileCount: files.length,
      versions,
    };
    checks.installedBytes = "passed";
    await writeFile(join(logs, "package-lock.json"), lockBytes);
    const fixtures = join(pkgRoot, "fixtures/packed-distribution/app");
    await mkdir(join(consumer, "test"));
    for (const name of [
      "motion.integration.tsx",
      "motion-peer.cjs",
      "motion.node.mjs",
      "motion-control-values.json",
    ])
      await cp(join(fixtures, "test", name), join(consumer, "test", name));
    await cp(
      join(fixtures, "src/motion.types.tsx"),
      join(consumer, "src/motion.types.tsx"),
    );
    await cp(
      installed.packageRoot,
      join(dirname(installed.packageRoot), "crumbs-css-copy"),
      { recursive: true },
    );
    const config = JSON.parse(
      await run(
        "type-config",
        [join(consumer, "node_modules/.bin/tsc"), "--showConfig"],
        consumer,
      ),
    );
    if (config.compilerOptions?.strict !== true)
      throw Error("SDK56 consumer must use strict types");
    await run(
      "types",
      [join(consumer, "node_modules/.bin/tsc"), "--noEmit"],
      consumer,
    );
    checks.types = "passed";
    for (const order of ["esm-first", "cjs-first"])
      await run(
        "motion-" + order,
        ["bun", "test", "./test/motion.integration.tsx"],
        consumer,
        { CRUMBS_IMPORT_ORDER: order },
      );
    const pure = await stagePureMotionProbe(
      consumer,
      installed.packageRoot,
      temporary,
    );
    for (const format of ["esm", "cjs"])
      await run(
        "motion-pure-" + format,
        ["node", "test/motion.node.mjs", format],
        pure,
      );
    checks.motion = "passed";
    await run(
      "exports",
      [
        join(consumer, "node_modules/.bin/expo"),
        "export",
        "--platform",
        "all",
        "--source-maps",
      ],
      consumer,
    );
    checks.exports = "passed";
    report.runtimeBundles = await verifyRuntimeBundles(join(consumer, "dist"));
    checks.runtimeGraph = "passed";
    await verifyCandidatePackageFiles(installed.packageRoot, files);
    if (hash(await readFile(tarball)) !== hash(bytes))
      throw Error("SDK56 tarball changed during qualification");
    for (const file of files)
      if (hash(await readFile(join(pkgRoot, file.path))) !== file.sha256)
        throw Error("Package input changed: " + file.path);
    report.contractPassed = true;
    report.sdkSupported = true;
  } catch (error) {
    report.failure = String(error);
    throw error;
  } finally {
    await writeFile(output, JSON.stringify(report, null, 2) + "\n");
    await rm(temporary, { recursive: true, force: true });
  }
}
if (import.meta.main) await main();
