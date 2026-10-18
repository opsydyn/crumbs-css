import {test,expect} from 'bun:test'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
const root=resolve(import.meta.dir,'../../..')
const read=(p:string)=>JSON.parse(readFileSync(resolve(root,p),'utf8'))
const previous=read('docs/evidence/2026-10-18-m10-5-v12-rebaseline/previous-registry.json')
const recorded=read('docs/evidence/2026-10-17-m1-10c-expo58-release/final-release/host-report/comparison.json')
const ids=['cold-transform-ms','warm-transform-ms','incremental-rebuild']
test('rebaselines only the three compiler metrics with existing regression allowances',()=>{
 const current=read('packages/css/bench/budgets.json')
 for(const old of previous.metrics){const row=current.metrics.find((m:any)=>m.id===old.id)
  if(!ids.includes(old.id)){expect(row).toEqual(old);continue}
  const median=recorded.metrics.find((m:any)=>m.id===old.id).current.median
  expect(row.baseline.value).toBe(median)
  expect(row.threshold.maxRegressionPercent).toBe(old.threshold.maxRegressionPercent)
  expect(row.threshold.absoluteMax).toBe(Math.ceil(median*(1+old.threshold.maxRegressionPercent/100)*1000)/1000)
 }
 expect(current.diagnostics).toEqual(previous.diagnostics)
})
test('publication admission accepts only the exact complete historical failures and candidate pins',async()=>{
 const m=await import('../../../scripts/m105-rebaseline-publication').catch(()=>undefined)
 expect(typeof m?.assertRebaselineAdmission).toBe('function');if(!m)return
 const failures=ids.map(id=>`Host-budget metric ${id} is fail; expected pass`)
 const medians=Object.fromEntries(ids.map(id=>[id,recorded.metrics.find((r:any)=>r.id===id).current.median]))
 expect(m.assertRebaselineAdmission({valid:false,blockers:failures},false,medians)).toBe('approved-current-baseline')
 for(const blockers of [[],failures.slice(1),[...failures,failures[0]!], [...failures,'source mismatch'], [...failures,'Host-budget metric editor-first-completion-10000 is fail; expected pass']])expect(()=>m.assertRebaselineAdmission({valid:false,blockers},false,medians)).toThrow()
 expect(()=>m.assertRebaselineAdmission({valid:true,blockers:failures},false,medians)).toThrow()
 for(const id of ids){for(const bad of [undefined,NaN,Infinity,0,medians[id]+0.001])expect(()=>m.assertRebaselineAdmission({valid:false,blockers:failures},false,{...medians,[id]:bad})).toThrow()}
 expect(()=>m.assertRebaselineContext(m.approvedRebaselineRelease)).not.toThrow()
 for(const key of ['releaseTag','sourceRevision','packageName','packageVersion','tarballSha256','reportDigest'])expect(()=>m.assertRebaselineContext({...m.approvedRebaselineRelease,[key]:'changed'})).toThrow()
})


test('receipt binds approval, manifest and dispatched verifier identity', async () => {
 const m = await import('../../../scripts/m105-rebaseline-publication')
 const hash='a'.repeat(64), revision='b'.repeat(40), tool='c'.repeat(64)
 const receipt={format:'crumbs.m105-rebaseline.publication-baseline.v1',approval:m.approvedRebaselineRelease,manifestSha256:hash,toolingRevision:revision,toolingSha256:tool}
 expect(()=>m.assertRebaselineReceipt(receipt,hash,revision,tool)).not.toThrow()
 for(const key of ['format','approval','manifestSha256','toolingRevision','toolingSha256'])
  expect(()=>m.assertRebaselineReceipt({...receipt,[key]:'tampered'},hash,revision,tool)).toThrow()
 expect(()=>m.assertRebaselineReceipt(receipt,'invalid',revision,tool)).toThrow()
 const failures=Object.keys(m.approvedRebaselineRelease.medians).map(id=>`Host-budget report is not release-qualified: Host-budget metric ${id} is fail; expected pass`)
 expect(m.assertRebaselineAdmission({valid:false,blockers:failures},true,m.approvedRebaselineRelease.medians)).toBe('approved-current-baseline')
 expect(()=>m.assertRebaselineAdmission({valid:false,blockers:[...failures,'Tarball SHA-256 hash does not match the manifest']},true,m.approvedRebaselineRelease.medians)).toThrow()
})


test('retained evidence passes all blocking rows under the new policy and retains advisory failures', async () => {
 const {compareRecordedMetrics,budgetRegistryCodec}=await import('../bench/budget-contract')
 const {loadHostBudgetPolicy,evaluateReleaseHostBudgetRows}=await import('../../../scripts/release-host-budget-policy')
 const registry=budgetRegistryCodec.decode(read('packages/css/bench/budgets.json'))
 if(!registry.ok)throw Error('Registry must decode')
 const evidence='docs/evidence/2026-10-17-m1-10c-expo58-release/final-release/host-report/'
 const comparison=compareRecordedMetrics(registry.value,root,{
  effect:read(evidence+'effect.json'),runtimeInit:read(evidence+'runtime-initialization.json'),
  benchmark:read(evidence+'benchmark-summary.json'),incremental:read(evidence+'metro-incremental.json'),
  editor:read(evidence+'editor.json'),runtimeGraph:read(evidence+'runtime-graph.json'),
 })
 const evaluation=evaluateReleaseHostBudgetRows(comparison.metrics,loadHostBudgetPolicy(root))
 expect(evaluation.releasePolicyQualified).toBe(true)
 expect(evaluation.blocking.passIds).toHaveLength(11)
 expect(evaluation.advisory.failIds).toHaveLength(8)
 expect(evaluation.advisory.passIds).toHaveLength(2)
 expect(evaluation.blockers).toEqual([])
 expect(read('docs/evidence/2026-10-18-m10-5-v12-rebaseline/reassessment.json').metrics).toEqual(comparison.metrics)
 expect(recorded.releasePolicyQualified).toBe(false)
})
