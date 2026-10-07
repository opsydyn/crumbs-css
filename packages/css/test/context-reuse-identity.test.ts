import { afterEach, expect, it } from "bun:test";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, statSync, symlinkSync, unlinkSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { assessReuse, captureConfiguration, createContextKey, createQualificationReceiptPlugin, reuseReasons, verifyBuildInputs } from "../bench/context-reuse/identity";

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function fixture() {
  const cwd = realpathSync(mkdtempSync(join(tmpdir(), "crumbs-identity-"))); roots.push(cwd);
  const put = (name: string, text: string) => { const path = join(cwd, name); writeFileSync(path, text); return path; };
  const manifest = put("package.json", '{"name":"identity-fixture"}');
  const base = put("base.json", '{"compilerOptions":{"baseUrl":"."}}');
  const config = put("tsconfig.json", '{"extends":"./base.json"}');
  const lock = put("bun.lock", "lock-v1");
  const artifact = put("compiler.cjs", "module.exports = 1");
  const filePath = put("entry.css.ts", "export const a = 1");
  const theme = put("theme.ts", "export const colour = 'red'");
  const request = { filePath, cwd, identOption: "debug" as const, esbuildOptions: {}, domain: {
    configurationFiles: [manifest, base, config], installationFiles: [lock], loadedArtifacts: [artifact], symlinkPaths: [], allowedInputRoots: [cwd],
  } };
  return { cwd, put, request, manifest, base, config, lock, artifact, theme };
}

it("pins closed bypass reasons", () => {
  expect(reuseReasons).toEqual(["unknown-build-option", "unknown-plugin", "incomplete-resolution-domain", "configuration-changed", "entry-buffer-mismatch", "source-changed", "source-unstable", "loaded-artifact-changed", "package-info-changed"]);
});
it("hashes configuration bytes, freezes receipts and preserves keys on entry/theme edits", () => {
  const f = fixture(); const before = captureConfiguration(f.request);
  expect(Object.isFrozen(before)).toBe(true);
  expect(Object.isFrozen(before.files)).toBe(true);
  expect(before.versions).toEqual({ esbuild: "0.27.7", integration: "8.0.10" });
  const key = createContextKey(f.request, before);
  f.put("entry.css.ts", "export const a = 2"); f.put("theme.ts", "export const colour = 'blue'");
  const after = captureConfiguration(f.request);
  expect(after.fingerprint).toBe(before.fingerprint);
  expect(createContextKey(f.request, after)).toBe(key);
  expect(assessReuse(f.request, before, before).kind).toBe("eligible");
  expect(verifyBuildInputs(f.request, [f.request.filePath, f.theme])).toBe(true);
});
it("canonicalises inventory order but distinguishes identifier and build settings", () => {
  const f = fixture(); const receipt = captureConfiguration(f.request);
  const reversed = { ...f.request, domain: { ...f.request.domain, configurationFiles: [...f.request.domain.configurationFiles].reverse() } };
  expect(captureConfiguration(reversed)).toEqual(receipt);
  expect(createContextKey({ ...f.request, identOption: "short" }, receipt)).not.toBe(createContextKey(f.request, receipt));
  expect(createContextKey({ ...f.request, esbuildOptions: { conditions: ["react-native"] } }, receipt)).not.toBe(createContextKey(f.request, receipt));
  expect(assessReuse({ ...f.request, esbuildOptions: { conditions: ["react-native"] } }, receipt, receipt)).toEqual({ kind: "fresh", reason: "configuration-changed" });
});
it("byte edits with preserved mtime invalidate aliases, extends, manifests and lockfile", () => {
  for (const name of ["base.json", "tsconfig.json", "package.json", "bun.lock"]) {
    const f = fixture(); const before = captureConfiguration(f.request); const path = join(f.cwd, name); const stat = statSync(path);
    const original = readFileSync(path, "utf8");
    writeFileSync(path, name === "bun.lock" ? "lock-v2" : original.replace("}", ',"changed":true}'));
    utimesSync(path, stat.atime, stat.mtime);
    expect(captureConfiguration(f.request).fingerprint).not.toBe(before.fingerprint);
    expect(assessReuse(f.request, before, before)).toEqual({ kind: "fresh", reason: "configuration-changed" });
  }
});
it("requires restart for package name or loaded artifacts, including removed artifacts", () => {
  for (const change of ["name", "artifact", "remove"] as const) {
    const f = fixture(); const before = captureConfiguration(f.request);
    if (change === "name") f.put("package.json", '{"name":"new-name"}');
    else if (change === "artifact") f.put("compiler.cjs", "module.exports = 2");
    else unlinkSync(f.artifact);
    expect(assessReuse(f.request, before, before)).toEqual({ kind: "restart-required", reason: change === "name" ? "package-info-changed" : "loaded-artifact-changed" });
  }
});
it("fails closed for missing inventory, extends closure, nested configs and outside inputs", () => {
  const f = fixture(); const before = captureConfiguration(f.request);
  const incomplete = { ...f.request, domain: { ...f.request.domain, configurationFiles: [f.manifest, f.config] } };
  expect(assessReuse(incomplete, before)).toEqual({ kind: "fresh", reason: "incomplete-resolution-domain" });
  expect(verifyBuildInputs(f.request, [join(tmpdir(), "outside.ts")])).toBe(false);
  mkdirSync(join(f.cwd, "nested")); f.put("nested/tsconfig.json", "{}");
  expect(assessReuse(f.request, before)).toEqual({ kind: "fresh", reason: "incomplete-resolution-domain" });
  rmSync(join(f.cwd, "nested"), { recursive: true }); unlinkSync(f.lock);
  expect(assessReuse(f.request, before)).toEqual({ kind: "fresh", reason: "incomplete-resolution-domain" });
});
it("unknown option and name-spoofed executable plugins cannot become eligible", () => {
  const f = fixture(); const before = captureConfiguration(f.request);
  for (const esbuildOptions of [{ alias: { x: "y" } }, { conditions: 12 }, { define: { X: () => "unsafe" } }]) {
    expect(assessReuse({ ...f.request, esbuildOptions }, before)).toEqual({ kind: "fresh", reason: "unknown-build-option" });
  }
  expect(assessReuse({ ...f.request, esbuildOptions: { plugins: [{ name: "crumbs-receipt", setup() {} }] } }, before)).toEqual({ kind: "fresh", reason: "unknown-plugin" });
});
it("detects entry buffer conflicts; admission does not promise an atomic filesystem snapshot", () => {
  const f = fixture(); const before = captureConfiguration(f.request);
  expect(assessReuse({ ...f.request, entryBytes: Buffer.from("wrong") }, before)).toEqual({ kind: "fresh", reason: "entry-buffer-mismatch" });
  expect(assessReuse({ ...f.request, entryBytes: readFileSync(f.request.filePath) }, before).kind).toBe("eligible");
});
it("distinguishes logical roots and symlink retargets, and rejects undeclared symlinks", () => {
  const f = fixture(); const before = captureConfiguration(f.request);
  const other = fixture(); const link = join(f.cwd, "linked"); symlinkSync(other.cwd, link);
  expect(assessReuse(f.request, before)).toEqual({ kind: "fresh", reason: "incomplete-resolution-domain" });
  const request = { ...f.request, domain: { ...f.request.domain, symlinkPaths: [link] } };
  const linked = captureConfiguration(request);
  expect(createContextKey(request, linked)).not.toBe(createContextKey(f.request, before));
  unlinkSync(link); symlinkSync(tmpdir(), link);
  expect(assessReuse(request, linked, linked)).toEqual({ kind: "fresh", reason: "configuration-changed" });
  const logicalRoot = join(tmpdir(), `crumbs-root-link-${Date.now()}`); roots.push(logicalRoot); symlinkSync(f.cwd, logicalRoot);
  const alternate = { ...f.request, cwd: logicalRoot, filePath: join(logicalRoot, "entry.css.ts") };
  expect(createContextKey(alternate, before)).not.toBe(createContextKey(f.request, before));
});
it("installed integration caches package info in-process but a new process sees the new name", () => {
  const f = fixture();
  const require = createRequire(import.meta.url); const integration = require.resolve("@vanilla-extract/integration");
  const script = `const fs=require('node:fs'); const v=require(${JSON.stringify(integration)}); const cwd=${JSON.stringify(f.cwd)}; const first=v.getPackageInfo(cwd).name; fs.writeFileSync(cwd+'/package.json',JSON.stringify({name:'renamed-fixture'})); console.log(JSON.stringify([first,v.getPackageInfo(cwd).name]));`;
  const first = Bun.spawnSync(["node", "-e", script]);
  expect(first.exitCode).toBe(0);
  expect(JSON.parse(first.stdout.toString())).toEqual(["identity-fixture", "identity-fixture"]);
  const second = Bun.spawnSync(["node", "-e", `console.log(require(${JSON.stringify(integration)}).getPackageInfo(${JSON.stringify(f.cwd)}).name)`]);
  expect(second.exitCode).toBe(0); expect(second.stdout.toString().trim()).toBe("renamed-fixture");
});
it("package-name changes require restart even when cwd is nested below the manifest", () => {
  const f = fixture(); const cwd = join(f.cwd, "nested"); mkdirSync(cwd);
  const request = { ...f.request, cwd };
  const loaded = captureConfiguration(request);
  f.put("package.json", '{"name":"renamed"}');
  expect(assessReuse(request, loaded)).toEqual({ kind: "restart-required", reason: "package-info-changed" });
});
it("post-build input verification rejects unlisted symlink targets and missing dependencies", () => {
  const f = fixture(); const other = fixture(); const link = join(f.cwd, "linked"); symlinkSync(other.cwd, link);
  const request = { ...f.request, domain: { ...f.request.domain, symlinkPaths: [link] } };
  expect(verifyBuildInputs(request, [join(link, "theme.ts")])).toBe(false);
  const closed = { ...request, domain: { ...request.domain, allowedInputRoots: [f.cwd, other.cwd] } };
  expect(verifyBuildInputs(closed, [join(link, "theme.ts")])).toBe(true);
  expect(verifyBuildInputs(closed, [join(other.cwd, "missing.ts")])).toBe(false);
});
it("rejects unqualified JSONC and package-based extends rather than guessing resolution", () => {
  const f = fixture(); const loaded = captureConfiguration(f.request);
  for (const text of ['{/*comment*/"compilerOptions":{}}', '{"extends":"some-package/tsconfig"}', '{"references":[]}']) {
    f.put("tsconfig.json", text);
    expect(assessReuse(f.request, loaded)).toEqual({ kind: "fresh", reason: "incomplete-resolution-domain" });
  }
});

it("only the concrete receipt-plugin factory is admitted and collects the current callback", () => {
  const f = fixture(); const observed: unknown[] = [];
  const plugin = createQualificationReceiptPlugin(inputs => observed.push(inputs));
  const request = { ...f.request, esbuildOptions: { plugins: [plugin] } };
  const loaded = captureConfiguration(request);
  expect(assessReuse(request, loaded).kind).toBe("eligible");
  let finish: ((result: { metafile?: { inputs: Record<string, unknown> } }) => void) | undefined;
  plugin.setup({ onEnd(callback) { finish = callback; } });
  finish!({ metafile: { inputs: { first: {} } } });
  finish!({ metafile: { inputs: { second: {} } } });
  expect(observed).toEqual([{ first: {} }, { second: {} }]);
  expect(Object.isFrozen(observed[0])).toBe(true);
});
it("installed fresh compilation recreates alias/extends resolution after byte edits", async () => {
  const f = fixture(); f.put("one.ts", "export const value = 111;"); f.put("two.ts", "export const value = 222;");
  f.put("entry.css.ts", "import { value } from '@tokens'; export const marker = value;");
  f.put("base.json", JSON.stringify({ compilerOptions: { baseUrl: ".", paths: { "@tokens": ["./one.ts"] } } }));
  const require = createRequire(import.meta.url);
  const integration = require("@vanilla-extract/integration") as { compile(request: { filePath: string; cwd: string; identOption: string }): Promise<{ source: string }> };
  const loaded = captureConfiguration(f.request);
  const first = await integration.compile(f.request);
  expect(first.source).toContain("111");
  const stat = statSync(f.base);
  f.put("base.json", JSON.stringify({ compilerOptions: { baseUrl: ".", paths: { "@tokens": ["./two.ts"] } } }));
  utimesSync(f.base, stat.atime, stat.mtime);
  expect(assessReuse(f.request, loaded, loaded)).toEqual({ kind: "fresh", reason: "configuration-changed" });
  const second = await integration.compile(f.request);
  expect(second.source).toContain("222");
  expect(second.source).not.toContain("111");
});
it("a newly captured receipt cannot hide an already stale integration package cache", () => {
  const f = fixture(); const require = createRequire(import.meta.url);
  const integration = require("@vanilla-extract/integration") as { getPackageInfo(cwd: string): { name: string } };
  expect(integration.getPackageInfo(f.cwd).name).toBe("identity-fixture");
  f.put("package.json", '{"name":"renamed-after-load"}');
  const newlyCaptured = captureConfiguration(f.request);
  expect(assessReuse(f.request, newlyCaptured)).toEqual({ kind: "restart-required", reason: "package-info-changed" });
});
it("inventories ancestor configs for every allowed dependency root", () => {
  const f = fixture(); const loaded = captureConfiguration(f.request); const deps = join(f.cwd, "deps"); const lib = join(deps, "lib"); mkdirSync(lib, { recursive: true });
  const parentConfig = f.put("deps/tsconfig.json", "{}"); const source = f.put("deps/lib/theme.ts", "export const a = 1");
  const request = { ...f.request, domain: { ...f.request.domain, allowedInputRoots: [lib], configurationFiles: [...f.request.domain.configurationFiles] } };
  // Entry must also be admitted; the two roots deliberately exclude their config-owning parent.
  const entryRoot = join(f.cwd, "app"); mkdirSync(entryRoot); const filePath = f.put("app/entry.css.ts", "export const a = 1");
  const closed = { ...request, filePath, domain: { ...request.domain, allowedInputRoots: [entryRoot, lib] } };
  expect(verifyBuildInputs(closed, [source])).toBe(true);
  expect(assessReuse(closed, loaded)).toEqual({ kind: "fresh", reason: "incomplete-resolution-domain" });
  const complete = { ...closed, domain: { ...closed.domain, configurationFiles: [...closed.domain.configurationFiles, parentConfig] } };
  const receipt = captureConfiguration(complete);
  f.put("deps/tsconfig.json", '{"compilerOptions":{"jsx":"react"}}');
  expect(assessReuse(complete, receipt, receipt)).toEqual({ kind: "fresh", reason: "configuration-changed" });
});
it("removal of the cached package manifest requires restart", () => {
  const f = fixture(); const loaded = captureConfiguration(f.request); unlinkSync(f.manifest);
  expect(assessReuse(f.request, loaded)).toEqual({ kind: "restart-required", reason: "package-info-changed" });
});

it("automatic compiler inventory includes the integration dispatcher and actual implementation", () => {
  const f = fixture(); const receipt = captureConfiguration(f.request);
  const require = createRequire(import.meta.url); const dispatcher = require.resolve("@vanilla-extract/integration");
  expect(receipt.files.some(file => file.path === dispatcher)).toBe(true);
  expect(receipt.files.some(file => file.path.endsWith("vanilla-extract-integration.cjs.dev.js"))).toBe(true);
  expect(receipt.files.some(file => file.path.endsWith("vanilla-extract-integration.cjs.prod.js"))).toBe(true);
});

it("editing a disposable integration implementation requires restart without touching installed files", () => {
  const f = fixture(); const app = join(f.cwd, "app"); mkdirSync(app);
  const filePath = f.put("app/entry.css.ts", "export const a = 1");
  const execution = join(f.cwd, "execution"); const scope = join(execution, "node_modules/@vanilla-extract"); mkdirSync(scope, { recursive: true });
  const require = createRequire(import.meta.url);
  const packageRoot = dirname(require.resolve("@vanilla-extract/integration/package.json"));
  const copy = join(scope, "integration"); cpSync(packageRoot, copy, { recursive: true });
  // Dependencies resolve through the original installation; the copied integration itself is owned by this test.
  symlinkSync(dirname(dirname(packageRoot)), join(copy, "node_modules"));
  const identity = join(execution, "identity.ts"); cpSync(join(import.meta.dir, "../bench/context-reuse/identity.ts"), identity);
  const request = { ...f.request, filePath, domain: { ...f.request.domain, allowedInputRoots: [app] } };
  const script = join(execution, "probe.ts");
  writeFileSync(script, `import {captureConfiguration,assessReuse} from './identity'; import {appendFileSync} from 'node:fs'; const request=${JSON.stringify(request)}; const before=captureConfiguration(request); appendFileSync(${JSON.stringify(join(copy, "dist/vanilla-extract-integration.cjs.dev.js"))},'\\n// owned qualification edit'); console.log(JSON.stringify(assessReuse(request,before)));`);
  const result = Bun.spawnSync([process.execPath, script]);
  expect(result.stderr.toString()).toBe("");
  expect(result.exitCode).toBe(0);
  expect(JSON.parse(result.stdout.toString())).toEqual({ kind: "restart-required", reason: "loaded-artifact-changed" });
});
