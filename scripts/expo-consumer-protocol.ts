export type Variant = 'plain' | 'core' | 'compatibility'
export type Platform = 'ios' | 'android'
export type Cell = { platform: Platform; variant: Variant }
export type Identity = Cell & { studyId: string; cohortId: string; fixtureHash: string; sourceHash: string; packageHash: string | null; buildId: string }
export type RunPermit = { identity: Identity; runId: string; deviceId: string; warmup: boolean; round: number; launchUrl: string; deadlineEpochMs: number }
export type Receipt = { identity: Identity; runId: string; deviceId: string; entryMs: number; layoutMs: number; elapsedMs: number; width: number; height: number; dev: boolean; hermes: boolean }
export type Attempt = { origin: 'native' | 'test'; permit: RunPermit; outcome: { kind: 'valid'; receipt: Receipt } | { kind: 'failed'; code: string; detail: string } }
export type ArtifactRecord = { identity: Identity; dependencyLockHash: string; nativeBinaryPath: string; nativeBinaryHash: string; embeddedHermesPath: string; embeddedHermesHash: string; exportedHermesPath: string; exportedHermesHash: string; javascriptPath: string; sourceMapPath: string; inventoryPath: string }
export type StudySummary = { complete: boolean; cells: Array<{ cell: Cell; retained: number; attempted: number; warmups: number; minMs: number | null; medianMs: number | null; maxMs: number | null }>; comparisons: Array<{ platform: Platform; variant: 'core' | 'compatibility'; deltaMs: number; ratio: number | null }>; failures: string[] }
export const variants: readonly Variant[] = ['plain', 'core', 'compatibility']
export const platforms: readonly Platform[] = ['ios', 'android']
export function roundOrder(round: number): Variant[] { return variants.map((_, i) => variants[(i + round % 3) % 3]!) }
const identityKeys = ['studyId','cohortId','fixtureHash','sourceHash','packageHash','buildId','platform','variant'] as const
export function sameIdentity(a: Identity, b: Identity): boolean { return identityKeys.every(k => a[k] === b[k]) }
function record(x: unknown): x is Record<string, unknown> { return x !== null && typeof x === 'object' && !Array.isArray(x) }
export function validateReceipt(input: unknown, permit: RunPermit, consumed: ReadonlySet<string>): { ok: true; receipt: Receipt } | { ok: false; code: string; detail: string } {
  const fail = (code: string) => ({ ok: false as const, code, detail: code })
  if (!record(input) || !record(input.identity)) return fail('malformed-receipt')
  if (!sameIdentity(input.identity as Identity, permit.identity) || input.runId !== permit.runId || input.deviceId !== permit.deviceId) return fail('identity-mismatch')
  if (consumed.has(permit.runId)) return fail('duplicate-run')
  if (input.dev !== false || input.hermes !== true) return fail('not-release-hermes')
  for (const key of ['entryMs','layoutMs','elapsedMs','width','height']) if (typeof input[key] !== 'number' || !Number.isFinite(input[key])) return fail('non-finite-measurement')
  const r = input as unknown as Receipt
  if (r.entryMs < 0 || r.layoutMs < r.entryMs || r.elapsedMs < 0 || Math.abs(r.elapsedMs - (r.layoutMs-r.entryMs)) > 0.001 || r.width <= 0 || r.height <= 0) return fail('invalid-layout-interval')
  return { ok: true, receipt: { identity: { ...permit.identity }, runId: r.runId, deviceId: r.deviceId, entryMs: r.entryMs, layoutMs: r.layoutMs, elapsedMs: r.elapsedMs, width: r.width, height: r.height, dev: false, hermes: true } }
}
export function summariseStudy(attempts: readonly Attempt[], artifacts: readonly ArtifactRecord[]): StudySummary {
  const failures: string[] = [], consumed = new Set<string>(), valid: Attempt[] = [], seen = new Set<string>()
  for (const attempt of attempts) {
    if(seen.has(attempt.permit.runId)){failures.push('duplicate-attempt-id');continue}seen.add(attempt.permit.runId)
    if (attempt.origin !== 'native') { failures.push('test-origin'); continue }
    if (attempt.outcome.kind === 'failed') { failures.push(`${attempt.permit.runId}:${attempt.outcome.code}`); continue }
    const checked = validateReceipt(attempt.outcome.receipt, attempt.permit, consumed)
    if (!checked.ok) { failures.push(`${attempt.permit.runId}:${checked.code}`); continue }
    consumed.add(attempt.permit.runId); valid.push(attempt)
  }
  const sourceKeys = new Set(valid.map(x => `${x.permit.identity.studyId}:${x.permit.identity.cohortId}:${x.permit.identity.sourceHash}`))
  const cells = platforms.flatMap(platform => variants.map(variant => {
    const matching = (x: Attempt) => x.permit.identity.platform === platform && x.permit.identity.variant === variant
    const retained = valid.filter(x => matching(x) && !x.permit.warmup)
    const values = retained.map(x => (x.outcome as {kind:'valid';receipt:Receipt}).receipt.elapsedMs).sort((a,b)=>a-b)
    const middle = Math.floor(values.length/2)
    const median = values.length ? values.length%2 ? values[middle]! : (values[middle-1]!+values[middle]!)/2 : null
    const rounds = retained.map(x=>x.permit.round).sort((a,b)=>a-b)
    if (rounds.length===5 && rounds.join(',')!=='0,1,2,3,4') failures.push(`${platform}/${variant}:invalid-rounds`)
    const identities = new Set(retained.map(x=>JSON.stringify(identityKeys.map(k=>x.permit.identity[k]))))
    if (identities.size > 1) failures.push(`${platform}/${variant}:mixed-build-cohort`)
    const matchingArtifacts = artifacts.filter(a=>a.identity.platform===platform && a.identity.variant===variant)
    if (matchingArtifacts.length!==1 || valid.filter(matching).some(x=>!sameIdentity(x.permit.identity,matchingArtifacts[0]!.identity)) || !(/^[0-9a-f]{64}$/.test(matchingArtifacts[0]?.embeddedHermesHash??'')) || matchingArtifacts[0]?.embeddedHermesHash !== matchingArtifacts[0]?.exportedHermesHash) failures.push(`${platform}/${variant}:missing-or-unmatched-artifact`)
    return {cell:{platform,variant}, retained:values.length, attempted:attempts.filter(x=>matching(x)&&!x.permit.warmup).length, warmups:valid.filter(x=>matching(x)&&x.permit.warmup).length, minMs:values[0]??null,medianMs:median,maxMs:values.at(-1)??null}
  }))
  const comparisons:StudySummary['comparisons']=[]
  for(const platform of platforms){const plain=cells.find(x=>x.cell.platform===platform&&x.cell.variant==='plain')!;for(const variant of ['core','compatibility'] as const){const other=cells.find(x=>x.cell.platform===platform&&x.cell.variant===variant)!;if(plain.medianMs!==null&&other.medianMs!==null)comparisons.push({platform,variant,deltaMs:other.medianMs-plain.medianMs,ratio:plain.medianMs===0?null:other.medianMs/plain.medianMs})}}
  const structuralFailure = failures.some(x=>!attempts.some(a=>a.outcome.kind==='failed' && x===`${a.permit.runId}:${a.outcome.code}`))
  return {complete:sourceKeys.size===1&&!structuralFailure&&cells.every(x=>x.retained===5&&x.warmups===1),cells,comparisons,failures}
}
