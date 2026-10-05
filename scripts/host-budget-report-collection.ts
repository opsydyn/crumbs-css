import {assertBenchmarkBudget,type BenchmarkMetric} from '../packages/css/bench/perf-harness'
/** A complete retained report may contain failed smoke budgets; execution failures still abort. */
export function acceptBenchmarkProcessReport(report: unknown,exitCode:number,stderr:string){
 if(report===null||typeof report!=='object'||!('metrics' in report)||!Array.isArray(report.metrics)||report.metrics.length===0)throw Error('Invalid retained benchmark report')
 const failures:{name:string;message:string}[]=[]
 for(const metric of report.metrics){
  if(metric===null||typeof metric!=='object'||typeof metric.name!=='string'||!Number.isFinite(metric.hz)||metric.hz<0||!Number.isFinite(metric.batchMeanP95Ms)||metric.batchMeanP95Ms<0)throw Error('Invalid retained benchmark metric')
  if(metric.budget!==undefined){
   for(const field of ['maxBatchMeanP95Ms','minHz'])if(metric.budget[field]!==undefined&&(!Number.isFinite(metric.budget[field])||metric.budget[field]<0))throw Error('Invalid retained benchmark ceiling')
  }
  try{assertBenchmarkBudget(metric as BenchmarkMetric)}catch(error){failures.push({name:metric.name,message:String(error)})}
 }
 if(exitCode!==0&&(!stderr.includes('assertBenchmarkBudget')||!failures.some(failure=>stderr.includes(failure.message.replace(/^Error: /,'')))))throw Error('Benchmark execution failed independently of its measured smoke budgets: '+stderr)
 if(exitCode===0&&failures.length>0)throw Error('Benchmark process outcome disagrees with retained smoke failures')
 return {status:failures.length?'failed' as const:'passed' as const,exitCode,failures}
}
