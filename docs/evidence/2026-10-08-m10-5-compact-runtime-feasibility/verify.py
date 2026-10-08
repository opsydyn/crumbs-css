#!/usr/bin/env python3
"""Offline integrity and arithmetic checks for a rejected diagnostic spike."""
import hashlib
import gzip
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

def verify(root):
    packet = json.loads((root / 'packet.json').read_text())
    need(packet['format'] == 'crumbs.m10.5.compact-runtime-spike' and packet['version'] == 1 and packet['qualification'] == 'diagnostic-only', 'Packet identity')
    expected = {'control-package.tar.gz', 'candidate-package.tar.gz', 'graphs.json', 'parity.json.gz', 'parity-node.json.gz', 'negative-control.json', 'typecheck.log'} | {'code/' + name for name in ['setup.py', 'build.mjs', 'rewrite.mjs', 'compact-program.ts', 'helpers.mjs', 'parity.ts', 'negative-control.ts', 'measure.ts']}
    need(set(packet['files']) == expected, 'Evidence inventory')
    for name, digest in packet['files'].items():
        need(sha((root / name).read_bytes()) == digest, 'Evidence hash: ' + name)
    prior_control = root.parent / '2026-10-08-m10-5-consolidated-host-remediation/control-package.tar.gz'
    prior_summary = root.parent / '2026-10-08-m10-5-runtime-architecture-attribution/summary.json'
    need(sha(prior_control.read_bytes()) == packet['priorControlSha256'] and sha(prior_summary.read_bytes()) == packet['priorAttributionSummarySha256'], 'Prior source/limit binding')
    old = archive(prior_control)
    packages = {name: archive(root / (name + '-package.tar.gz')) for name in ['control', 'candidate']}
    previous_artifacts_path = root.parent / '2026-10-08-m10-5-runtime-architecture-attribution/mapped-artifacts.tar.gz'
    need(sha(previous_artifacts_path.read_bytes()) == packet['priorAttributionArtifactsSha256'], 'Prior artifact binding')
    previous_artifacts = archive(previous_artifacts_path)
    control_artifacts = {name for name in packages['control'] if name.startswith('dist/')}
    need(len(control_artifacts) == 20, 'Complete control runtime groups')
    for name in control_artifacts:
        need(packages['control'][name] == previous_artifacts['minified-control/reference/' + PurePosixPath(name).name], 'Byte-exact previous control artifact')
    authored = {name for name in old if name.startswith('src/')} | {'package.json', 'build-policy.ts', 'tsdown.config.ts'}
    for name in authored:
        need(packages['control'][name] == old[name], 'Frozen control source: ' + name)
    changed = {name for name in authored if packages['control'][name] != packages['candidate'][name]}
    need(changed == {'src/components/contracts.ts', 'src/components/extension-contract.ts', 'src/theme-runtime.ts', 'src/runtime/component-recipe-resolution-plan.ts', 'src/expressions/index.ts'}, 'Candidate scope')
    added = set(packages['candidate']) - set(packages['control'])
    need({name for name in added if not name.startswith('dist/')} == {'src/runtime/compact-program.ts'}, 'Candidate additions')
    need(packages['candidate']['src/runtime/compact-program.ts'] == (root / 'code/compact-program.ts').read_bytes(), 'Interpreter source binding')
    for package in packages.values():
        need({name for name in package if not name.startswith('dist/')} == authored | ({'src/runtime/compact-program.ts'} if package is packages['candidate'] else set()), 'Complete authored inventory')
        need(len([name for name in package if name.startswith('dist/')]) == (22 if package is packages['candidate'] else 20), 'Clean complete runtime groups')
        need(all('dist/' + entry + '.' + extension in package for entry in ['theme', 'theme-core', 'theme-conditions', 'theme-expressions', 'theme-recipes', 'theme-sprinkles'] for extension in ['mjs', 'cjs']), 'Original runtime group entries')
    report = json.loads((root / 'graphs.json').read_text())
    previous = json.loads(prior_summary.read_text())
    need(report['qualification'] == 'diagnostic-only' and report['registryText'] == previous['registryText'] and sha(report['registryText'].encode()) == report['registrySha256'] == previous['registrySha256'], 'Fixed limit registry')
    entries = {'theme-core.mjs', 'theme-core.cjs', 'theme.mjs', 'theme.cjs'}
    need(len(report['graphs']) == 8 and {(g['cohort'], g['entry']) for g in report['graphs']} == {(c, e) for c in packages for e in entries}, 'Graph coverage')
    for graph in report['graphs']:
        need(graph['nonliteralLoads'] == 0 and graph['externals'] == ['react'], 'Dependency policy')
        need(len(graph['files']) == len(set(graph['files'])) and set(graph['files']) == {a['file'] for a in graph['artifacts']} and len(graph['files']) == len(graph['artifacts']), 'Graph artifact inventory')
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
        need(row['controlBytes'] == a['bytes'] and row['candidateBytes'] == b['bytes'] and row['ceiling'] == b['ceiling'] and row['gapBytes'] == b['bytes'] - b['ceiling'] and row['gate'] == 'fail', 'Comparison arithmetic')
    for filename, host in [('parity.json.gz', 'bun'), ('parity-node.json.gz', 'node')]:
        parity = json.loads(gzip.decompress((root / filename).read_bytes()))
        need(parity['qualification'] == 'diagnostic-only' and parity['host'] == host and parity['cases'] == len(parity['records']) == 1454, 'Focused parity coverage')
        names = [r['name'] for r in parity['records']]
        need(len(set(names)) == len(names), 'Parity duplicates')
        generated = [r for r in parity['records'] if ':generated-expression:' in r['name']]
        lazy = [r for r in parity['records'] if ':lazy-order:' in r['name']]
        need(len(generated) == 1200 and len(lazy) == 16 and all(r['receipt']['ok'] for r in generated + lazy), 'Successful evaluation coverage')
    negative = json.loads((root / 'negative-control.json').read_text())
    need(negative['qualification'] == 'diagnostic-only' and negative['control'] == negative['valid'] and negative['control'] != negative['wrong'], 'Proxy-order negative control')
    need(packet['typecheck'] == {'scope': 'private compact-program.ts only', 'exitCode': 0} and not (root / 'typecheck.log').read_bytes(), 'Private engine typecheck receipt')
    return {'verified': 'rejected diagnostic spike integrity and arithmetic', 'failedGraphGates': 4, 'focusedParityReceiptsPerHost': 1454, 'hosts': ['bun', 'node'], 'qualification': 'not-run'}

if __name__ == '__main__':
    try:
        print(json.dumps(verify(Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent)))
    except (OSError, ValueError, KeyError, TypeError, IndexError, tarfile.TarError) as error:
        print('Spike evidence rejected: ' + str(error), file=sys.stderr)
        sys.exit(1)
