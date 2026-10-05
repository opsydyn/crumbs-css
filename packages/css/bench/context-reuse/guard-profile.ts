/** Private diagnostic spans. The sequential qualification probe owns this collector. */
export type Phase = "session" | "read-bytes" | "sha256" | "configuration" | "eligibility" | "input-validation" | "context-key" | "source-inventory" | "receipt-clone" | "compile-fresh" | "context-create" | "rebuild" | "native";
export type PhaseRow = { phase: Phase; calls: number; inclusiveMs: number; exclusiveMs: number; bytesRead?: number; readGroups?: Record<string, { calls: number; bytesRead: number }> };
type Span = { phase: Phase; began: number; childrenMs: number };
export function createAttribution(clock = () => performance.now(), enabled = true) {
  const stack: Span[] = [], totals = new Map<Phase, PhaseRow>();
  const row = (phase: Phase) => { let value = totals.get(phase); if (!value) { value = { phase, calls: 0, inclusiveMs: 0, exclusiveMs: 0 }; totals.set(phase, value); } return value; };
  const begin = (phase: Phase): Span | undefined => { if (!enabled) return; const span = { phase, began: clock(), childrenMs: 0 }; stack.push(span); return span; };
  const end = (span: Span | undefined) => {
    if (!span) return;
    if (stack.at(-1) !== span) throw Error("Guard span order violated");
    const elapsed = clock() - span.began; if (!Number.isFinite(elapsed) || elapsed < span.childrenMs) throw Error("Invalid guard clock");
    stack.pop(); const value = row(span.phase); value.calls++; value.inclusiveMs += elapsed; value.exclusiveMs += elapsed - span.childrenMs;
    const parent = stack.at(-1); if (parent) parent.childrenMs += elapsed;
  };
  return { begin, end, measure<T>(phase: Phase, work: () => T): T { const span = begin(phase); try { return work(); } finally { end(span); } },
    read<T extends string | Uint8Array>(work: () => T): T {
      const span = begin("read-bytes"); try { const value = work(); if (enabled) { const item = row("read-bytes"); const bytes = typeof value === "string" ? Buffer.byteLength(value) : value.byteLength;
          item.bytesRead = (item.bytesRead ?? 0) + bytes;
          const owner = [...stack].reverse().find(span => !["read-bytes", "sha256"].includes(span.phase))?.phase ?? "module";
          const groups = item.readGroups ??= {}; const group = groups[owner] ??= { calls: 0, bytesRead: 0 }; group.calls++; group.bytesRead += bytes; } return value; } finally { end(span); }
    },
    drain(): PhaseRow[] { if (stack.length) throw Error("Cannot drain active guard spans"); const rows = [...totals.values()].map(value => ({ ...value, ...(value.readGroups ? { readGroups: structuredClone(value.readGroups) } : {}) })); totals.clear(); return rows; },
  };
}
const collector = createAttribution(undefined, process.env.CRUMBS_GUARD_PROFILE === "1");
export const guardBegin = collector.begin;
export const guardEnd = collector.end;
export const guardMeasure = collector.measure;
export const guardRead = collector.read;
export const __crumbsQualificationProfileDrain = collector.drain;
export async function guardAwait<T>(phase: Phase, work: () => Promise<T>): Promise<T> {
  const span = guardBegin(phase); try { return await work(); } finally { guardEnd(span); }
}
export function guardInvoke<Args extends unknown[], T>(phase: Phase, work: (...args: Args) => Promise<T>, receiver: unknown, args: Args): Promise<T> {
  return guardAwait(phase, () => Reflect.apply(work, receiver, args) as Promise<T>);
}
