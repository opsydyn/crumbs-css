import { runGuardReceiptAB } from "./guard-receipt-ab";
if (import.meta.main) {
  const root = process.argv[2];
  if (!root) throw Error("usage: bun guard-path-digest-ab.ts <empty-owned-root> [--smoke]");
  await runGuardReceiptAB(root, { pathDigestExperiment: true, smoke: process.argv.includes("--smoke") });
}
