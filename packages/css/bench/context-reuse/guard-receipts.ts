/** Private experiment. Explicit synchronous byte snapshots, never a cross-request cache. */
import { readFileSync, realpathSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { guardMeasure, guardRead } from "./guard-profile";
type Receipt = { bytes: Buffer; hash: string };
let active: Map<string, Receipt> | undefined;
let activePathDigests = false;
const returned = new WeakMap<Uint8Array, Receipt>();
const digest = (bytes: string | Uint8Array) => guardMeasure("sha256", () => createHash("sha256").update(bytes).digest("hex"));
export class GuardReceiptUnstableError extends Error { readonly reason = "source-unstable"; constructor() { super("Guard receipt bytes changed during sampling"); } }
export function createGuardReceiptPass(enabled = process.env.CRUMBS_GUARD_RECEIPTS === "1", pathDigests = process.env.CRUMBS_GUARD_PATH_DIGESTS === "1") {
  const receipts = enabled ? new Map<string, Receipt>() : undefined;
  let closed = false;
  return {
    run<T>(work: () => T): T {
      if (closed) throw Error("Guard receipt pass is closed");
      const prior = active, priorPathDigests = activePathDigests; active = receipts; activePathDigests = enabled && pathDigests;
      try { const result = work(); if (result && (typeof result === "object" || typeof result === "function") && "then" in result) throw Error("Guard receipt scope must be synchronous"); return result; }
      finally { active = prior; activePathDigests = priorPathDigests; }
    },
    close() { closed = true; receipts?.clear(); },
  };
}
export function guardReceiptRead(path: string): Buffer;
export function guardReceiptRead(path: string, encoding: "utf8"): string;
export function guardReceiptRead(path: string, encoding?: "utf8"): Buffer | string {
  if (!active) return guardRead(() => encoding ? readFileSync(path, encoding) : readFileSync(path));
  const receipt = sampleReceipt(path);
  if (encoding) return receipt.bytes.toString(encoding);
  const bytes = Buffer.from(receipt.bytes); returned.set(bytes, receipt); return bytes;
}
export function guardReceiptSha(bytes: string | Uint8Array): string {
  const receipt = typeof bytes === "string" ? undefined : returned.get(bytes);
  // Consumers own their copy: never serve a saved digest for subsequently mutated bytes.
  if (receipt && Buffer.from(bytes).equals(receipt.bytes)) return receipt.hash;
  return digest(bytes);
}

function sampleReceipt(path: string): Receipt {
  // Keep logical identity, and recanonicalise each lookup so symlink retargets do not hit an old receipt.
  const key = JSON.stringify([resolve(path), realpathSync(path)]);
  let receipt = active!.get(key);
  if (!receipt) {
    const bytes = guardRead(() => readFileSync(path)), hash = digest(bytes);
    const second = guardRead(() => readFileSync(path));
    if (digest(second) !== hash) throw new GuardReceiptUnstableError();
    receipt = { bytes, hash }; active!.set(key, receipt);
  }
  return receipt;
}

/** Digest-only consumers get an immutable primitive; owned bytes never escape. */
export function guardReceiptFileDigest(path: string): string {
  return active && activePathDigests ? sampleReceipt(path).hash : guardReceiptSha(guardReceiptRead(path));
}
/** Compare the request's view without allocating or exposing a receipt buffer. */
export function guardReceiptMatches(path: string, bytes: Uint8Array): boolean {
  if (active && activePathDigests) return sampleReceipt(path).bytes.equals(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
  return Buffer.from(bytes).equals(guardReceiptRead(path));
}
