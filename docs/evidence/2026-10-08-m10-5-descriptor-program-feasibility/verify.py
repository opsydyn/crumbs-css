#!/usr/bin/env python3
"""Verify rejected diagnostic evidence; never admit a release or parity claim."""
import gzip
import hashlib
import json
import sys
import tarfile
from pathlib import Path, PurePosixPath

def need(condition, message):
    if not condition:
        raise ValueError(message)

def sha(data):
    return hashlib.sha256(data).hexdigest()

def archive(path):
    result = {}
    with tarfile.open(path, 'r:gz') as entries:
        for item in entries:
            name = PurePosixPath(item.name)
            need(item.isfile() and not name.is_absolute() and '..' not in name.parts and item.name not in result, 'Unsafe archive member')
            result[item.name] = entries.extractfile(item).read()
    return result

def compressed_json(path):
    return json.loads(gzip.decompress(path.read_bytes()))

def verify(root):
    packet = json.loads((root / 'packet.json').read_text())
    need(packet['format'] == 'crumbs.m10.5.descriptor-program-spike' and packet['version'] == 1 and packet['qualification'] == 'diagnostic-only', 'Packet identity')
    expected = {'candidate-package.tar.gz', 'control-package.tar.gz', 'graphs.json', 'lowering.json.gz', 'inventory.json.gz', 'coverage.json.gz', 'smoke.json', 'known-parity-gap.json', 'typecheck.txt'} | {'code/' + name for name in ['build.mjs', 'compiler.mjs', 'coverage.mjs', 'descriptor-program.ts', 'inventory.mjs', 'known-parity-gap.mjs', 'measure.ts', 'setup.py', 'smoke.mjs']}
    need(set(packet['files']) == expected, 'Evidence inventory')
    for name, digest in packet['files'].items():
        need(sha((root / name).read_bytes()) == digest, 'Evidence hash: ' + name)
    prior_control = root.parent / '2026-10-08-m10-5-consolidated-host-remediation/control-package.tar.gz'
    previous_root = root.parent / '2026-10-08-m10-5-runtime-architecture-attribution'
    need(sha(prior_control.read_bytes()) == packet['priorControlSha256'], 'Frozen source binding')
    need(sha((previous_root / 'summary.json').read_bytes()) == packet['priorAttributionSummarySha256'], 'Prior registry binding')
    need(sha((previous_root / 'mapped-artifacts.tar.gz').read_bytes()) == packet['priorAttributionArtifactsSha256'], 'Prior artifact binding')
    old = archive(prior_control)
    previous_artifacts = archive(previous_root / 'mapped-artifacts.tar.gz')
    packages = {name: archive(root / (name + '-package.tar.gz')) for name in ['control', 'candidate']}
    authored = {name for name in old if name.startswith('src/')} | {'package.json', 'build-policy.ts', 'tsdown.config.ts'}
    changed_files = {'src/components/contracts.ts', 'src/components/extension-contract.ts', 'src/runtime/component-recipe-resolution-plan.ts', 'src/theme-runtime.ts'}
    for name in authored:
        need(packages['control'][name] == old[name], 'Frozen source/configuration: ' + name)
    need({name for name in authored if packages['candidate'][name] != old[name]} == changed_files, 'Prototype scope')
    for cohort, package in packages.items():
        need({name for name in package if not name.startswith('dist/')} == authored | ({'src/runtime/descriptor-program.ts'} if cohort == 'candidate' else set()), 'Authored inventory')
        need(len([name for name in package if name.startswith('dist/')]) == 20, 'Clean runtime artifact inventory')
        need(all('dist/' + entry + '.' + extension in package for entry in ['theme', 'theme-core', 'theme-conditions', 'theme-expressions', 'theme-recipes', 'theme-sprinkles'] for extension in ['mjs', 'cjs']), 'Original runtime entries')
    for name, code in packages['control'].items():
        if name.startswith('dist/'):
            need(code == previous_artifacts['minified-control/reference/' + PurePosixPath(name).name], 'Byte-exact previous control')
    need(packages['candidate']['src/runtime/descriptor-program.ts'] == (root / 'code/descriptor-program.ts').read_bytes(), 'Evaluator source binding')
    lowering = compressed_json(root / 'lowering.json.gz')
    inventory = compressed_json(root / 'inventory.json.gz')
    coverage = compressed_json(root / 'coverage.json.gz')
    need(lowering['functions'] == len(lowering['inventory']) == coverage['functions'] == len(coverage['rows']) == len(inventory['functions']) == 98, 'Complete selected-body coverage')
    identities = {(row['file'], row['name']) for row in lowering['inventory']}
    need(len(identities) == 98 and identities == {(row['file'], row['name']) for row in inventory['functions']} == {(row['file'], row['name']) for row in coverage['rows']}, 'Function identity coverage')
    need(all(row['signature'] == 'unchanged' and row['body'] == 'entirely replaced' for row in coverage['rows']), 'Coverage receipt boundary')
    decoder = json.JSONDecoder()
    for row in lowering['inventory']:
        source = packages['candidate']['src/' + row['file']].decode()
        prefix = 'const ' + row['program'] + '=/* @__PURE__ */ freezeProgram('
        need(source.count(prefix) == 1, 'Program declaration identity')
        data, end = decoder.raw_decode(source.split(prefix, 1)[1])
        need(len(data) == 2 and len(data[0]) == row['stringPool'] and data[1] == row['instructions'], 'Encoded program/source binding')
        need('return runProgram(' + row['program'] + ',' in source, 'Program wrapper binding')
    report = json.loads((root / 'graphs.json').read_text())
    previous = json.loads((previous_root / 'summary.json').read_text())
    need(report['qualification'] == 'diagnostic-only' and report['registryText'] == previous['registryText'] and sha(report['registryText'].encode()) == report['registrySha256'] == previous['registrySha256'], 'Unchanged registry')
    entries = {'theme-core.mjs', 'theme-core.cjs', 'theme.mjs', 'theme.cjs'}
    need(len(report['graphs']) == 8 and {(g['cohort'], g['entry']) for g in report['graphs']} == {(c, e) for c in packages for e in entries}, 'Graph coverage')
    for graph in report['graphs']:
        need(graph['nonliteralLoads'] == 0 and graph['externals'] == ['react'], 'Dependency policy')
        need(len(graph['files']) == len(set(graph['files'])) == len(graph['artifacts']) and set(graph['files']) == {a['file'] for a in graph['artifacts']}, 'Graph artifact inventory')
        total = 0
        for item in graph['artifacts']:
            need(PurePosixPath(item['file']).name == item['file'], 'Artifact path')
            code = packages[graph['cohort']]['dist/' + item['file']]
            need(len(code) == item['bytes'] and sha(code) == item['sha256'], 'Artifact bytes/hash')
            total += len(code)
        limit = next(row for row in previous['graphs'] if row['entry'] == graph['entry'])
        need(total == graph['bytes'] and graph['ceiling'] == limit['ceiling'] and graph['gate'] == 'fail' and total > graph['ceiling'], 'Rejected graph arithmetic')
        if graph['cohort'] == 'control':
            need(total == limit['minifiedControlBytes'], 'Minified control total')
    need(len(report['comparison']) == 4 and {r['entry'] for r in report['comparison']} == entries, 'Comparison coverage')
    for row in report['comparison']:
        a, b = [next(g for g in report['graphs'] if g['entry'] == row['entry'] and g['cohort'] == c) for c in ['control', 'candidate']]
        need(row['controlBytes'] == a['bytes'] and row['candidateBytes'] == b['bytes'] and row['ceiling'] == b['ceiling'] and row['gapBytes'] == b['bytes'] - b['ceiling'] and row['growthBytes'] == b['bytes'] - a['bytes'] and row['gate'] == 'fail', 'Comparison arithmetic')
    smoke = json.loads((root / 'smoke.json').read_text())
    need(smoke['qualification'] == 'diagnostic-only' and len(smoke['rows']) == 8 and {(r['cohort'], r['entry']) for r in smoke['rows']} == {(c, e) for c in packages for e in entries}, 'Basic smoke coverage')
    for entry in entries:
        need(smoke['exports']['control:' + entry] == smoke['exports']['candidate:' + entry], 'Observed export names')
    gap = json.loads((root / 'known-parity-gap.json').read_text())
    need(gap['qualification'] == 'diagnostic-only' and len(gap['rows']) == 2 and {r['format'] for r in gap['rows']} == {'mjs', 'cjs'}, 'Parity-gap coverage')
    for row in gap['rows']:
        need(row['parity'] == 'failed' and row['control'] == {'name': 'resolve', 'length': 1, 'hasOwnPrototype': False, 'constructible': False} and row['candidate'] == {'name': '', 'length': 0, 'hasOwnPrototype': True, 'constructible': True}, 'Observed method parity failure')
    need(packet['typecheck']['exitCode'] == 0 and not (root / 'typecheck.txt').read_bytes(), 'Limited private evaluator typecheck receipt')
    return {'verified': 'rejected descriptor-program integrity and arithmetic', 'loweredBodies': 98, 'failedGraphGates': 4, 'publicMethodParity': 'failed', 'releaseQualification': 'not-run'}

if __name__ == '__main__':
    try:
        print(json.dumps(verify(Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent)))
    except (OSError, ValueError, KeyError, TypeError, IndexError, tarfile.TarError) as error:
        print('Descriptor-program evidence rejected: ' + str(error), file=sys.stderr)
        sys.exit(1)
