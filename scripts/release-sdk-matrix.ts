import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";

type Expected = {
  tarballSha256: string;
  sourceRevision: string;
  packageVersion: string;
  tarballIntegrity: string;
};
const checks = [
  "npmResolution",
  "installedBytes",
  "types",
  "motion",
  "exports",
  "runtimeGraph",
];
const hash = (bytes: Uint8Array | string) =>
  createHash("sha256").update(bytes).digest("hex");
function record(value: unknown, label: string): Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error(`${label}: expected a record`);
  return value as Record<string, any>;
}
/** A compatibility export or flag cannot substitute for a complete installed cohort. */
export function requireSdkReleaseEvidence(
  receipts: readonly unknown[],
  expected: Expected,
): void {
  if (
    !/^[a-f0-9]{64}$/.test(expected.tarballSha256) ||
    !/^[a-f0-9]{40}$/.test(expected.sourceRevision)
  )
    throw Error("Invalid expected artifact/source identity");
  const seen = new Set<number>();
  let inventory: string | undefined;
  for (const item of receipts) {
    const r = record(item, "SDK receipt"),
      sdk = r.sdk,
      label = `SDK ${sdk}`;
    const fail = (detail: string): never => {
      throw Error(`${label}: ${detail}`);
    };
    if (![56, 57, 58].includes(sdk)) fail("unexpected cohort");
    if (seen.has(sdk)) fail("duplicate cohort");
    seen.add(sdk);
    if (
      r.schemaVersion !== 2 ||
      r.contractPassed !== true ||
      r.sdkSupported !== true
    )
      fail("qualification did not pass");
    const source = record(r.source, label),
      crumbs = record(r.crumbs, label),
      installed = record(r.installed, label),
      results = record(r.checks, label);
    if (source.revision !== expected.sourceRevision || source.dirty !== false)
      fail("source revision differs or is dirty");
    if (
      crumbs.tarballSha256 !== expected.tarballSha256 ||
      crumbs.version !== expected.packageVersion ||
      installed.version !== expected.packageVersion
    )
      fail("artifact identity differs");
    for (const check of checks)
      if (results[check] !== "passed") fail(`missing successful ${check}`);
    if (
      typeof installed.lockSha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(installed.lockSha256) ||
      typeof installed.integrity !== "string" ||
      !installed.integrity.startsWith("sha512-")
    )
      fail("missing installed lock/integrity");
    if (installed.integrity !== expected.tarballIntegrity)
      fail("installed tarball integrity differs");
    const versions = record(installed.versions, label),
      native = sdk === 56 ? "0.85.3" : sdk === 57 ? "0.86.3" : "0.88.0";
    if (
      versions["react-native"] !== native ||
      typeof versions.expo !== "string" ||
      !versions.expo.startsWith(`${sdk}.`)
    )
      fail("native/Expo stack differs");
    if (
      !Array.isArray(crumbs.files) ||
      crumbs.files.length === 0 ||
      installed.fileCount !== crumbs.files.length
    )
      fail("installed inventory differs");
    const paths = new Set<string>();
    const files = crumbs.files
      .map((item: unknown) => {
        const file = record(item, label);
        if (
          typeof file.path !== "string" ||
          file.path.startsWith("/") ||
          file.path.split("/").includes("..") ||
          paths.has(file.path) ||
          !/^[a-f0-9]{64}$/.test(file.sha256)
        )
          fail("invalid package inventory");
        paths.add(file.path);
        return { path: file.path, sha256: file.sha256 };
      })
      .sort((a: { path: string }, b: { path: string }) =>
        a.path.localeCompare(b.path),
      );
    const identity = JSON.stringify(files);
    if (inventory !== undefined && inventory !== identity)
      fail("package inventory differs across SDKs");
    inventory = identity;
    if (!Array.isArray(r.runtimeBundles)) fail("missing runtime maps");
    for (const platform of ["ios", "android", "web"])
      if (
        !r.runtimeBundles.some(
          (map: any) =>
            typeof map?.file === "string" &&
            map.file
              .replaceAll("\\", "/")
              .includes(`/static/js/${platform}/`) &&
            map.crumbs > 0,
        )
      )
        fail(`missing ${platform} runtime provenance`);
  }
  for (const sdk of [56, 57, 58])
    if (!seen.has(sdk)) throw Error(`SDK ${sdk}: missing qualification`);
}

export function checkSdkReleaseMatrix(
  bundle: string,
  expected: Expected,
  seal = false,
): void {
  const entries = [56, 57, 58].map((sdk) => {
    const file = `sdk-${sdk}-qualification.json`,
      bytes = readFileSync(join(bundle, file));
    return {
      sdk,
      file,
      sha256: hash(bytes),
      receipt: JSON.parse(bytes.toString()),
    };
  });
  requireSdkReleaseEvidence(
    entries.map((e) => e.receipt),
    expected,
  );
  const manifest = {
    formatVersion: 1,
    ...expected,
    receipts: entries.map(({ receipt, ...entry }) => entry),
  };
  const path = join(bundle, "sdk-matrix.json");
  if (seal) writeFileSync(path, JSON.stringify(manifest, null, 2) + "\n");
  else if (!isDeepStrictEqual(JSON.parse(readFileSync(path, "utf8")), manifest))
    throw Error("SDK matrix identity or receipt hashes differ");
}
if (import.meta.main) {
  const [action, bundle, tarball, revision, ...extra] = process.argv.slice(2);
  if (
    !["create", "verify"].includes(action ?? "") ||
    !bundle ||
    !tarball ||
    !revision ||
    extra.length
  )
    throw Error(
      "Expected: release-sdk-matrix.ts create|verify bundle tarball source-revision",
    );
  const bytes = readFileSync(resolve(tarball)),
    pkg = JSON.parse(
      readFileSync(
        new URL("../packages/css/package.json", import.meta.url),
        "utf8",
      ),
    );
  checkSdkReleaseMatrix(
    resolve(bundle),
    {
      tarballSha256: hash(bytes),
      tarballIntegrity:
        "sha512-" + createHash("sha512").update(bytes).digest("base64"),
      sourceRevision: revision,
      packageVersion: pkg.version,
    },
    action === "create",
  );
  console.log("Exact SDK56/57/58 release matrix verified");
}
