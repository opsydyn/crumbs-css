import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, resolve } from "node:path";
import ts from "typescript";

export type CandidateArtifact = Readonly<{
  transformerPath: string; packageRoot: string;
  artifactFiles: readonly Readonly<{ path: string; sha256: string }>[];
  patchReceipt: readonly Readonly<{ operation: string; matches: number }>[];
  originalFiles: readonly Readonly<{ path: string; sha256: string }>[];
  sourceFiles: readonly Readonly<{ path: string; originalSha256: string; copiedSha256: string }>[];
}>;
const hash = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const packageSourceRoot = resolve(import.meta.dir, "../..");
export function shippingInventory(): readonly Readonly<{ path: string; sha256: string }>[] {
  const files: { path: string; sha256: string }[] = [];
  const scan = (directory: string) => { for (const item of readdirSync(directory, { withFileTypes: true })) { const path = join(directory, item.name); if (item.isDirectory()) scan(path); else if (item.isFile()) files.push({ path, sha256: hash(readFileSync(path)) }); } };
  for (const name of ["src", "dist", "fixtures"]) scan(join(packageSourceRoot, name));
  for (const name of ["package.json", "build-policy.ts"]) { const path = join(packageSourceRoot, name); files.push({ path, sha256: hash(readFileSync(path)) }); }
  return Object.freeze(files.sort((a, b) => a.path.localeCompare(b.path)).map(item => Object.freeze(item)));
}

/** Surgical offsets come only from named AST nodes; original lowering text remains byte-identical. */
export function patchTransformer(source: string) {
  const file = ts.createSourceFile("transformer.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  if ((file as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics.length) throw new Error("Cannot patch invalid transformer syntax");
  const functions = file.statements.filter(ts.isFunctionDeclaration);
  const exact = <T>(items: readonly T[], operation: string): T => { if (items.length !== 1) throw new Error(`${operation}: expected one AST match, got ${items.length}`); return items[0]!; };
  const native = exact(functions.filter(fn => fn.name?.text === "transformCssTsToStyleSheetWithMetadata"), "native helper");
  const metro = exact(functions.filter(fn => fn.name?.text === "transform"), "Metro entry");
  if (!native.body || !metro.body || !native.name || native.parameters.length !== 4) throw new Error("Unsupported native function shape");
  const declaration = (name: string) => exact(native.body!.statements.filter(statement => ts.isVariableStatement(statement) && statement.declarationList.declarations.some(item => ts.isIdentifier(item.name) && item.name.text === name)), name);
  const inputs = declaration("capturedInputs"); const plugin = declaration("capturePlugin");
  const compiled = exact(native.body.statements.filter(statement => ts.isVariableStatement(statement) && statement.declarationList.declarations.some(item => item.initializer && ts.isAwaitExpression(item.initializer) && ts.isCallExpression(item.initializer.expression) && item.initializer.expression.expression.getText(file) === "compile")), "compile call");
  const compileDeclaration = (compiled as ts.VariableStatement).declarationList.declarations[0]!;
  const compileCall = (compileDeclaration.initializer as ts.AwaitExpression).expression as ts.CallExpression;
  const argument = compileCall.arguments[0];
  if (compileCall.arguments.length !== 1 || !argument || !ts.isObjectLiteralExpression(argument)) throw new Error("Unsupported compile argument shape");
  const names = argument.properties.map(property => property.name?.getText(file));
  if (JSON.stringify(names) !== JSON.stringify(["filePath", "cwd", "identOption", "esbuildOptions"])) throw new Error("Unmodelled compile options");
  const forwarded = argument.properties[3];
  if (!forwarded || !ts.isPropertyAssignment(forwarded) || !ts.isObjectLiteralExpression(forwarded.initializer)
    || forwarded.initializer.properties.length !== 1 || forwarded.initializer.properties[0]!.getText(file).replace(/\s/g, "") !== "plugins:[capturePlugin]") throw new Error("Unmodelled compile plugin/options");
  const nodes = native.body.statements; const index = nodes.indexOf(inputs);
  if (nodes[index + 1] !== plugin || nodes[index + 2] !== compiled) throw new Error("Compile/capture block is not contiguous");
  const calls: ts.CallExpression[] = [];
  const visit = (node: ts.Node): void => { if (ts.isCallExpression(node) && node.expression.getText(file) === "transformCssTsToStyleSheetWithMetadata") calls.push(node); ts.forEachChild(node, visit); };
  visit(metro.body); const call = exact(calls, "Metro native call");
  if (call.arguments.length !== 3) throw new Error("Unsupported Metro native arguments");
  const wrapper = `\nasync function transformCssTsToStyleSheetWithMetadata(filePath: string, cwd: string, options: TransformCssTsOptions = {}, manifestSidecarOptions?: TransformCssTsManifestSidecarOptions, entryBytes?: Uint8Array): Promise<NativeTransformResult> {\n  const request = qualificationRequest(filePath, cwd, entryBytes);\n  return qualificationRunNative(request, receipt => __crumbsTransformFromReceipt(receipt, filePath, cwd, options, manifestSidecarOptions));\n}\n`;
  const edits = [
    { start: native.name.getStart(file), end: native.name.end, text: "__crumbsTransformFromReceipt" },
    { start: native.parameters[0]!.getStart(file), end: native.parameters[0]!.getStart(file), text: "receipt: CompileReceipt, " },
    { start: inputs.getFullStart(), end: compiled.end, text: "\n  const { source, inputs: capturedInputs } = receipt\n  const resolutionIdentity = captureResolutionIdentity(capturedInputs, { cwd, absoluteEntryPath: absoluteFilePath, verification: true })" },
    { start: native.getFullStart(), end: native.getFullStart(), text: wrapper },
    { start: call.arguments.end, end: call.arguments.end, text: ", undefined, data" },
    { start: 0, end: 0, text: 'import { captureResolutionIdentity } from "./compiler/resolution-identity"\nimport { qualificationRequest, qualificationRunNative } from "./qualification-adapter"\nimport type { CompileReceipt } from "../bench/context-reuse/compile-session"\nexport { __crumbsQualificationSnapshot, __crumbsQualificationClose, __crumbsQualificationDrainReceipts, __crumbsQualificationStaleInputsOnce, __crumbsQualificationOptionsOnce, __crumbsQualificationUnstableOnce } from "./qualification-adapter"\n' },
  ];
  let patched = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) patched = patched.slice(0, edit.start) + edit.text + patched.slice(edit.end);
  const check = ts.createSourceFile("patched.ts", patched, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  if ((check as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics.length) throw new Error("Patched transformer has invalid syntax");
  const operations = ["native-helper-rename", "receipt-parameter", "compile-capture-replacement", "native-gate-wrapper", "metro-entry-buffer", "private-adapter-import"];
  return { source: patched, patchReceipt: Object.freeze(operations.map(operation => Object.freeze({ operation, matches: 1 }))) };
}

const adapter = `import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createCompileSession, type CompileReceipt } from "../bench/context-reuse/compile-session";
import { createQualificationReceiptPlugin, type CompileRequest, type ClosedResolutionDomain } from "../bench/context-reuse/identity";
const configPath = process.env.CRUMBS_CONTEXT_QUALIFICATION_CONFIG;
const config = configPath ? JSON.parse(readFileSync(configPath, "utf8")) : { mode: "fresh", settings: { capacity: 4, admission: "immediate" }, idleMs: 1000, domain: { configurationFiles: [], installationFiles: [], loadedArtifacts: [], symlinkPaths: [], allowedInputRoots: [] } };
const session = createCompileSession(config);
let overrides: Readonly<Record<string, unknown>> | undefined;
let staleOnce = false;
let priorInputs: Readonly<Record<string, unknown>> | undefined;
const receipts: { filePath: string; receipt: CompileReceipt; evaluatedReceipt: CompileReceipt }[] = [];
export function qualificationRequest(filePath: string, cwd: string, entryBytes?: Uint8Array): CompileRequest {
  const esbuildOptions = overrides ?? {}; overrides = undefined;
  return { filePath: resolve(cwd, filePath), cwd, identOption: process.env.NODE_ENV === "production" ? "short" : "debug", esbuildOptions, domain: config.domain as ClosedResolutionDomain, ...(entryBytes === undefined ? {} : { entryBytes }) };
}
export function qualificationRunNative<T>(request: CompileRequest, evaluate: (receipt: CompileReceipt) => Promise<T>): Promise<T> {
  return session.runNative(request, async receipt => {
    const evaluatedReceipt = staleOnce && priorInputs ? Object.freeze({ ...receipt, inputs: priorInputs }) : receipt;
    staleOnce = false; priorInputs = receipt.inputs;
    receipts.push(Object.freeze({ filePath: request.filePath, receipt, evaluatedReceipt }));
    if (receipts.length > 64) receipts.shift();
    return evaluate(evaluatedReceipt);
  });
}
export const __crumbsQualificationSnapshot = () => session.snapshot();
export const __crumbsQualificationClose = () => session.close();
export const __crumbsQualificationDrainReceipts = () => Object.freeze(receipts.splice(0));
export const __crumbsQualificationStaleInputsOnce = () => { staleOnce = true; };
export const __crumbsQualificationOptionsOnce = (options: Readonly<Record<string, unknown>>) => { overrides = options; };
export const __crumbsQualificationUnstableOnce = (path: string, bytes: string) => { overrides = { plugins: [createQualificationReceiptPlugin(() => writeFileSync(path, bytes))] }; };
`;

export async function buildCandidate(outputRoot: string, instrumentCopy?: (packageRoot: string) => void): Promise<CandidateArtifact> {
  if (!isAbsolute(outputRoot) || (existsSync(outputRoot) && readdirSync(outputRoot).length)) throw new Error("Candidate output must be an empty absolute owned directory");
  const originalFiles = shippingInventory();
  mkdirSync(outputRoot, { recursive: true }); const packageRoot = join(outputRoot, "package"); mkdirSync(packageRoot);
  for (const item of ["src", "dist", "package.json", "build-policy.ts"]) cpSync(join(packageSourceRoot, item), join(packageRoot, item), { recursive: true });
  const tooling = join(packageRoot, "bench/context-reuse"); mkdirSync(tooling, { recursive: true });
  for (const name of ["admission-policy.ts", "identity.ts", "compile-session.ts"]) cpSync(join(packageSourceRoot, "bench/context-reuse", name), join(tooling, name));
  symlinkSync(realpathSync(join(packageSourceRoot, "node_modules")), join(packageRoot, "node_modules"));
  const path = join(packageRoot, "src/transformer.ts"); const original = readFileSync(path, "utf8"); const patch = patchTransformer(original); writeFileSync(path, patch.source);
  writeFileSync(join(packageRoot, "src/qualification-adapter.ts"), adapter);
  writeFileSync(join(packageRoot, "qualification.config.ts"), `import { defineConfig } from "tsdown"; import { compilerDependencies } from "./build-policy"; export default defineConfig({ entry: { "qualification-transformer": "src/transformer.ts" }, deps: compilerDependencies, format: ["cjs"], outDir: "dist", clean: false, dts: false, shims: true, target: "node22" });`);
  instrumentCopy?.(packageRoot);
  const require = createRequire(import.meta.url); const cli = join(dirname(require.resolve("tsdown/package.json")), "dist/run.mjs");
  const proc = Bun.spawn([process.execPath, cli, "--config", "qualification.config.ts"], { cwd: packageRoot, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  writeFileSync(join(outputRoot, "build.log"), stdout + stderr);
  if (code) throw new Error(`Candidate build failed (${code}): ${stderr}`);
  if (JSON.stringify(shippingInventory()) !== JSON.stringify(originalFiles)) throw new Error("Shipping source/artifact/fixture inventory changed during candidate build");
  const sourceFiles: { path: string; originalSha256: string; copiedSha256: string }[] = [];
  const sourceScan = (directory: string, prefix: string) => { for (const entry of readdirSync(directory, { withFileTypes: true })) { const relative = join(prefix, entry.name); const file = join(directory, entry.name); if (entry.isDirectory()) sourceScan(file, relative); else if (entry.isFile()) { const originalFile = join(packageSourceRoot, relative); sourceFiles.push({ path: relative, originalSha256: existsSync(originalFile) ? hash(readFileSync(originalFile)) : "absent", copiedSha256: hash(readFileSync(file)) }); } } };
  sourceScan(join(packageRoot, "src"), "src"); sourceScan(tooling, "bench/context-reuse");
  const artifactFiles: { path: string; sha256: string }[] = [];
  const scan = (directory: string) => { for (const item of readdirSync(directory, { withFileTypes: true })) { const file = join(directory, item.name); if (item.isDirectory()) scan(file); else if (item.isFile()) artifactFiles.push({ path: file, sha256: hash(readFileSync(file)) }); } };
  scan(join(packageRoot, "dist"));
  return Object.freeze({ transformerPath: join(packageRoot, "dist/qualification-transformer.cjs"), packageRoot,
    artifactFiles: Object.freeze(artifactFiles.sort((a, b) => a.path.localeCompare(b.path)).map(item => Object.freeze(item))), patchReceipt: patch.patchReceipt,
    originalFiles, sourceFiles: Object.freeze(sourceFiles.sort((a, b) => a.path.localeCompare(b.path)).map(item => Object.freeze(item))),
  });
}
