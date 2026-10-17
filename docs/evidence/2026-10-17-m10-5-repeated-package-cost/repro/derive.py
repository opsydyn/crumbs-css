"""Derive diagnostics from retained observations; never qualify a release."""
import gzip
import hashlib
import json
import math
from pathlib import Path


def load(path):
    return json.loads(gzip.decompress(path.read_bytes()) if path.suffix == '.gz' else path.read_text())


def p50(values):
    assert values and all(math.isfinite(x) for x in values)
    return sorted(values)[math.ceil(len(values) / 2) - 1]


def union_ms(spans):
    total, end = 0, float('-inf')
    for start, stop in sorted(spans):
        assert stop >= start
        total += max(0, stop - max(start, end))
        end = max(end, stop)
    return total


def derive(packet):
    packet = Path(packet)
    before, after = [load(packet / (x + '.json.gz')) for x in ['preservation-before', 'preservation-after']]
    assert before == after, 'Product preservation drift'
    assert len(before['product']) == 948 and len(before['artifacts']) == 181
    historical = load(packet / 'historical-comparison.json.gz')
    budget = load(packet / 'budgets.json')
    warm = next(x for x in historical['metrics'] if x['id'] == 'warm-transform-ms')
    rule = next(x for x in budget['metrics'] if x['id'] == 'warm-transform-ms')
    limit = min(rule['threshold']['absoluteMax'], warm['baseline'] * (1 + rule['threshold']['maxRegressionPercent'] / 100))
    summaries, hashes, graphs, compiled, metafiles, package_graphs = {}, {}, {}, {}, {}, set()
    totals = {'setupTransforms': 0, 'retainedTransforms': 0, 'observedCompileCalls': 0}
    selectors = {'control': [], 'profile': []}
    for pair in range(1, 6):
        pair_cells = {}
        for variant in ['control', 'profile']:
            report = load(packet / 'raw' / f'{variant}-{pair}.json.gz')
            assert report['pair'] == pair and report['variant'] == variant
            assert report['runtime']['bun'] == '1.4.2' and report['runtime']['esbuild'] == '0.27.7'
            events = report['events']
            expected_order = ['README', 'consumer'] if pair % 2 else ['consumer', 'README']
            assert [x['label'] for x in events[::8]] == expected_order
            assert len(events) == 16
            for label in ['README', 'consumer']:
                rows = [x for x in events if x['label'] == label]
                assert [r['sample'] for r in rows] == list(range(-2, 6))
                metrics = []
                for row in rows:
                    total = row['end'] - row['start']
                    assert math.isfinite(total) and total > 0
                    hashes.setdefault(label, set()).add(row['outputSha256'])
                    totals['setupTransforms' if row['sample'] < 0 else 'retainedTransforms'] += 1
                    m = {'fullMs': total}
                    if variant == 'profile':
                        calls, builds = row['compiles'], row['builds']
                        assert len(calls) == len(builds) == (2 if row['sample'] == -2 else 1), 'Unexpected compilation count'
                        totals['observedCompileCalls'] += len(calls)
                        for call, build in zip(calls, builds):
                            assert row['start'] <= call['start'] <= build['start'] <= build['end'] <= call['end'] <= row['end']
                            assert build['outputSha256'] == call['sourceSha256']
                            compiled.setdefault(label, set()).add(call['sourceSha256'])
                            inputs = build['inputs']
                            assert len(inputs) == 10 and len({x['file'] for x in inputs}) == 10
                            packages = sorted((x['file'].split('dist/', 1)[1], x['bytes'], x['sha256']) for x in inputs if x['category'] == 'crumbs-dist')
                            assert len(packages) == 8
                            assert sum(x[1] for x in packages) == 78679
                            assert sum(x['category'] == 'authored' for x in inputs) == 2
                            assert not any(x['category'] == 'vendor' for x in inputs)
                            package_graphs.add(json.dumps(packages))
                            signature = sorted((x['file'], x['category'], x['bytes'], x['sha256']) for x in inputs)
                            graphs.setdefault(label, set()).add(json.dumps(signature))
                            metafiles.setdefault(label, set()).add(json.dumps(build['metafile'], sort_keys=True))
                            assert len(call['watchFiles']) == 10
                            assert sorted(str((Path(row['cwd']) / x['file']).resolve()) for x in inputs) == sorted(call['watchFiles'])
                            assert len(build['cssLoads']) == (1 if label == 'README' else 2)
                            for callback in build['cssLoads']:
                                assert callback['plugin'] == 'vanilla-extract-filescope'
                                assert build['start'] <= callback['start'] <= callback['end'] <= build['end']
                        compile_ms = union_ms([(c['start'], c['end']) for c in calls])
                        reads = row['reads']
                        assert reads
                        assert all(row['start'] <= x['start'] <= x['end'] <= row['end'] for x in reads)
                        read_ms = union_ms([(x['start'], x['end']) for x in reads])
                        m.update(compileMs=compile_ms,
                                 buildMs=union_ms([(b['start'], b['end']) for b in builds]),
                                 cssCallbackUnionMs=union_ms([(c['start'], c['end']) for b in builds for c in b['cssLoads']]),
                                 hostSyncReadUnionMs=read_ms,
                                 hypotheticalFreeCompileMs=total - compile_ms,
                                 hypotheticalFreeHostSyncReadsMs=total - read_ms,
                                 requiredCompileFraction=max(0, total - limit) / compile_ms)
                    else:
                        assert not row['compiles'] and not row['builds'] and not row['reads']
                    if row['sample'] >= 0:
                        metrics.append(m)
                process = {key: p50([m[key] for m in metrics]) for key in metrics[0]}
                summaries.setdefault(f'{variant}:{label}', []).append(process)
                pair_cells[f'{variant}:{label}'] = process['fullMs']
            selectors[variant].append(max(pair_cells[f'{variant}:{label}'] for label in ['README', 'consumer']))
    assert all(len(v) == 1 for v in [*hashes.values(), *graphs.values(), *compiled.values(), *metafiles.values()]), 'Output, compile source or input drift'
    assert len(package_graphs) == 1
    assert totals == {'setupTransforms': 40, 'retainedTransforms': 120, 'observedCompileCalls': 90}
    cells = {}
    for cell, processes in summaries.items():
        cells[cell] = {'processP50s': processes, 'medianOfProcessP50s': {key: p50([r[key] for r in processes]) for key in processes[0]}}
    return {
        'format': 'crumbs.m10.5.cost-attribution.summary', 'version': 1,
        'disposition': 'No fresh-packaging candidate justified by this attribution alone',
        'performanceQualified': False, 'packageExclusiveRemovableCostMs': None,
        'reason': 'The entire compilation envelope can cover the local gap; its removable package subset is not measured. Native work and plugin waits overlap.',
        'historicalReference': {'warmMs': warm['current']['median'], 'effectiveLimitMs': limit,
                                'requiredReductionPercent': (1 - limit / warm['current']['median']) * 100,
                                'blockingFailures': historical['blocking']['failIds'],
                                'scope': 'Retained release result; not comparable absolute timing to this compiled-CJS diagnostic'},
        'counts': totals, 'cells': cells,
        'selectors': {v: {'processWorstFixtureP50s': xs, 'median': p50(xs), 'range': [min(xs), max(xs)]} for v, xs in selectors.items()},
        'repeatedPackageGraph': json.loads(next(iter(package_graphs))),
        'outputSha256': {label: next(iter(values)) for label, values in hashes.items()},
        'preservation': {'productFiles': len(before['product']), 'shippingArtifacts': len(before['artifacts'])},
        'notRun': ['production-candidate', 'dependency-edit-restore-qualification', 'official-source-host-gate',
                   'cold-incremental-qualification', 'sdk-native-device-qualification', 'publication'],
    }


if __name__ == '__main__':
    import sys
    print(json.dumps(derive(sys.argv[1]), indent=2))
