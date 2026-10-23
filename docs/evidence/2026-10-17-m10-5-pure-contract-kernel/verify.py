#!/usr/bin/env python3
"""Verify retained evidence consistency. Does not attest execution or rerun qualification."""
import argparse, hashlib, json, re, subprocess, tarfile
from pathlib import Path

def require(condition,message):
    if not condition:raise AssertionError(message)
def digest(data):return hashlib.sha256(data).hexdigest()
def encoded(value):return json.dumps(value,separators=(',',':'),ensure_ascii=False).encode()
def json_file(path):return json.loads(path.read_text())
def archive_members(path):
    archive=tarfile.open(path,'r:gz')
    for member in archive.getmembers():
        require(member.isfile() and not member.name.startswith('/') and '..' not in Path(member.name).parts,'unsafe archive member')
    return archive

def verify(root,repository=None):
    inventory=json_file(root/'packet-files.json')
    require(set(inventory)=={p.name for p in root.iterdir() if p.is_file() and p.name!='packet-files.json'},'packet file set changed')
    for name,expected in inventory.items():require(digest((root/name).read_bytes())==expected,'packet hash mismatch: '+name)
    summary=json_file(root/'summary.json')
    require(summary['disposition']=='rejected-at-initial-structure' and summary['newLayouts']==1,'wrong disposition')
    raw=archive_members(root/'raw-evidence.tar.gz')
    def data(name):return raw.extractfile(name).read()
    def read(name):return json.loads(data(name))
    identity=read('input-identity.json');inputs=identity['inputs']
    require(inputs['base']==summary['base'] and inputs['controlSource']==summary['controlSource'],'source pin mismatch')
    control_tar=root.parent/'2026-10-17-m10-5-fresh-pipeline-remediation/control-v1.2.0.tgz'
    if not control_tar.is_file():control_tar=Path(inputs['controlTarball'])
    require(digest(control_tar.read_bytes())==summary['controlTarballSha256']=='4bd7897aa5beb6383b158f4e214436ba5d0d659b6b0fc005142c945a10dda02e','control pin mismatch')
    control_archive=archive_members(control_tar)
    control={m.name.removeprefix('package/'):control_archive.extractfile(m).read() for m in control_archive.getmembers()}
    require(len(control)==185,'control package file count')
    control_hashes={name:digest(content) for name,content in control.items()}
    require(control_hashes==read('control-package-files.json'),'control inventory mismatch')
    candidate_archive=archive_members(root/'candidate-files.tar.gz')
    candidate={m.name:candidate_archive.extractfile(m).read() for m in candidate_archive.getmembers()}
    source_files=json_file(root/'candidate-source-files.json');artifacts=json_file(root/'candidate-artifacts.json')
    require(len(source_files)==13 and len(artifacts)==summary['candidateArtifacts']==172,'candidate file count')
    require(set(candidate)==set(source_files)|set(artifacts),'candidate archive inventory')
    for name,expected in {**source_files,**artifacts}.items():require(digest(candidate[name])==expected,'candidate byte mismatch '+name)
    require(identity['candidateSources']==source_files and identity['candidateArtifacts']==artifacts,'candidate input identity mismatch')
    original=read('original-inputs.json');require(sum(map(len,original.values()))==summary['originalInputsUnchanged']==369,'original input count')
    require(read('preflight.json')['status']=='pass' and read('control.json')['status']=='pass','prerequisites not passed')
    package_prefix=str(Path(inputs['controlRepoRoot'])/'packages/css')+'/'
    semantic=['case','status','observation','maps','authoredInputs','externalVersions','sidecar','diagnostics','events','error','metadata','privateInputs']
    pairs=markers=0
    for node_kind,version in [('floorNode','v22.0.0'),('currentNode','v24.15.0')]:
      for fmt in ['esm','cjs']:
        a=read(f'control-a-{node_kind}-{fmt}.json');b=read(f'control-b-{node_kind}-{fmt}.json')
        require(len(a)==len(b)==63,'control case count')
        require(a[0]['provenance']['pid']!=b[0]['provenance']['pid'],'control processes not independent')
        for left,right in zip(a,b):
          pairs+=1
          for row in [left,right]:
            require(row['version']==1 and row['provenance']['node']==version and row['provenance']['format']==fmt,'worker identity mismatch')
            parts=row['case'].split(':');require(len(parts)==6,'case identity')
            _,platform,dev,strict,step,_=parts;dev=dev=='true';strict=strict=='true'
            if row['status']=='error':
              require(step in ['syntax-error','authoring-error'],'unexpected error case')
              require('expected authored failure accepted' not in row['error']['message'],'authored failure oracle accepted success')
              continue
            require(step not in ['syntax-error','authoring-error'],'expected error case succeeded')
            proof=row['proof'];context=proof['context'];require(proof['kind']=='current','wrong marker domain')
            expected_context={'compilerKey':row['provenance']['compilerKey']+':style-explanations='+('1' if dev else '0'),'platform':platform,'dev':dev,'strictDiagnostics':strict,'useStyleSheet':platform!='web','identOption':'debug' if dev else 'short'}
            require(context==expected_context,'marker context mismatch')
            require(proof['resolutionIdentity']==row['metadata']['resolutionIdentity'],'resolution witness mismatch')
            resolution=digest(encoded({'entryHash':proof['entryHash'],'inputs':proof['inputs'],'resolutionIdentity':proof['resolutionIdentity']}))
            material='crumbs-native-cache-v1\0'+f"compiler={context['compilerKey']}\0platform={context['platform'] or ''}\0dev={int(context['dev'])}\0strict={int(context['strictDiagnostics'])}\0styleSheet={int(context['useStyleSheet'])}\0ident={context['identOption']}\0"
            for dep in sorted(proof['dependencies'],key=lambda d:d['importPath']):material+=dep['importPath']+'\0'+dep['sourceHash']+'\0'
            material+='resolution='+resolution+'\0';marker=re.match(r'/\* @crumbs-native-cache ([a-f0-9]{64}) \*/',row['code'])
            require(marker and marker[1]==digest(material.encode()),'independent marker mismatch');markers+=1
            owner=row['provenance']['keyOwner'];owner_name=owner['path'].removeprefix(package_prefix)
            require(owner_name in control and digest(control[owner_name])==owner['sha256'],'compiler owner provenance')
            require(hashlib.md5(b'@opsydyn/crumbs-css'+control[owner_name]).hexdigest()==row['provenance']['compilerKey'],'actual compiled key mismatch')
            require(len([v for name,v in control.items() if name.endswith(('.mjs','.cjs')) and hashlib.md5(b'@opsydyn/crumbs-css'+v).hexdigest()==row['provenance']['compilerKey']])==1,'ambiguous compiled key owner')
            for item in row['privateInputs']:
                name=item['path'].removeprefix(package_prefix)
                require(name in control and digest(control[name])==item['sha256'] and len(control[name])==item['bytes'],'control private input mismatch')
            if parts[0]=='owned':require(row['events']==[{'evaluations':1}],'authoring evaluation freshness')
          for field in semantic:require(left[field]==right[field],'control semantic mismatch '+field)
          if left['status']=='ok':
            align=lambda code:re.sub(r'(?<=@crumbs-native-cache )[a-f0-9]{64}','0'*64,code,count=1)
            require(align(left['code'])==align(right['code']),'control statements mismatch')
    require(pairs==summary['controlControl']['pairs']==252 and markers==488,'control proof counts')
    graphs=read('structure-graphs.json');build=read('build-initial.json');kernel=build['kernel']
    members={'src/diagnostics.ts','src/tokens/identity.ts','src/theme-token.ts','src/theme-contract.ts','src/tokens/domain-values.ts','src/internal/contract-kernel.ts'}
    candidate_prefix=str(Path(inputs['candidateRepoRoot'])/'packages/css')+'/'
    require({s['path'].removeprefix(candidate_prefix) for s in kernel['sources']}==members,'kernel source cut mismatch')
    for source in kernel['sources']:
        relative=source['path'].removeprefix(candidate_prefix)
        expected=digest(candidate['packages/css/'+relative]) if relative.startswith('src/internal/') else original['src'][relative.removeprefix('src/')]
        require(source['sha256']==expected,'kernel source hash mismatch')
    require(len(kernel['exports'])==len(set(kernel['exports']))==40 and len(build['kernelBundles'])==2,'kernel export/format count')
    for bundle in build['kernelBundles']:
        fmt=bundle['format'];chunk=bundle['chunks'][0]
        require(len(bundle['chunks'])==1 and not chunk['imports'] and not chunk['dynamicImports'],'kernel dependency/splitting mismatch')
        require({m.removeprefix(candidate_prefix) for m in chunk['modules']}==members and sorted(chunk['exports'])==kernel['exports'],'kernel membership/exports')
        artifact=kernel['artifacts'][fmt];name='packages/css/'+artifact['path'].removeprefix(candidate_prefix)
        require(name in candidate and digest(candidate[name])==artifact['sha256'],'kernel artifact bytes')
        require(Path(name).name=='theme-contract-kernel-'+artifact['sha256']+('.mjs' if fmt=='es' else '.cjs'),'kernel content addressing')
    require(len(build['toolBundles'])==21 and all(not b['clean'] for b in build['toolBundles']),'tool build cleanup/format count')
    require(sum(bool(b['dts'] and isinstance(b['dts'],dict) and b['dts'].get('emitDtsOnly')) for b in build['toolBundles'])==1,'declaration owner count')
    tools=[b for b in build['toolBundles'] if b['entry'].get('transformer') and any(c['fileName'].endswith(('.mjs','.cjs')) for c in b['chunks'])]
    require(len(tools)==2 and not [m for b in tools for c in b['chunks'] for m in c.get('modules',[]) if m in {s['path'] for s in kernel['sources']}],'duplicated tool kernel implementation')
    for label in ['control','candidate']:
        row=graphs[label];require(len(row['graphs'])==59 and len(row['sourceGuards'])==30,'graph/guard count')
        failures=[g for g in row['sourceGuards'] if g['status']=='fail'];require(len(failures)==(0 if label=='control' else 1),'wrong guard failure count')
        if failures:require(failures[0]==summary['guardFailure'] and failures[0]['subpath']=='./tokens' and failures[0]['format']=='cjs' and '/rolldown-runtime-' in failures[0]['error'],'wrong rejected runtime edge')
        for fmt in ['esm','cjs']:
            token=next(g for g in row['graphs'] if g['subpath']=='./tokens' and g['format']==fmt)
            require(not token['externalSpecifiers'],'unexpected token runtime external')
        for fmt,graph in row['style'].items():
            require(not graph['nonliteralLoads'],'computed style loader')
            contents=control if label=='control' else {name.removeprefix('packages/css/'):v for name,v in candidate.items()}
            prefix=str(Path(inputs[label+'RepoRoot'])/'packages/css')+'/'
            total=0
            for artifact in graph['artifacts']:
                name=artifact['file'].removeprefix(prefix);actual=contents[name]
                require(digest(actual)==artifact['sha256'] and len(actual)==artifact['bytes'],'style graph provenance mismatch');total+=len(actual)
            require(total==graph['bytes'] and len(graph['files'])==len(graph['artifacts']),'style graph arithmetic')
    require(graphs['summary']==summary['structure']['summary'] and summary['structure']['status']=='fail','structure disposition mismatch')
    for fmt in ['mjs','cjs']:
        a,b=graphs['control']['style'][fmt],graphs['candidate']['style'][fmt]
        require(summary['style'][fmt]=={'controlFiles':len(a['files']),'candidateFiles':len(b['files']),'controlBytes':a['bytes'],'candidateBytes':b['bytes'],'byteChange':b['bytes']-a['bytes']},'style summary mismatch')
    require(summary['style']['mjs']['candidateFiles']==3 and summary['style']['cjs']['candidateFiles']==4,'H1 result mismatch')
    require(summary['shippingProductChanged'] is False and summary['releaseAdmission'] is False and summary['cacheFixtureRuling']['executed'] is False,'invalid adoption/cache claim')
    require('full-transform-warm-timing' in summary['notRun'] and not any('benchmark-' in m.name for m in raw.getmembers()),'unrun timing claim')
    require('15 pass\n 0 fail' in data('harness-final.log').decode(),'harness result mismatch')
    if repository:
        for name,expected in read('shipping-product-before.json').items():require(digest((repository/name).read_bytes())==expected,'shipping product changed '+name)
        shipping=read('shipping-artifacts-before.json');actual={str(p.relative_to(repository)):digest(p.read_bytes()) for p in (repository/'packages/css/dist').iterdir() if p.is_file()}
        require(actual==shipping and len(actual)==181,'shipping artifacts changed')
        subprocess.run(['git','diff','--exit-code',summary['base'],'--','packages/css','scripts','apps','.github','package.json','bun.lock'],cwd=repository,check=True)
    return {'status':'verified-rejected-kernel-proof','controlPairs':pairs,'independentlyDerivedMarkers':markers,'exportRows':59,'ordinaryRuntimeRows':30,'candidateSourceGuardFailures':1,'styleFiles':{'esm':3,'cjs':4},'candidateArtifacts':172,'repositoryShippingArtifactsVerified':181 if repository else None,'fullTransformTiming':'not-run'}

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--repository',type=Path);args=parser.parse_args()
    print(json.dumps(verify(Path(__file__).resolve().parent,args.repository.resolve() if args.repository else None)))
