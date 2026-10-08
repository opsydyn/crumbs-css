#!/usr/bin/env python3
"""Verify archived diagnostic byte attribution; this never qualifies performance."""
import base64
import bisect
import gzip
import hashlib
import json
import sys
import tarfile
from collections import defaultdict
from pathlib import Path,PurePosixPath

ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
def need(condition,message):
 if not condition:raise ValueError(message)
def sha(data):return hashlib.sha256(data).hexdigest()
def read_tar(path):
 out={}
 with tarfile.open(path,'r:gz') as archive:
  for row in archive:
   p=PurePosixPath(row.name)
   need(row.isfile() and not p.is_absolute() and '..' not in p.parts and row.name not in out,'Unsafe/duplicate archive member')
   out[row.name]=archive.extractfile(row).read()
 return out
def vlq(segment):
 values=[];value=shift=0
 for char in segment:
  digit=ALPHABET.index(char);value|=(digit&31)<<shift
  if digit&32:shift+=5;need(shift<40,'Unbounded VLQ')
  else:values.append(-(value>>1) if value&1 else value>>1);value=shift=0
 need(shift==0,'Truncated VLQ')
 return values
def mappings(text):
 result=[];source=original_line=original_column=name=0
 for line in text.split(';'):
  generated=0;entries=[]
  for segment in line.split(','):
   if not segment:continue
   values=vlq(segment);need(len(values) in (1,4,5),'Mapping arity');generated+=values[0]
   need(generated>=0 and (not entries or generated>=entries[-1][0]),'Mapping order')
   origin=None
   if len(values)>1:
    source+=values[1];original_line+=values[2];original_column+=values[3]
    if len(values)==5:name+=values[4]
    need(min(source,original_line,original_column)>=0,'Negative origin')
    origin=(source,original_line,original_column)
   entries.append((generated,origin))
  result.append(entries)
 return result
def units(text):return len(text.encode('utf-16-le'))//2
def byte_attribution(code,map_data,artifact,declarations,cohort,source_files):
 parsed=json.loads(map_data);need(parsed['version']==3 and parsed['sources']==artifact['sources'],'Map format/source order')
 records=[]
 for index,row in enumerate(artifact['sourceInventory']):
  text=parsed['sourcesContent'][index];content=text.encode()
  need(sha(content)==row['sha256']==sha(source_files[row['source']]),'Source-map source content binding')
  start=0;lines=[]
  for line in text.splitlines(keepends=True):lines.append(start);start+=units(line)
  if text.endswith('\n'):lines.append(start)
  key=next((key for key in declarations if key.endswith('/'+cohort+'/'+row['source'])),None)
  need(key is not None,'Missing declaration spans')
  records.append((row['source'],lines,declarations[key]))
 rows=mappings(parsed['mappings']);columns=[[entry[0] for entry in row] for row in rows];owned=defaultdict(lambda:[0,0])
 spans=artifact['literalSpans'];need(all(0<=a<b for a,b in spans),'Literal range')
 need(all(spans[i-1][1]<=spans[i][0] for i in range(1,len(spans))),'Literal overlap')
 line=column=offset=literal_index=0
 for char in code:
  source='<unmapped>';owner='<unmapped>';original_line=0
  entries=rows[line] if line<len(rows) else []
  chosen=bisect.bisect_right(columns[line],column)-1 if line<len(columns) else -1
  if chosen>=0 and entries[chosen][1] is not None:
   source_index,mapped_line,mapped_column=entries[chosen][1]
   need(source_index<len(records),'Source index')
   source,starts,definitions=records[source_index];need(mapped_line<len(starts),'Source line')
   original_offset=starts[mapped_line]+mapped_column
   found=next((item for item in definitions if item['start']<=original_offset<item['end']),None)
   owner=found['name'] if found else '<unowned>';original_line=found['line'] if found else mapped_line+1
  amount=len(char.encode());bucket=owned[(source,owner,original_line)];bucket[0]+=amount
  while literal_index<len(spans) and spans[literal_index][1]<=offset:literal_index+=1
  if literal_index<len(spans) and spans[literal_index][0]<=offset<spans[literal_index][1]:bucket[1]+=amount
  width=2 if ord(char)>65535 else 1;offset+=width
  if char=='\n':line+=1;column=0
  else:column+=width
 need(all(end<=offset for _,end in spans),'Literal bounds')
 expected={(row['source'],row['owner'],row['line']):(row['bytes'],row['literalTokenBytes']) for row in artifact['owners']}
 need({key:tuple(value) for key,value in owned.items()}==expected,'VLQ owner/literal derivation')
 return owned
def verify(root):
 packet=json.loads((root/'packet.json').read_text())
 need(packet['format']=='crumbs.m10.5.runtime-attribution-packet' and packet['version']==1,'Packet format')
 need(packet['qualification']=='diagnostic-only','Qualification boundary')
 need(set(packet['files'])=={'attribution.json.gz','mapped-artifacts.tar.gz','summary.json'},'Raw inventory')
 need(set(packet['priorFiles'])=={'control-package.tar.gz','candidate-package.tar.gz','packet.json'},'Prior inventory')
 for name,digest in packet['files'].items():
  need(PurePosixPath(name).name==name and sha((root/name).read_bytes())==digest,'Raw file hash')
 report=json.loads(gzip.decompress((root/'attribution.json.gz').read_bytes()));assets=read_tar(root/'mapped-artifacts.tar.gz')
 prior=root.parent/'2026-10-08-m10-5-consolidated-host-remediation'
 for name,digest in packet['priorFiles'].items():need(sha((prior/name).read_bytes())==digest,'Prior control/candidate binding')
 original={name:read_tar(prior/(name+'-package.tar.gz')) for name in ['control','candidate']}
 checked={};graph_count=0
 need(set(report['cohorts'])=={'control','minified-control','candidate'},'Cohorts')
 expected_members=set();paired_count=0
 need(set(report['mappedArtifactParity'])==set(report['cohorts']),'Parity cohorts')
 for cohort,records in report['mappedArtifactParity'].items():
  need(len(records)==20 and len({row['file'] for row in records})==20,'Parity inventory')
  for row in records:
   name=row['file'];need(PurePosixPath(name).name==name,'Artifact filename')
   generated=cohort+'/mapped-dist/'+name;reference=cohort+'/reference/'+name
   expected_members.update([generated,reference]);need(assets[generated]==assets[reference] and sha(assets[generated])==row['sha256'],'Complete artifact parity')
   if cohort!='minified-control':need(assets[generated]==original[cohort]['dist/'+name],'Complete original parity')
   if row['mapSha256'] is not None:
    expected_members.add(generated+'.map');need(sha(assets[generated+'.map'])==row['mapSha256'],'Complete map inventory')
   paired_count+=1
 need(set(assets)==expected_members,'Raw artifact membership')
 for cohort,graphs in report['cohorts'].items():
  source_files=original['candidate' if cohort=='candidate' else 'control']
  need(set(graphs)=={'theme-core.mjs','theme-core.cjs','theme.mjs','theme.cjs'},'Graph set')
  for entry,graph in graphs.items():
   source_totals=defaultdict(lambda:[0,0]);owner_totals=defaultdict(lambda:[0,0]);total=0
   for artifact in graph['artifacts']:
    path=cohort+'/mapped-dist/'+artifact['file'];code=assets[path];reference=assets[cohort+'/reference/'+artifact['file']]
    need(code==reference and sha(code)==artifact['sha256'] and len(code)==artifact['bytes'],'Diagnostic/reference artifact parity')
    if cohort!='minified-control':need(code==source_files['dist/'+artifact['file']],'Archived artifact parity')
    map_bytes=assets[path+'.map'];need(sha(map_bytes)==artifact['mapSha256'],'Map hash')
    key=cohort+'/'+artifact['file']
    if key not in checked:checked[key]=byte_attribution(code.decode(),map_bytes,artifact,report['sourceDeclarations'],cohort,source_files)
    for (source,owner,line),amounts in checked[key].items():
     for i in range(2):source_totals[source][i]+=amounts[i];owner_totals[(source,owner,line)][i]+=amounts[i]
    total+=len(code)
   need(total==graph['bytes'],'Graph byte total')
   need({key:tuple(value) for key,value in source_totals.items()}=={row['source']:(row['bytes'],row['literalTokenBytes']) for row in graph['sourceBytes']},'Source byte totals')
   need({key:tuple(value) for key,value in owner_totals.items()}=={(row['source'],row['owner'],row['line']):(row['bytes'],row['literalTokenBytes']) for row in graph['ownerBytes']},'Declaration totals')
   graph_count+=1
 summary=json.loads((root/'summary.json').read_text())
 need(summary['qualification']=='diagnostic-only','Summary qualification')
 need(sha(summary['registryText'].encode())==summary['registrySha256']=='0f5752c430db6ced1f8d8a5c94c7de865a3ba9daadaa9a60584148eeb0a4687b','Unchanged approved registry')
 need(summary['sourceRevision']==report['sourceRevision']=='48d3efb69795421fe584226032e30d4e5947ca18','Source revision')
 need(summary['sourceIdentitySha256']=='8fe7d6c28c26c9d4214549790d504c62f87c24f6886d7da40e031dd7e9fb4a76','Source content identity')
 metrics={row['id']:row for row in json.loads(summary['registryText'])['metrics']}
 need(len(summary['graphs'])==4 and {row['entry'] for row in summary['graphs']}=={'theme-core.mjs','theme-core.cjs','theme.mjs','theme.cjs'},'Summary graph rows')
 need(summary['componentSourceDefinition']==['src/components/contracts.ts','src/components/extension-contract.ts','src/runtime/data-admission.ts','src/runtime/component-recipe-resolution-plan.ts'],'Selected source definition')
 need(summary['pairedRuntimeArtifacts']==paired_count and summary['canonicalScannerGraphsVerified']==graph_count,'Verification counts')
 for row in summary['graphs']:
  entry=row['entry'];g=report['cohorts']['candidate'][entry]
  family='theme-core' if entry.startswith('theme-core') else 'theme-compatibility';fmt='esm' if entry.endswith('.mjs') else 'cjs'
  limit=metrics[f'runtime-{family}-{fmt}-graph-bytes']['threshold']['absoluteMax']
  literals=sum(item['literalTokenBytes'] for item in g['sourceBytes'])
  component=sum(item['bytes'] for item in g['sourceBytes'] if item['source'] in summary['componentSourceDefinition'])
  need(row['controlBytes']==report['cohorts']['control'][entry]['bytes'] and row['minifiedControlBytes']==report['cohorts']['minified-control'][entry]['bytes'],'Cohort summary')
  need(row['rejectedCandidateBytes']==g['bytes'] and row['ceiling']==limit and row['gapBytes']==g['bytes']-limit,'Fixed graph gap')
  need(abs(row['requiredReductionPercent']-100*(g['bytes']-limit)/g['bytes'])<1e-10,'Reduction percentage')
  need(row['consolidationSavingBytes']==row['minifiedControlBytes']-g['bytes'],'Consolidation delta')
  need(row['literalTokenBytes']==literals and row['remainderWithZeroLiteralSpans']==g['bytes']-literals,'Literal counterfactual')
  need(row['selectedComponentSourceBytes']==component and row['remainderWithZeroSelectedComponentSpans']==g['bytes']-component,'Selected source counterfactual')
 return {'verified':'diagnostic byte attribution','graphs':graph_count,'pairedArtifacts':paired_count,'uniqueReachableArtifacts':len(checked),'qualification':'not-run'}
if __name__=='__main__':
 try:print(json.dumps(verify(Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).parent)))
 except (OSError,ValueError,KeyError,TypeError,IndexError,tarfile.TarError) as error:
  print('Attribution evidence rejected: '+str(error),file=sys.stderr);sys.exit(1)
