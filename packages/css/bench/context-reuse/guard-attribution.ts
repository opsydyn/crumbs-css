import ts from "typescript";
export { createAttribution } from "./guard-profile";
import type { Phase } from "./guard-profile";
/** Instrument only an owned copy; every named function must have exactly one match. */
export function instrumentGuardSource(filename: string, source: string) {
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
        if (name === "readFileSync") { count("read-bytes"); return ts.factory.createCallExpression(ts.factory.createIdentifier("guardRead"), undefined, [ts.factory.createArrowFunction(undefined, undefined, [], undefined, ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken), node)]); }
        if (name.startsWith("createHash(") && name.endsWith('.digest')) phase = "sha256";
        if (["backend.fresh", "backend.create", "handle.rebuild", "evaluate"].includes(name)) phase = ({ "backend.fresh": "compile-fresh", "backend.create": "context-create", "handle.rebuild": "rebuild", evaluate: "native" } as Record<string, Phase>)[name];
        if (phase) {
          count(phase);
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
    const result = 'import { guardBegin, guardEnd, guardMeasure, guardRead, guardInvoke } from "./guard-profile";\n' + ts.createPrinter().printFile(instrumented.transformed[0] as ts.SourceFile);
    const check = ts.createSourceFile(filename, result, ts.ScriptTarget.Latest, true);
    if ((check as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics.length) throw Error("Instrumented guard syntax invalid");
    for (const phase of ["read-bytes", "sha256"] as const) if (!counts.get(phase)) throw Error(`Expected ${phase} operations`);
    return { source: result, operations: [...counts].map(([phase, matches]) => ({ phase, matches })) };
  } finally { instrumented.dispose(); }
}

import { cpSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildCandidate } from "./build-candidate";
export async function buildAttributionCandidate(outputRoot: string) {
  const patches: { filename: string; operations: { phase: Phase; matches: number }[] }[] = [];
  const artifact = await buildCandidate(outputRoot, packageRoot => {
    const tooling = join(packageRoot, "bench/context-reuse");
    cpSync(join(import.meta.dir, "guard-profile.ts"), join(tooling, "guard-profile.ts"));
    for (const filename of ["identity.ts", "compile-session.ts"]) {
      const path = join(tooling, filename), patch = instrumentGuardSource(filename, readFileSync(path, "utf8"));
      writeFileSync(path, patch.source); patches.push({ filename, operations: patch.operations });
    }
    const transformer = join(packageRoot, "src/transformer.ts");
    writeFileSync(transformer, readFileSync(transformer, "utf8") + '\nexport { __crumbsQualificationProfileDrain } from "../bench/context-reuse/guard-profile";\n');
  });
  return { artifact, patches };
}
