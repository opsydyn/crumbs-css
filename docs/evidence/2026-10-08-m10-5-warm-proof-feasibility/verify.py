#!/usr/bin/env python3
"""Offline diagnostic integrity/derivation checks; never product qualification."""
import hashlib, json, math, statistics, sys, tarfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent

def read(name):
    return json.loads((ROOT / name).read_text())

def sha(data):
    return hashlib.sha256(data).hexdigest()

def require(value, reason):
    if not value:
        raise ValueError(reason)

def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and value > 0

def verify():
    inventory = read('file-inventory.json')
    actual = {str(p.relative_to(ROOT)) for p in ROOT.rglob('*') if p.is_file() and p.name != 'file-inventory.json'}
    require(set(inventory) == actual, 'incomplete or extra file inventory')
    for name, expected in inventory.items():
        require(sha((ROOT / name).read_bytes()) == expected, 'file hash mismatch: ' + name)
    context = read('context.json')
    require(context['admission'].startswith('No production admission'), 'invalid admission claim')
    require(len(context['sourceRevision']) == 40 and all(c in '0123456789abcdef' for c in context['sourceRevision']), 'invalid source revision')
    source = read('source-after.json')
    require(source['sha256'] == context['sourceDigest'], 'source digest mismatch')
    require(sha(json.dumps(source['files'], separators=(',', ':'), ensure_ascii=False).encode()) == source['sha256'], 'unrederived source digest')
    require(sha((ROOT / 'budgets.json').read_bytes()) == context['registrySha256'], 'registry hash mismatch')
    registry = read('budgets.json')
    warm = next(m for m in registry['metrics'] if m['id'] == 'warm-transform-ms')
    summary = read('summary.json')
    require(summary['qualification'] is False, 'diagnostic cannot qualify release')
    require(summary['referenceAbsoluteMaxMs'] == warm['threshold']['absoluteMax'] == 6.514, 'changed absolute reference')
    require(summary['referenceMaxRegressionPercent'] == warm['threshold']['maxRegressionPercent'] == 15, 'changed regression reference')
    require(summary['referenceBaselineMs'] == warm['baseline']['value'], 'changed reference baseline')
    before, after = read('artifact-before.json'), read('artifact-after.json')
    require(before == after and len(before) == context['artifactCount'] == 149, 'artifact inventory drift')
    expected_artifacts = {r['path']: r['sha256'] for r in before}
    with tarfile.open(ROOT / 'artifacts.tar.gz', 'r:gz') as archive:
        members = archive.getmembers()
        require(len(members) == len(expected_artifacts) and all(m.isfile() for m in members), 'bad artifact archive')
        require({m.name for m in members} == set(expected_artifacts), 'archive file mismatch')
        for member in members:
            stream = archive.extractfile(member)
            require(stream is not None and sha(stream.read()) == expected_artifacts[member.name], 'archive content mismatch')
    fixtures = read('fixtures.json')
    require(len(fixtures) == 4, 'missing fixtures')
    for name, expected in fixtures.items():
        require(sha((ROOT / 'fixtures' / name).read_bytes()) == expected, 'fixture drift')
    syntax = read('input-grammar.json')
    require(len(syntax['rows']) == 2, 'missing input graphs')
    for row in syntax['rows']:
        require(len(row['inputs']) == 9, 'input count drift')
        require(row['totalBytes'] == sum(i['bytes'] for i in row['inputs']), 'input byte summary drift')
        for item in row['inputs']:
            require(not item['issues'], 'unexpected syntax rejection')
            name = item['name']
            if '/dist/' in item['file']:
                expected = expected_artifacts[Path(item['file']).name]
            else:
                suffix = name if row['label'] == 'README' else 'fixtures/consumer/' + name
                expected = fixtures[suffix]
            require(item['sha256'] == expected, 'bundled input receipt drift')
    modes = ['control', 'replay', 'floor', 'data-only', 'data-grouped']
    require([row['mode'] for row in summary['rows']] == modes, 'missing/extra cohorts')
    outputs = {}
    count = 0
    for mode, summary_row in zip(modes, summary['rows']):
        maxima = []
        for repetition in range(1, 6):
            report = read(f'{mode}-{repetition}.json')
            require([r['label'] for r in report['rows']] == ['README', 'consumer'], 'missing/reordered fixture')
            p50s = []
            for row in report['rows']:
                samples = row['samples']
                require(len(samples) == 6 and all(finite(s['ms']) for s in samples), 'invalid samples')
                times = sorted(s['ms'] for s in samples)
                require(row['medianMs'] == statistics.median(times), 'raw arithmetic mean median drift')
                p50s.append(times[2])
                for sample in samples:
                    digest = sample['sha256']
                    require(isinstance(digest, str) and len(digest) == 64 and all(c in '0123456789abcdef' for c in digest), 'invalid output hash')
                    outputs.setdefault(row['label'], digest)
                    require(outputs[row['label']] == digest, 'output mismatch against control')
                    count += 1
            maxima.append(max(p50s))
        require(summary_row['repetitions'] == 5, 'repetition count drift')
        require(summary_row['processWorstFixtureP50Ms'] == maxima, 'unrederived process maxima')
        require(summary_row['medianMs'] == statistics.median(maxima), 'unrederived cohort median')
    require(count == 300, 'incomplete output comparison')
    require(summary['rows'][2]['medianMs'] > summary['referenceAbsoluteMaxMs'], 'partial compiler scan disposition drift')
    print('Verified 25 diagnostic reports / 300 output hashes / 149 artifacts; no product qualification')

if __name__ == '__main__':
    try:
        verify()
    except (ValueError, KeyError, TypeError, OSError, StopIteration) as error:
        print('Rejected:', error, file=sys.stderr)
        sys.exit(1)
