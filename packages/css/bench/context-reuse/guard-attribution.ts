import ts from "typescript";
export { createAttribution } from "./guard-profile";
import type { Phase } from "./guard-profile";
/** Instrument only an owned copy; every named function must have exactly one match. */
export function instrumentGuardSource(filename: string, source: string, receiptExperiment = false, pathDigestExperiment = false) {
  if (!["identity.ts", "compile-session.ts"].includes(filename)) throw Error("Unknown guard source");
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  if ((file as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics.length) throw Error("Invalid guard source syntax");
  if (source.includes("__crumbsGuardSpan") || source.includes('"./guard-profile"')) throw Error("Guard source already instrumented");
  const names: Record<string, Phase> = filename === "identity.ts" ? { captureConfiguration: "configuration", assessReuse: "eligibility", verifyBuildInputs: "input-validation", createContextKey: "context-key" } : { sourceInventory: "source-inventory", immutableReceipt: "receipt-clone", perform: "session" };
  const functions = new Map<string, ts.FunctionDeclaration[]>();
  const scan = (node: ts.Node): void => { if (ts.isFunctionDeclaration(node) && node.name) { const name = node.name.text; functions.set(name, [...functions.get(name) ?? [], node]); } ts.forEachChild(node, scan); }; scan(file);
  for (const name of Object.keys(names)) if (functions.get(name)?.length !== 1 || !functions.get(name)![0]!.body) throw Error(`Expected one ${name} body`);
  const counts = new Map<Phase, number>(), count = (phase: Phase) => { counts.set(phase, (counts.get(phase) ?? 0) + 1); };
  const instrumented = ts.transform(file, [context => {
    const visit: ts.Visitor = node => {
      const original = node;
      node = ts.visitEachChild(node, visit, context);
      if (ts.isFunctionDeclaration(node) && node.name && names[node.name.text] && node.body) {
        const phase = names[node.name.text]!; count(phase);
        const start = ts.factory.createVariableStatement(undefined, ts.factory.createVariableDeclarationList([ts.factory.createVariableDeclaration("__crumbsGuardSpan", undefined, undefined, ts.factory.createCallExpression(ts.factory.createIdentifier("guardBegin"), undefined, [ts.factory.createStringLiteral(phase)]))], ts.NodeFlags.Const));
        const finish = ts.factory.createExpressionStatement(ts.factory.createCallExpression(ts.factory.createIdentifier("guardEnd"), undefined, [ts.factory.createIdentifier("__crumbsGuardSpan")]));
        return ts.factory.updateFunctionDeclaration(node, node.modifiers, node.asteriskToken, node.name, node.typeParameters, node.parameters, node.type, ts.factory.createBlock([start, ts.factory.createTryStatement(node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword) ? ts.factory.createBlock([ts.factory.createReturnStatement(ts.factory.createAwaitExpression(ts.factory.createCallExpression(ts.factory.createParenthesizedExpression(ts.factory.createArrowFunction([ts.factory.createModifier(ts.SyntaxKind.AsyncKeyword)], undefined, [], undefined, ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken), node.body)), undefined, [])))]) : node.body, undefined, ts.factory.createBlock([finish]))], true));
      }
      if (ts.isCallExpression(original) && ts.isCallExpression(node)) {
        const name = original.expression.getText(file); let phase: Phase | undefined;
        if (pathDigestExperiment && name === "guardReceiptFileDigest") { count("read-bytes"); count("sha256"); return node; }
        if (pathDigestExperiment && name === "guardReceiptMatches") { count("read-bytes"); return node; }
        if (name === "readFileSync") { count("read-bytes"); if (receiptExperiment) return ts.factory.createCallExpression(ts.factory.createIdentifier("guardReceiptRead"), undefined, node.arguments); return ts.factory.createCallExpression(ts.factory.createIdentifier("guardRead"), undefined, [ts.factory.createArrowFunction(undefined, undefined, [], undefined, ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken), node)]); }
        if (name.startsWith("createHash(") && name.endsWith('.digest')) phase = "sha256";
        if (["backend.fresh", "backend.create", "handle.rebuild", "evaluate"].includes(name)) phase = ({ "backend.fresh": "compile-fresh", "backend.create": "context-create", "handle.rebuild": "rebuild", evaluate: "native" } as Record<string, Phase>)[name];
        if (phase) {
          count(phase);
          if (phase === "sha256" && receiptExperiment) {
            const update = ts.isPropertyAccessExpression(node.expression) ? node.expression.expression : undefined;
            if (!update || !ts.isCallExpression(update) || update.arguments.length !== 1) throw Error("Unsupported hash call shape");
            return ts.factory.createCallExpression(ts.factory.createIdentifier("guardReceiptSha"), undefined, update.arguments);
          }
          if (phase === "sha256") return ts.factory.createCallExpression(ts.factory.createIdentifier("guardMeasure"), undefined, [ts.factory.createStringLiteral(phase), ts.factory.createArrowFunction(undefined, undefined, [], undefined, ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken), node)]);
          const receiver = ts.isPropertyAccessExpression(node.expression) ? node.expression.expression : ts.factory.createIdentifier("undefined");
          return ts.factory.createCallExpression(ts.factory.createIdentifier("guardInvoke"), undefined, [ts.factory.createStringLiteral(phase), node.expression, receiver, ts.factory.createArrayLiteralExpression(node.arguments)]);
        }
      }
      return node;
    };
    return root => ts.visitNode(root, visit) as ts.SourceFile;
  }]);
  try {
    const result = (receiptExperiment ? 'import { guardReceiptRead, guardReceiptSha, guardReceiptFileDigest, guardReceiptMatches, createGuardReceiptPass, GuardReceiptUnstableError } from \"./guard-receipts\";\n' : '') + 'import { guardBegin, guardEnd, guardMeasure, guardRead, guardInvoke } from "./guard-profile";\n' + ts.createPrinter().printFile(instrumented.transformed[0] as ts.SourceFile);
    const check = ts.createSourceFile(filename, result, ts.ScriptTarget.Latest, true);
    if ((check as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics.length) throw Error("Instrumented guard syntax invalid");
    for (const phase of ["read-bytes", "sha256"] as const) if (!counts.get(phase)) throw Error(`Expected ${phase} operations`);
    if (receiptExperiment) {
      const expected: Partial<Record<Phase, number>> = filename === "identity.ts" ? { "read-bytes": 7, sha256: pathDigestExperiment ? 4 : 1, configuration: 1, eligibility: 1, "input-validation": 1, "context-key": 1 } : { "read-bytes": 3, sha256: 1, "receipt-clone": 1, "source-inventory": 1, "compile-fresh": 2, "context-create": 1, rebuild: 1, native: 2, session: 1 };
      if (JSON.stringify([...counts].sort()) !== JSON.stringify(Object.entries(expected).sort())) throw Error("Unsupported receipt operation coverage");
    }
    return { source: result, operations: [...counts].map(([phase, matches]) => ({ phase, matches })) };
  } finally { instrumented.dispose(); }
}

import { cpSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildCandidate } from "./build-candidate";
export async function buildAttributionCandidate(outputRoot: string, receiptExperiment = false, pathDigestExperiment = false) {
  const patches: { filename: string; operations: { phase: Phase; matches: number }[] }[] = [];
  const artifact = await buildCandidate(outputRoot, packageRoot => {
    const tooling = join(packageRoot, "bench/context-reuse");
    cpSync(join(import.meta.dir, "guard-profile.ts"), join(tooling, "guard-profile.ts"));
    if (receiptExperiment) cpSync(join(import.meta.dir, "guard-receipts.ts"), join(tooling, "guard-receipts.ts"));
    for (const filename of ["identity.ts", "compile-session.ts"]) {
      const path = join(tooling, filename);
      const original = readFileSync(path, "utf8");
      const scoped = receiptExperiment ? patchReceiptScopes(filename, original) : original;
      const prepared = pathDigestExperiment ? patchPathDigestSource(filename, scoped) : scoped;
      const patch = instrumentGuardSource(filename, prepared, receiptExperiment, pathDigestExperiment);
      writeFileSync(path, patch.source); patches.push({ filename, operations: patch.operations });
    }
    const transformer = join(packageRoot, "src/transformer.ts");
    writeFileSync(transformer, readFileSync(transformer, "utf8") + '\nexport { __crumbsQualificationProfileDrain } from "../bench/context-reuse/guard-profile";\n');
  });
  return { artifact, patches };
}

/** Exact private-copy edits: reject source drift instead of guessing pass boundaries. */
export function patchReceiptScopes(filename: string, source: string): string {
  const replace = (old: string, next: string) => { if (source.split(old).length !== 2) throw Error(`Expected one receipt boundary: ${old}`); source = source.replace(old, next); };
  if (filename === "identity.ts") {
    replace('if (error instanceof IdentityError) throw error;', 'if (error instanceof GuardReceiptUnstableError) return fail("source-unstable");\n    if (error instanceof IdentityError) throw error;');
    replace('error instanceof IdentityError ? error.reason : "incomplete-resolution-domain"', 'error instanceof GuardReceiptUnstableError ? "source-unstable" : error instanceof IdentityError ? error.reason : "incomplete-resolution-domain"');
    return source;
  }
  if (filename !== "compile-session.ts") throw Error("Unknown receipt source");
  replace('if (mode === "fresh" || disabled) return fresh(request, evaluate);', 'if (mode === "fresh" || disabled) return fresh(request, evaluate);\n    let __crumbsReceiptPass = createGuardReceiptPass();\n    try {');
  replace('const eligibility = assessReuse(request, loadedReceipt, previousReceipt);', 'const eligibility = __crumbsReceiptPass.run(() => assessReuse(request, loadedReceipt!, previousReceipt));');
  replace('current = captureConfiguration(request);', 'current = __crumbsReceiptPass.run(() => captureConfiguration(request));');
  replace('loadedReceipt ? assessReuse(request, loadedReceipt, previousReceipt) : undefined', 'loadedReceipt ? __crumbsReceiptPass.run(() => assessReuse(request, loadedReceipt!, previousReceipt)) : undefined');
  replace('await disposeKey(plan.evict);', '__crumbsReceiptPass.close(); await disposeKey(plan.evict); __crumbsReceiptPass = createGuardReceiptPass();');
  replace('try { before = sourceInventory(request); }', 'try { before = __crumbsReceiptPass.run(() => sourceInventory(request));\n      __crumbsReceiptPass.close(); __crumbsReceiptPass = createGuardReceiptPass(); }');
  replace('const stable = before === sourceInventory(request);', '__crumbsReceiptPass.close(); __crumbsReceiptPass = createGuardReceiptPass();\n      const stable = before === __crumbsReceiptPass.run(() => sourceInventory(request));');
  replace('const after = assessReuse(request, loadedReceipt, previousReceipt);', 'const after = __crumbsReceiptPass.run(() => assessReuse(request, loadedReceipt!, previousReceipt));\n      __crumbsReceiptPass.close();');
  replace('policy = forgetAdmissionKey(policy, plan.key); await disposeKey(plan.key); if (disabled) await drain(); throw error;', 'if (error instanceof GuardReceiptUnstableError) { lastBypassReason = \"source-unstable\"; await drain(); return fresh(request, evaluate); }\n      policy = forgetAdmissionKey(policy, plan.key); await disposeKey(plan.key); if (disabled) await drain(); throw error;');
  replace('\n  }\n  return {\n    compile(request)', '\n    } finally { __crumbsReceiptPass.close(); }\n  }\n  return {\n    compile(request)');
  return source;
}

/** Path-based consumers preserve two-read admission while returning only primitives. */
export function patchPathDigestSource(filename: string, source: string): string {
  const replace = (old: string, next: string) => { if (source.split(old).length !== 2) throw Error(`Expected one path-digest boundary: ${old}`); source = source.replace(old, next); };
  if (filename === "identity.ts") {
    replace('const bytes = readFileSync(path); const hash = sha(bytes);', 'const hash = guardReceiptFileDigest(path);');
    replace('if (sha(readFileSync(path)) !== hash) return fail("source-unstable");', 'if (guardReceiptFileDigest(path) !== hash) return fail("source-unstable");');
    replace('sha(readFileSync(path)) !== hashes.get(path)', 'guardReceiptFileDigest(path) !== hashes.get(path)');
    replace('!Buffer.from(request.entryBytes).equals(readFileSync(resolve(request.cwd, request.filePath)))', '!guardReceiptMatches(resolve(request.cwd, request.filePath), request.entryBytes)');
  } else if (filename === "compile-session.ts") {
    replace('createHash("sha256").update(readFileSync(path)).digest("hex")', 'guardReceiptFileDigest(path)');
  } else throw Error("Unknown path-digest source");
  return source;
}
