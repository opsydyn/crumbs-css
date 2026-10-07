import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

export type ClosedResolutionDomain = Readonly<{
  configurationFiles: readonly string[]; symlinkPaths: readonly string[]; allowedInputRoots: readonly string[];
  loadedArtifacts: readonly string[]; installationFiles: readonly string[];
}>;
export type ConfigurationReceipt = Readonly<{
  fingerprint: string; versions: Readonly<{ esbuild: string; integration: string }>;
  files: readonly Readonly<{ path: string; sha256: string }>[];
  symlinks: readonly Readonly<{ logicalPath: string; targetPath: string }>[];
}>;
export type CompileRequest = Readonly<{
  filePath: string; cwd: string; identOption: "debug" | "short";
  esbuildOptions: Readonly<Record<string, unknown>>; domain: ClosedResolutionDomain; entryBytes?: Uint8Array;
}>;
export const reuseReasons = Object.freeze([
  "unknown-build-option", "unknown-plugin", "incomplete-resolution-domain", "configuration-changed", "entry-buffer-mismatch",
  "source-changed", "source-unstable", "loaded-artifact-changed", "package-info-changed",
] as const);
export type ReuseReason = typeof reuseReasons[number];
export type ReuseEligibility = Readonly<
  { kind: "eligible"; key: string; receipt: ConfigurationReceipt } |
  { kind: "fresh" | "restart-required"; reason: ReuseReason }
>;
class IdentityError extends Error {
  constructor(readonly reason: ReuseReason) { super(reason); }
}
const fail = (reason: ReuseReason): never => { throw new IdentityError(reason); };
const sha = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const absolute = (cwd: string, paths: readonly string[]) => [...new Set(paths.map(path => resolve(cwd, path)))].sort();
const within = (root: string, path: string) => { const part = relative(root, path); return part === "" || (!isAbsolute(part) && part !== ".." && !part.startsWith("../")); };

// Resolve the actual esbuild used by the installed integration, rather than an unrelated top-level package.
const require = createRequire(import.meta.url);
const integrationManifest = require.resolve("@vanilla-extract/integration/package.json");
const integrationEntry = require.resolve("@vanilla-extract/integration");
const integrationRequire = createRequire(integrationManifest);
const esbuildManifest = integrationRequire.resolve("esbuild/package.json");
const esbuildEntry = integrationRequire.resolve("esbuild");
// The CJS entry is a dispatcher, so hash every implementation it can select as well.
const integrationImplementations = readdirSync(dirname(integrationEntry)).filter(name => /\.(?:cjs|mjs|js)$/.test(name)).map(name => join(dirname(integrationEntry), name));
const compilerFiles = [integrationManifest, integrationEntry, ...integrationImplementations, esbuildManifest, esbuildEntry];
const loadedEnvironment = { NODE_ENV: process.env.NODE_ENV, NODE_PATH: process.env.NODE_PATH };
const version = (path: string): string => JSON.parse(readFileSync(path, "utf8")).version;
const loadedVersions = Object.freeze({ esbuild: version(esbuildManifest), integration: version(integrationManifest) });

type Metadata = { artifacts: readonly string[]; cwd: string; packagePath: string; packageName: string };
const metadata = new WeakMap<ConfigurationReceipt, Metadata>();

// Additional executable plugins are never recognised by a name supplied by a caller.
// The file-scope plugin is installed internally by integration; the only optional plugin here is our factory's receipt collector.
type ReceiptBuild = { onEnd(callback: (result: { metafile?: { inputs: Record<string, unknown> } }) => void): void };
const receiptPlugins = new WeakSet<object>();
export function createQualificationReceiptPlugin(onInputs: (inputs: Readonly<Record<string, unknown>>) => void) {
  const plugin = Object.freeze({ name: "crumbs-qualification-receipt", setup(build: ReceiptBuild) {
    build.onEnd(result => { if (result.metafile) onInputs(Object.freeze({ ...result.metafile.inputs })); });
  } });
  receiptPlugins.add(plugin);
  return plugin;
}

function options(request: CompileRequest): Record<string, unknown> {
  if (request.identOption !== "debug" && request.identOption !== "short") return fail("unknown-build-option");
  const input = request.esbuildOptions;
  if (!input || typeof input !== "object" || Array.isArray(input)) return fail("unknown-build-option");
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(input).sort()) {
    const value = input[key];
    if (key === "plugins") {
      if (!Array.isArray(value) || value.some(plugin => !plugin || !receiptPlugins.has(plugin))) return fail("unknown-plugin");
      result[key] = value.map(() => "crumbs-qualification-receipt-v1");
    } else if (key === "conditions" || key === "external") {
      if (!Array.isArray(value) || value.some(item => typeof item !== "string")) return fail("unknown-build-option");
      result[key] = [...value];
    } else if (key === "define" || key === "loader") {
      if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return fail("unknown-build-option");
      const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
      if (entries.some(([, item]) => typeof item !== "string")) return fail("unknown-build-option");
      // Executable/data-loading loaders introduce resolution inputs this fixture domain does not prove.
      if (key === "loader" && entries.some(([, item]) => !["ts", "tsx", "js", "jsx", "json", "text"].includes(item as string))) return fail("unknown-build-option");
      result[key] = Object.fromEntries(entries);
    } else if (key === "tsconfig" && typeof value === "string") {
      result[key] = resolve(request.cwd, value);
    } else return fail("unknown-build-option");
  }
  return result;
}

function packageInfo(cwd: string): { path: string; name: string } {
  let directory = resolve(cwd);
  while (true) {
    const path = join(directory, "package.json");
    try {
      const parsed = JSON.parse(readFileSync(path, "utf8"));
      if (typeof parsed.name === "string" && parsed.name.length) return { path, name: parsed.name };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const parent = dirname(directory);
    if (parent === directory) return fail("incomplete-resolution-domain");
    directory = parent;
  }
}

function domainPaths(request: CompileRequest) {
  const d = request.domain;
  if (!d || ![d.configurationFiles, d.symlinkPaths, d.allowedInputRoots, d.loadedArtifacts, d.installationFiles]
    .every(paths => Array.isArray(paths) && paths.every(path => typeof path === "string" && path.length > 0))) return fail("incomplete-resolution-domain");
  const paths = {
    configs: absolute(request.cwd, d.configurationFiles), links: absolute(request.cwd, d.symlinkPaths),
    roots: absolute(request.cwd, d.allowedInputRoots), artifacts: absolute(request.cwd, [...d.loadedArtifacts, ...compilerFiles]),
    installs: absolute(request.cwd, d.installationFiles),
  };
  if (!paths.roots.length || !d.loadedArtifacts.length || !paths.installs.length) return fail("incomplete-resolution-domain");
  return paths;
}

function validateDomain(request: CompileRequest, opts: Record<string, unknown>) {
  const paths = domainPaths(request);
  const configs = new Set(paths.configs); const links = new Set(paths.links);
  const info = packageInfo(request.cwd);
  if (!configs.has(info.path) || !verifyBuildInputs(request, [request.filePath])) return fail("incomplete-resolution-domain");
  for (const path of [...paths.configs, ...paths.installs, ...paths.artifacts]) if (!statSync(path).isFile()) return fail("incomplete-resolution-domain");
  for (const path of paths.links) if (!lstatSync(path).isSymbolicLink()) return fail("incomplete-resolution-domain");
  const visited = new Set<string>();
  const checkConfig = (path: string): void => {
    if (visited.has(path)) return;
    visited.add(path);
    if (!configs.has(path)) return fail("incomplete-resolution-domain");
    const config = JSON.parse(readFileSync(path, "utf8"));
    if (config.extends !== undefined) {
      const parents = Array.isArray(config.extends) ? config.extends : [config.extends];
      for (const parent of parents) {
        // Package-based extends and JSONC require resolver work not yet qualified; deliberately stay fresh.
        if (typeof parent !== "string" || !parent.startsWith(".")) return fail("incomplete-resolution-domain");
        const candidate = resolve(dirname(path), parent);
        checkConfig(candidate.endsWith(".json") ? candidate : `${candidate}.json`);
      }
    }
    if (config.references !== undefined) return fail("incomplete-resolution-domain");
  };
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        if (!links.has(path)) return fail("incomplete-resolution-domain");
        // A target must have its own explicit input root before inputs under it can be admitted.
      } else if (entry.isDirectory()) {
        // Entire roots are inventoried, including node_modules; callers should supply small closed fixture roots.
        walk(path);
      } else if (entry.name === "package.json") {
        if (!configs.has(path)) return fail("incomplete-resolution-domain");
      } else if (/^tsconfig(?:\..+)?\.json$/.test(entry.name)) checkConfig(path);
    }
  };
  for (const root of paths.roots) {
    if (!statSync(root).isDirectory()) return fail("incomplete-resolution-domain");
    walk(root);
  }
  // Esbuild can discover ancestor tsconfigs outside the input root; they must also be inventoried.
  for (const start of [dirname(resolve(request.cwd, request.filePath)), resolve(request.cwd), ...paths.roots]) {
    let directory = start;
    while (true) {
      const manifest = join(directory, "package.json");
      try { if (statSync(manifest).isFile() && !configs.has(manifest)) return fail("incomplete-resolution-domain"); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
      const config = join(directory, "tsconfig.json");
      try { if (statSync(config).isFile()) checkConfig(config); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
      const parent = dirname(directory); if (parent === directory) break; directory = parent;
    }
  }
  if (typeof opts.tsconfig === "string") checkConfig(opts.tsconfig);
  return { paths, info };
}

/** Check actual metafile input paths after every build, before admitting its result. */
export function verifyBuildInputs(request: CompileRequest, inputs: readonly string[]): boolean {
  try {
    const { roots, links } = domainPaths(request);
    return inputs.every(input => {
      const logical = resolve(request.cwd, input); const canonical = realpathSync(logical);
      if (!roots.some(root => within(root, logical)) || !roots.some(root => within(realpathSync(root), canonical))) return false;
      let current = logical;
      while (true) {
        if (lstatSync(current).isSymbolicLink() && !links.includes(current)) return false;
        const parent = dirname(current); if (parent === current) break; current = parent;
      }
      return statSync(logical).isFile();
    });
  } catch { return false; }
}

function fileReceipts(paths: readonly string[]) {
  return paths.map(path => {
    const bytes = readFileSync(path); const hash = sha(bytes);
    if (sha(readFileSync(path)) !== hash) return fail("source-unstable");
    return Object.freeze({ path, sha256: hash });
  });
}

export function captureConfiguration(request: CompileRequest): ConfigurationReceipt {
  try {
    const opts = options(request);
    const { paths, info } = validateDomain(request, opts);
    const files = Object.freeze(fileReceipts([...new Set([...paths.configs, ...paths.installs, ...paths.artifacts])].sort()));
    const symlinks = Object.freeze(paths.links.map(logicalPath => Object.freeze({ logicalPath, targetPath: realpathSync(logicalPath) })));
    const versions = Object.freeze({ esbuild: version(esbuildManifest), integration: version(integrationManifest) });
    const fingerprint = sha(JSON.stringify({ files, symlinks, versions, opts, paths, cwd: resolve(request.cwd), canonicalCwd: realpathSync(request.cwd) }));
    const receipt = Object.freeze({ fingerprint, files, symlinks, versions });
    metadata.set(receipt, { artifacts: paths.artifacts, cwd: resolve(request.cwd), packagePath: info.path, packageName: info.name });
    return receipt;
  } catch (error) {
    if (error instanceof IdentityError) throw error;
    return fail("incomplete-resolution-domain");
  }
}

export function createContextKey(request: CompileRequest, receipt: ConfigurationReceipt): string {
  return sha(JSON.stringify({ filePath: resolve(request.cwd, request.filePath), canonicalFilePath: realpathSync(resolve(request.cwd, request.filePath)),
    cwd: resolve(request.cwd), canonicalCwd: realpathSync(request.cwd), identOption: request.identOption,
    options: options(request), fingerprint: receipt.fingerprint, versions: receipt.versions }));
}

export function assessReuse(request: CompileRequest, loadedReceipt: ConfigurationReceipt, previousReceipt?: ConfigurationReceipt): ReuseEligibility {
  try {
    options(request);
    const loaded = metadata.get(loadedReceipt);
    if (!loaded) return { kind: "fresh", reason: "incomplete-resolution-domain" };
    // Check loaded identities first, even if the new inventory is incomplete or an artifact disappeared.
    const hashes = new Map(loadedReceipt.files.map(file => [file.path, file.sha256]));
    for (const path of loaded.artifacts) {
      try { if (sha(readFileSync(path)) !== hashes.get(path)) return { kind: "restart-required", reason: "loaded-artifact-changed" }; }
      catch { return { kind: "restart-required", reason: "loaded-artifact-changed" }; }
    }
    if (version(esbuildManifest) !== loadedVersions.esbuild || version(integrationManifest) !== loadedVersions.integration) return { kind: "restart-required", reason: "loaded-artifact-changed" };
    if (process.env.NODE_ENV !== loadedEnvironment.NODE_ENV || process.env.NODE_PATH !== loadedEnvironment.NODE_PATH) return { kind: "restart-required", reason: "loaded-artifact-changed" };
    let info: { path: string; name: string };
    try { info = packageInfo(request.cwd); }
    catch (error) {
      if (resolve(request.cwd) === loaded.cwd) return { kind: "restart-required", reason: "package-info-changed" };
      throw error;
    }
    const integration = require(integrationEntry) as { getPackageInfo(cwd: string): { name: string; path: string } };
    const cachedInfo = integration.getPackageInfo(request.cwd);
    if (cachedInfo.name !== info.name || cachedInfo.path !== info.path) return { kind: "restart-required", reason: "package-info-changed" };
    if (resolve(request.cwd) === loaded.cwd && (info.path !== loaded.packagePath || info.name !== loaded.packageName)) return { kind: "restart-required", reason: "package-info-changed" };
    if (request.entryBytes && !Buffer.from(request.entryBytes).equals(readFileSync(resolve(request.cwd, request.filePath)))) return { kind: "fresh", reason: "entry-buffer-mismatch" };
    const receipt = captureConfiguration(request);
    if (previousReceipt && receipt.fingerprint !== previousReceipt.fingerprint) return { kind: "fresh", reason: "configuration-changed" };
    return { kind: "eligible", key: createContextKey(request, receipt), receipt };
  } catch (error) {
    return { kind: "fresh", reason: error instanceof IdentityError ? error.reason : "incomplete-resolution-domain" };
  }
}
