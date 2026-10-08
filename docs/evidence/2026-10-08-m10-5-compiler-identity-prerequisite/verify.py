from pathlib import Path
import copy, hashlib, json, sys

root = Path(__file__).resolve().parent
sha = lambda b: hashlib.sha256(b).hexdigest()

def require(condition, message):
    if not condition:
        raise ValueError(message)

def verify(data):
    context = data['context.json']
    require(context['format'] == 'crumbs.m10.5.compiler-identity-prerequisite' and context['version'] == 1, 'context identity')
    require(context['integrationVersion'] == '8.0.10' and context['esbuildVersion'] == '0.27.7', 'compiler versions')
    require(all(value is False for value in context['qualification'].values()) and len(context['qualification']) == 4, 'no qualification claims')
    before, after = data['preservation-before.json'], data['preservation-after.json']
    require(before == after, 'preservation changed')
    require(before['sourceDigest'] == context['sourceDigest'] == '0e12a12c4b770dae39a542c4d2c59f467a62402148fbd8b5cc26eb3e3d08a9f0', 'shipping source identity')
    require(before['sourceFileCount'] == 696 and before['artifactCount'] == 149 and len(before['sharedCompilerFiles']) == 18, 'preservation counts')
    require(before['registrySha256'] == context['registrySha256'] == '0f5752c430db6ced1f8d8a5c94c7de865a3ba9daadaa9a60584148eeb0a4687b', 'unchanged numerical registry')
    require(len(before['primaryDirtyFiles']) == 3 and len(before['managedDependencyLinks']) == 2, 'checkout preservation scope')
    expected = {'node22': {'node': 'v22.0.0', 'bun': None}, 'node24': {'node': 'v24.15.0', 'bun': None}, 'bun': {'node': 'v26.3.0', 'bun': '1.4.2'}}
    guard_keys = {'moduleInstancesAndShallowExportDescriptorsStable', 'compileFunctionStable', 'buildFunctionStable', 'stopFunctionStable', 'environmentStable', 'entryStable', 'binaryContentStable'}
    sources = set()
    for tag, runtime in expected.items():
        report = data[f'service-{tag}.json']
        require(report['format'] == 'crumbs.m10.5.compiler-service-identity-counterexample' and report['version'] == 2, 'report identity')
        require(report['runtime'] == runtime, 'runtime identity')
        require(set(report['guard']) == guard_keys and all(value is True for value in report['guard'].values()), 'all recorded guards must remain unchanged')
        require(report['freshOutcome'] == {'kind': 'error', 'name': 'Error', 'message': 'The service was stopped'}, 'fresh outcome must be independently failed')
        original, restored = report['before'], report['restored']
        require(original['sourceSha'] == restored['sourceSha'] and original['watchFiles'] == restored['watchFiles'], 'restored source/input parity')
        require(restored['binarySha'] == original['originalBinarySha'] == context['ownedBinaryRestoredSha256'], 'owned executable restoration')
        require(original['binarySha'] != original['originalBinarySha'], 'confirmation captured changed disk image')
        require(original['binarySha'] == sha(b'#!/bin/sh\nexit 71\n'), 'replacement executable identity')
        require(original['inputSha'] == sha((root / 'fixture.css.ts').read_bytes()), 'entry fixture identity')
        request = report['request']
        require(request == {'filePath': request['cwd'] + '/probe.css.ts', 'cwd': '/private/tmp/crumbs-m105-compiler-identity/owned-install', 'identOption': 'debug'}, 'owned compile request')
        require(original['watchFiles'] == [request['filePath']], 'full watch inputs')
        require(report['unsafeReplayOutcome'] == {'kind': 'retained-source', 'sourceSha': original['sourceSha'], 'executed': False}, 'hypothetical replay boundary')
        compiler = report['compiler']
        require(compiler['esbuildVersion'] == '0.27.7' and compiler['binaryBytes'] == 10385234, 'native compiler identity')
        for field, suffix in [('integrationEntrySha', '@vanilla-extract/integration/dist/vanilla-extract-integration.cjs.js'), ('esbuildEntrySha', 'esbuild/lib/main.js')]:
            matches = [value for path, value in before['sharedCompilerFiles'].items() if path.endswith('/' + suffix)]
            require(matches == [compiler[field]], 'owned JS must match shared original')
        binaries = [value for path, value in before['sharedCompilerFiles'].items() if path.endswith('/@esbuild/darwin-arm64/bin/esbuild')]
        require(binaries == [restored['binarySha']], 'owned binary must match shared original')
        sources.add(original['sourceSha'])
    require(len(sources) == 1, 'cross-runtime fixture output parity')
    require(data['handles-node24.json']['node'] == 'v24.15.0' and data['handles-node24.json']['bun'] is None, 'Node handle runtime')
    require(any(h['type'] == 'ChildProcess' for h in data['handles-node24.json']['handles']), 'Node observed a child during request')
    require(data['handles-bun.json'] == {'node': 'v26.3.0', 'bun': '1.4.2', 'handles': []}, 'Bun observation only')
    require(len(data['source-excerpts.json']) == 2, 'source inspection scope')
    for entry in data['source-excerpts.json']:
        require(entry['sha256'] in before['sharedCompilerFiles'].values(), 'source excerpt origin')
        for region in entry['ranges']:
            require(len(region['lines']) == region['lastLine'] - region['firstLine'] + 1, 'source excerpt line count')

inventory = json.loads((root / 'file-inventory.json').read_text())
actual = {str(p.relative_to(root)): sha(p.read_bytes()) for p in root.rglob('*') if p.is_file() and p.name != 'file-inventory.json'}
require(actual == inventory, 'packet file integrity')
data = {name: json.loads((root / name).read_text()) for name in inventory if name.endswith('.json')}
verify(data)
count = 0
if '--self-test' in sys.argv:
    def bad_guard(d): d['service-bun.json']['guard']['binaryContentStable'] = False
    def bad_fresh(d): d['service-node22.json']['freshOutcome']['kind'] = 'retained-source'
    def bad_restore(d): d['service-node24.json']['restored']['sourceSha'] = '0' * 64
    def fake_execution(d): d['service-bun.json']['unsafeReplayOutcome']['executed'] = True
    def bad_runtime(d): d['service-node22.json']['runtime']['node'] = 'v24.15.0'
    def bad_preservation(d): d['preservation-after.json']['primaryDirtyFiles']['bun.lock'] = '0' * 64
    for mutation in [bad_guard, bad_fresh, bad_restore, fake_execution, bad_runtime, bad_preservation]:
        changed = copy.deepcopy(data)
        mutation(changed)
        try:
            verify(changed)
        except (ValueError, KeyError, TypeError):
            count += 1
        else:
            raise ValueError('Accepted negative control: ' + mutation.__name__)
    require(count == 6, 'negative control count')
print(json.dumps({'filesVerified': len(inventory), 'runtimeCounterexamples': 3, 'semanticRejections': count, 'productionMemoExecuted': False, 'releaseQualified': False}))
