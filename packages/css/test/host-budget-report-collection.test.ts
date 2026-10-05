import { test, expect } from 'bun:test'
import { acceptBenchmarkProcessReport } from '../../../scripts/host-budget-report-collection'
const report={metrics:[{name:'recipe',hz:100,batchMeanP95Ms:7,budget:{maxBatchMeanP95Ms:6}}]}
test('retains a measured smoke failure but rejects unrelated execution failure and inconsistent success',()=>{
 expect(acceptBenchmarkProcessReport(report,1,'error: recipe batch-mean-p95 7.000000ms exceeded budget 6.000000ms\n at assertBenchmarkBudget')).toMatchObject({status:'failed',failures:[{name:'recipe'}]})
 expect(()=>acceptBenchmarkProcessReport(report,1,'error: ENOSPC at assertBenchmarkBudget')).toThrow('execution failed')
 expect(()=>acceptBenchmarkProcessReport(report,0,'')).toThrow('outcome disagrees')
 expect(acceptBenchmarkProcessReport({metrics:[{...report.metrics[0],batchMeanP95Ms:5}]},0,'')).toMatchObject({status:'passed',failures:[]})
})
