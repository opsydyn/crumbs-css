import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { CandidateArtifact } from "../../bench/context-reuse/build-candidate";
export function transformerFixture(root: string, artifact: CandidateArtifact) {
  const cwd = join(root, "app"); const src = join(cwd, "src"); const workspace = join(root, "workspace"); mkdirSync(src, { recursive: true }); mkdirSync(workspace);
  const put = (path: string, text: string) => { writeFileSync(path, text); return path; };
  symlinkSync(realpathSync(join(artifact.packageRoot, "node_modules")), join(root, "node_modules"));
  const workspaceManifest = put(join(root, "package.json"), '{"name":"qualification-workspace","workspaces":["app","workspace","package"]}');
  const manifest = put(join(cwd, "package.json"), '{"name":"qualification-app"}'); const config = put(join(cwd, "tsconfig.json"), "{}");
  const packageManifest = join(artifact.packageRoot, "package.json"); const workspacePackage = put(join(workspace, "package.json"), '{"name":"qualification-tokens"}');
  const lock = put(join(root, "bun.lock"), "qualification-lock"); const loadedArtifact = artifact.transformerPath;
  const styleImport = `import { style } from ${JSON.stringify(join(artifact.packageRoot, "dist/style.cjs"))};\n`;
  const token = put(join(src, "token.ts"), "export const token = 11;\n");
  const workspaceToken = put(join(workspace, "tokens.ts"), "export const workspaceToken = 13;\n");
  const nestedSource = styleImport + 'export const nested = style({ opacity: 0.5 });\n'; const nested = put(join(src, "nested.css.ts"), nestedSource);
  const entry = styleImport + `import { token } from './token'; import { workspaceToken } from '../../workspace/tokens'; import { nested } from './nested.css'; export const card = style([nested, { width: token + workspaceToken, backgroundColor: '#123456' }]);\n`;
  const A = put(join(src, "A.css.ts"), entry); const B = put(join(src, "B.css.ts"), styleImport + 'export const card = style({ height: 27 });\n'); const C = put(join(src, "C.css.ts"), styleImport + 'export const card = style({ borderRadius: 9 });\n');
  const bad = put(join(src, "bad.css.ts"), styleImport + 'export const card = style({ width: 31 });\n');
  const extra = put(join(src, "extra.ts"), 'export const extra = 7;\n');
  const upstream = put(join(root, "upstream.cjs"), 'exports.transform=async function(_config,_root,filename,data,options){ return {code:data.toString(),filename,options,unstable_transformResultKey:"qualification-upstream"}; };\n');
  const domain = { configurationFiles: [workspaceManifest, manifest, config, packageManifest, workspacePackage], loadedArtifacts: artifact.artifactFiles.filter(file => file.path.endsWith(".cjs")).map(file => file.path), installationFiles: [lock], symlinkPaths: [], allowedInputRoots: [src, workspace, join(artifact.packageRoot, "dist")] };
  const fixture = { cwd, upstream, manifest, loadedArtifact, files: { A, B, C, bad, token, workspace: workspaceToken, nested, extra }, nestedEdited: styleImport + 'export const nested = style({ opacity: 0.75 });\n', entryEdited: styleImport + `import { extra } from './extra'; export const card = style({ width: extra });\n`, invalidCompatibility: styleImport + 'export const card = style({ position: "fixed" });\n' };
  const fixturePath = put(join(root, "fixture.json"), JSON.stringify(fixture));
  const configPath = join(root, "session.json");
  return { ...fixture, fixturePath, configPath, domain };
}
export function runTransformerProbe(node: string, artifact: CandidateArtifact, fixture: ReturnType<typeof transformerFixture>, mode: "fresh" | "immediate" | "repeat" | "absent", scenario = "matrix", control = false) {
  writeFileSync(fixture.configPath, JSON.stringify({ mode, settings: { capacity: 4, admission: mode === "repeat" ? "repeat" : "immediate" }, idleMs: 120000, domain: fixture.domain }));
  const env: Record<string, string | undefined> = { ...globalThis.process.env, CRUMBS_CONTEXT_QUALIFICATION_CONFIG: mode === "absent" ? undefined : fixture.configPath, CRUMBS_QUALIFICATION_STALE_CONTROL: control ? "1" : "0" };
  const process = Bun.spawnSync([node, resolve(import.meta.dir, "../../bench/context-reuse/full-transform-probe.cjs"), artifact.transformerPath, fixture.fixturePath, scenario], { env, maxBuffer: 128 * 1024 * 1024 });
  if (process.exitCode) throw new Error(process.stderr.toString() + process.stdout.toString().slice(-3000));
  return JSON.parse(process.stdout.toString());
}
export const byteHash = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
