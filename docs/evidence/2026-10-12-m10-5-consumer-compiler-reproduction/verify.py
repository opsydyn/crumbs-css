from pathlib import Path
import json, hashlib, math
root = Path(__file__).resolve().parent
def read(name): return json.loads((root / name).read_text())
def median(xs):
    assert xs and all(math.isfinite(x) and x > 0 for x in xs)
    return sorted(xs)[math.ceil(len(xs) / 2) - 1]
def equal(a, b): assert math.isclose(a, b, rel_tol=1e-10, abs_tol=1e-9), (a, b)
source = [read(f'benchmark-{n}.json') for n in range(1, 6)]
summary = read('benchmark-summary.json')
for n, report in enumerate(source, 1):
    assert read(f'exit-{n}.json')['exitCode'] == 0
    assert report['sourceRevision'] == read('identity.json')['source']
    assert report['environment'] == source[0]['environment']
    assert report['fixtures'] == source[0]['fixtures']
    assert report['protocol']['warmTransformCwd'] == 'package-root'
    for metric in report['metrics']:
        equal(median([x / metric['iterationsPerSample'] for x in metric['sampleDurationsMs']]), metric['batchMeanP50Ms'])
for item in summary['results']:
    raw = [next(m for m in r['metrics'] if m['name'] == item['name'])['batchMeanP50Ms'] for r in source]
    assert raw == item['runBatchMeanP50Ms']
comparison = read('comparison.json')
assert len(comparison['metrics']) == 2
for row, label in zip(comparison['metrics'], ['first transform ', 'warm transform ']):
    raw = [max(m['batchMeanP50Ms'] for m in r['metrics'] if m['name'].startswith(label)) for r in source]
    equal(median(raw), row['current']['median'])
    equal((median(raw) / row['baseline'] - 1) * 100, row['deltaPercent'])
    assert row['result'] == 'fail' and row['environment'] == row['measurementIdentity'] == 'exact'
published = read('published-summary.json')
hashes = {}
for runtime in ['node', 'bun']:
    reports = [read(f'published-{runtime}-{n}.json') for n in range(1, 6)]
    for i, item in enumerate(published['runtimes'][runtime]['fixtures']):
        cold, warm = [], []
        for report in reports:
            row = report['results'][i]
            assert len(row['cold']) == len(row['warm']) == 6
            cold.append(median([x['durationMs'] for x in row['cold']]))
            warm.append(median([x['durationMs'] for x in row['warm']]))
            equal(cold[-1], row['coldMedianMs']); equal(warm[-1], row['warmMedianMs'])
            for sample in row['cold'] + row['warm']:
                assert sample['outputSha256'] == item['outputSha256']
                hashes.setdefault(item['fixture'], sample['outputSha256'])
                assert hashes[item['fixture']] == sample['outputSha256']
        assert cold == item['coldRunMediansMs'] and warm == item['warmRunMediansMs']
        equal(median(cold), item['coldMedianMs']); equal(median(warm), item['warmMedianMs'])
for i, item in enumerate(published['profiles']):
    totals, compiles, remainders = [], [], []
    for n in range(1, 6):
        row = read(f'profile-node-{n}.json')['results'][i]
        assert len(row['warm']) == len(row['phases']) == 6
        assert all(s['outputSha256'] == hashes[row['fixture']] for s in row['warm'])
        assert all(p['phase'] == 'vanilla-extract-compile' for p in row['phases'])
        totals.append(median([w['durationMs'] for w in row['warm']]))
        compiles.append(median([p['durationMs'] for p in row['phases']]))
        remainders.append(median([w['durationMs'] - p['durationMs'] for w, p in zip(row['warm'], row['phases'])]))
    equal(median(totals), item['fullMedianMs']); equal(median(compiles), item['compileMedianMs']); equal(median(remainders), item['remainderMedianMs'])
assert read('identity.json')['statusBefore'] == read('identity.json')['statusAfter']
assert read('artifact-parity.json')['javascriptFilesCompared'] == 105
inventory = read('inventory.json')
actual = {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob('*') if p.is_file() and p.name != 'inventory.json'}
assert inventory == actual, 'Packet inventory mismatch'
print(json.dumps({'verified': True, 'sourceProcesses': 5, 'sourceRawTransformSamples': 120, 'publishedProcesses': 10, 'publishedRawTransformSamples': 240, 'profileProcesses': 5, 'profileRawTransformSamples': 60, 'scopedBudgetFailures': [r['id'] for r in comparison['metrics']], 'warmSourceRatio': comparison['metrics'][1]['current']['median'] / comparison['metrics'][1]['baseline'], 'consumer2_5xEstablished': False, 'inventoryFiles': len(inventory)}, indent=2))
