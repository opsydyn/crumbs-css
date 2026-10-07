export type MetroTraceParity = Readonly<{
  entryHash: string; sourceHash: string; inputsHash: string; metadataHash: string; resultHash: string;
}>;
export type MetroTraceMatch = MetroTraceParity & Readonly<{ id: string }>;

/** Select the transform result for this exact input/reference, even when Metro serves it from cache. */
export function selectExactMetroTrace<T extends MetroTraceMatch>(rows: readonly T[], expected: MetroTraceParity): T | undefined {
  return rows.filter(row => row.entryHash === expected.entryHash && row.sourceHash === expected.sourceHash
    && row.inputsHash === expected.inputsHash && row.metadataHash === expected.metadataHash && row.resultHash === expected.resultHash).at(-1);
}

/** Trace ids are process-local sequence numbers, so include the PID when identifying a new invocation. */
export const metroTraceId = (row: Readonly<{ pid: number; sequence: number }>) => `${row.pid}:${row.sequence}`;
export function isNewMetroTrace(previous: ReadonlySet<string>, row: MetroTraceMatch): boolean { return !previous.has(row.id); }
