import { afterEach, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createGuardReceiptPass, guardReceiptRead, guardReceiptSha } from "../bench/context-reuse/guard-receipts";
const roots: string[] = [];
afterEach(() => { for (const path of roots.splice(0)) rmSync(path, { recursive: true, force: true }); });
const fixture = () => { const root = mkdtempSync(join(tmpdir(), "crumbs-pass-")); roots.push(root); const path = join(root, "bytes"); writeFileSync(path, "first"); return path; };
it("shares validated bytes and digests only inside an explicit synchronous pass", () => {
  const path = fixture(), pass = createGuardReceiptPass(true);
  pass.run(() => {
    const bytes = guardReceiptRead(path);
    expect(guardReceiptSha(bytes)).toBe("a7937b64b8caa58f03721bb6bacf5c78cb235febe0e70b1b84cd99541461a08e");
    writeFileSync(path, "later");
    expect(guardReceiptRead(path, "utf8")).toBe("first");
  });
  expect(createGuardReceiptPass(true).run(() => guardReceiptRead(path, "utf8"))).toBe("later");
  expect(guardReceiptRead(path, "utf8")).toBe("later");
});
it("owns buffer bytes so a consumer cannot corrupt shared receipts", () => {
  const path = fixture();
  createGuardReceiptPass(true).run(() => { const bytes = guardReceiptRead(path); bytes.fill(0); expect(guardReceiptRead(path, "utf8")).toBe("first"); expect(guardReceiptSha(bytes)).not.toBe("a7937b64b8caa58f03721bb6bacf5c78cb235febe0e70b1b84cd99541461a08e"); });
});
it("new passes detect byte edits even with preserved timestamps", () => {
  const path = fixture(), stat = statSync(path);
  expect(createGuardReceiptPass(true).run(() => guardReceiptRead(path, "utf8"))).toBe("first");
  writeFileSync(path, "later"); utimesSync(path, stat.atime, stat.mtime);
  expect(createGuardReceiptPass(true).run(() => guardReceiptRead(path, "utf8"))).toBe("later");
});
it("rejects reuse after a pass is closed and restores ambient scope after errors", () => {
  const path = fixture(), pass = createGuardReceiptPass(true), error = new Error("failure");
  expect(() => pass.run(() => { guardReceiptRead(path); throw error; })).toThrow(error);
  pass.close(); expect(() => pass.run(() => guardReceiptRead(path))).toThrow("closed");
  writeFileSync(path, "later"); expect(guardReceiptRead(path, "utf8")).toBe("later");
});
it("disabled passes preserve live reads and synchronous scope rejects promises", () => {
  const path = fixture();
  createGuardReceiptPass(false).run(() => { guardReceiptRead(path); writeFileSync(path, "later"); expect(guardReceiptRead(path, "utf8")).toBe("later"); });
  expect(() => createGuardReceiptPass(true).run(() => Promise.resolve(1))).toThrow("synchronous");
  expect(readFileSync(path, "utf8")).toBe("later");
});
it("does not reuse a receipt when a declared symlink is retargeted inside a pass", async () => {
  const { symlinkSync, unlinkSync } = await import("node:fs");
  const first = fixture(), second = fixture(); writeFileSync(second, "other"); const link = join(roots[0]!, "link"); symlinkSync(first, link);
  const pass = createGuardReceiptPass(true);
  try { pass.run(() => { expect(guardReceiptRead(link, "utf8")).toBe("first"); unlinkSync(link); symlinkSync(second, link); expect(guardReceiptRead(link, "utf8")).toBe("other"); }); }
  finally { pass.close(); }
});
it("rejects operation drift and produces executable synchronous boundaries in the owned session", async () => {
  const { instrumentGuardSource, patchReceiptScopes } = await import("../bench/context-reuse/guard-attribution");
  const source = readFileSync(join(import.meta.dir, "../bench/context-reuse/compile-session.ts"), "utf8");
  const prepared = patchReceiptScopes("compile-session.ts", source);
  expect(() => new Bun.Transpiler({ loader: "ts" }).transformSync(instrumentGuardSource("compile-session.ts", prepared, true).source)).not.toThrow();
  expect(() => instrumentGuardSource("compile-session.ts", prepared.replace("await handle.rebuild()", "await handle.other()"), true)).toThrow("coverage");
  expect(() => patchReceiptScopes("compile-session.ts", source.replace("const stable = before === sourceInventory(request);", "const stable = true;"))).toThrow("boundary");
});
it("falls back to fresh when real bytes change between inventory samples before or after compilation", async () => {
  const { cpSync, mkdirSync, symlinkSync } = await import("node:fs");
  const { patchReceiptScopes, instrumentGuardSource } = await import("../bench/context-reuse/guard-attribution");
  const { sessionFixture, ControlledBackend } = await import("./support/context-reuse");
  for (const sample of [1, 2]) {
    const root = mkdtempSync(join(tmpdir(), "crumbs-sampling-")); roots.push(root);
    const tooling = join(import.meta.dir, "../bench/context-reuse");
    for (const file of ["guard-receipts.ts", "guard-profile.ts", "admission-policy.ts"]) cpSync(join(tooling, file), join(root, file));
    symlinkSync(join(import.meta.dir, "../node_modules"), join(root, "node_modules"));
    for (const file of ["identity.ts", "compile-session.ts"]) writeFileSync(join(root, file), instrumentGuardSource(file, patchReceiptScopes(file, readFileSync(join(tooling, file), "utf8")), true).source);
    // Deterministically change actual owned bytes between the helper's two filesystem reads.
    const helper = join(root, "guard-receipts.ts");
    writeFileSync(helper, 'import { writeFileSync } from "node:fs"; let samples = 0;\n' + readFileSync(helper, "utf8").replace('const second = guardRead(() => readFileSync(path));', `if (path.endsWith("A.css.ts") && ++samples === ${sample}) writeFileSync(path, "export const value = 999;");\n    const second = guardRead(() => readFileSync(path));`).replace('enabled = process.env.CRUMBS_GUARD_RECEIPTS === "1"', 'enabled = true'));
    const { createCompileSession } = await import(join(root, "compile-session.ts"));
    const fixture = sessionFixture(), backend = new ControlledBackend();
    const session = createCompileSession({ settings: { capacity: 2, admission: "immediate" }, mode: "immediate", idleMs: 1000, backend });
    try { expect((await session.compile(fixture.request())).source).toBe("export const value = 999;"); expect(session.snapshot()).toMatchObject({ live: 0, lastBypassReason: "source-unstable" }); }
    finally { await session.close(); fixture.remove(); }
  }
}, 30000);
