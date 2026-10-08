from pathlib import Path
import copy, hashlib, json, sys
sys.dont_write_bytecode = True
from derive import derive, require

root = Path(__file__).resolve().parent
sha = lambda b: hashlib.sha256(b).hexdigest()
inventory = json.loads((root / 'file-inventory.json').read_text())
actual = {str(p.relative_to(root)): sha(p.read_bytes()) for p in root.rglob('*') if p.is_file() and p.name != 'file-inventory.json'}
require(actual == inventory, 'exact packet file integrity')
data = {f'{mode}-{i}.json': json.loads((root / f'{mode}-{i}.json').read_text()) for mode in ['control', 'profile'] for i in range(1, 6)}
logs = {f'profile-{i}.stderr.txt': (root / f'profile-{i}.stderr.txt').read_text() for i in range(1, 6)}
summary = json.loads((root / 'summary.json').read_text())
context = json.loads((root / 'context.json').read_text())
before = json.loads((root / 'preservation-before.json').read_text())
after = json.loads((root / 'preservation-after.json').read_text())

def validate(reports, timing_logs, stored_summary, before_receipt, after_receipt, ctx):
    require(derive(reports, timing_logs) == stored_summary, 'independent summary rederivation')
    require(before_receipt == after_receipt, 'live preservation receipts')
    require(ctx['productionCandidateImplemented'] is False and ctx['completeHostQualification'] is False, 'no production or host qualification')
    require(ctx['sourceDigest'] == before_receipt['sourceDigest'] == '0e12a12c4b770dae39a542c4d2c59f467a62402148fbd8b5cc26eb3e3d08a9f0', 'shipping source identity')
    require(before_receipt['sourceFileCount'] == 696 and before_receipt['artifactCount'] == 149 and len(before_receipt['sharedCompilerFiles']) == 18, 'preservation scope')
    require(ctx['registrySha256'] == before_receipt['registrySha256'] == '0f5752c430db6ced1f8d8a5c94c7de865a3ba9daadaa9a60584148eeb0a4687b', 'numerical registry unchanged')

validate(data, logs, summary, before, after, context)
prep = json.loads((root / 'preparation.json').read_text())
prior = root.parent / '2026-10-08-m10-5-warm-proof-feasibility/artifact-before.json'
require(sha(prior.read_bytes()) == before['artifactReceiptSha256'], 'prior artifact receipt identity')
require(prep['copiedArtifacts'] == json.loads(prior.read_text()), 'all copied artifacts match frozen source')
require(sha((root / 'timing-service.sh').read_bytes()) == context['wrapperSha256'], 'native timer wrapper identity')
for i in range(1, 6):
    require((root / f'control-{i}.stderr.txt').read_bytes() == b'', 'control has no diagnostic stderr')
for row in data['control-1.json']['rows']:
    cwd = Path(row['cwd'])
    package = Path(prep['packageRoot'])
    for info in row['samples'][0]['compileCalls'][0]['inputs']:
        relative = (cwd / info['file']).resolve().relative_to(package)
        require(sha((root / 'graph' / relative).read_bytes()) == info['sha256'], 'retained bundled graph identity')
for filename, runtime in [('minimal-smoke.json', {'node': 'v26.3.0', 'bun': '1.4.2'}), ('minimal-smoke-node22.json', {'node': 'v22.0.0', 'bun': None}), ('minimal-smoke-node24.json', {'node': 'v24.15.0', 'bun': None})]:
    smoke = json.loads((root / filename).read_text())
    require(smoke['runtime'] == runtime and len(smoke['rows']) == 2, 'minimal smoke runtime/scope')
    for row, original in zip(smoke['rows'], data['control-1.json']['rows']):
        call = original['samples'][0]['compileCalls'][0]
        require(row['label'] == original['label'] and row['sourceSha256'] == call['sourceSha256'], 'stock compile source parity')
        require(row['watchFiles'] == [str(Path(file).relative_to(prep['packageRoot'])) for file in call['watchFiles']], 'stock compile full inputs')

count = 0
if '--self-test' in sys.argv:
    def bad_output(d, l, s, b, a, c): d['profile-1.json']['rows'][0]['samples'][0]['sha256'] = '0' * 64
    def bad_input(d, l, s, b, a, c): d['profile-2.json']['rows'][1]['samples'][0]['compileCalls'][0]['inputs'].pop()
    def missing_native(d, l, s, b, a, c): l['profile-3.stderr.txt'] = l['profile-3.stderr.txt'].split('Timing information', 1)[1]
    def bad_summary(d, l, s, b, a, c): s['modes']['control']['diagnosticSelectorMs']['median'] = 0
    def bad_preservation(d, l, s, b, a, c): a['primaryDirtyFiles']['bun.lock'] = '0' * 64
    def false_qualification(d, l, s, b, a, c): c['completeHostQualification'] = True
    for mutation in [bad_output, bad_input, missing_native, bad_summary, bad_preservation, false_qualification]:
        values = copy.deepcopy((data, logs, summary, before, after, context))
        mutation(*values)
        try:
            validate(*values)
        except (ValueError, KeyError, TypeError):
            count += 1
        else:
            raise ValueError('Negative control accepted: ' + mutation.__name__)
    require(count == 6, 'semantic rejection count')
print(json.dumps({'filesVerified': len(inventory), 'timedTransforms': 120, 'pairedTimedOutputs': 60, 'nativeTimingBlocks': 90, 'stockSmokeRuntimes': 3, 'semanticRejections': count, 'releaseQualified': False}))
