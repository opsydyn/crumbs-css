from pathlib import Path
import json, math, re, statistics, sys

def require(condition, message):
    if not condition:
        raise ValueError(message)

def p50(values):
    return sorted(values)[math.ceil(len(values) * .5) - 1]

def envelope(values):
    return {'processP50s': values, 'min': min(values), 'median': statistics.median(values), 'max': max(values)}

phases = {'scan': ('Scan phase', 2), 'entryPoints': ('Add entry points', 4), 'dependencies': ('Scan all dependencies', 4), 'compile': ('Compile phase', 2), 'link': ('Link', 4), 'onEnd': ('On-end callbacks', 2)}

def derive(data, logs):
    summary = {'format': 'crumbs.m10.5.fresh-compile-profile-summary', 'version': 1,
               'qualification': False, 'statistic': 'Nearest-rank sample p50, worst fixture per process, median of five processes',
               'modes': {}, 'nativePrintedMilliseconds': {}, 'pluginMilliseconds': {}, 'graphs': {},
               'pairedTimedOutputs': 60, 'timedTransforms': 120, 'nativeTimingBlocks': 90}
    canonical = {}
    for mode in ['control', 'profile']:
        full, compile_wall, worst = {'README': [], 'consumer': []}, {'README': [], 'consumer': []}, []
        for i in range(1, 6):
            report = data[f'{mode}-{i}.json']
            require(report['format'] == 'crumbs.m10.5.fresh-compile-profile' and report['version'] == 1 and report['mode'] == mode, 'report identity')
            require(report['runtime'] == {'node': 'v26.3.0', 'bun': '1.4.2'}, 'Bun runtime identity')
            require([r['label'] for r in report['rows']] == ['README', 'consumer'], 'fixture membership')
            selected = []
            for row in report['rows']:
                label = row['label']
                require(len(row['setup']) == 2 and len(row['samples']) == 6, 'sample protocol')
                require([len(s['compileCalls']) for s in row['setup']] == [2, 1], 'initial resolution confirmation')
                require(all(len(s['compileCalls']) == 1 for s in row['samples']), 'fresh compile each timed call')
                for sample in row['setup'] + row['samples']:
                    require(math.isfinite(sample['ms']) and sample['ms'] > 0, 'finite transform timing')
                    canonical.setdefault(label, sample['sha256'])
                    require(sample['sha256'] == canonical[label], 'generated output parity')
                    for call in sample['compileCalls']:
                        require(math.isfinite(call['ms']) and call['ms'] > 0, 'finite compile timing')
                        require(len(call['inputs']) == 9 and len(call['watchFiles']) == 9, 'complete nine-input graph')
                        reference = data['control-1.json']['rows'][0 if label == 'README' else 1]['samples'][0]['compileCalls'][0]
                        require(call['sourceSha256'] == reference['sourceSha256'] and call['watchFiles'] == reference['watchFiles'] and call['inputs'] == reference['inputs'], 'compiled text/input/watch parity')
                        if mode == 'profile':
                            expected = 1 if label == 'README' else 2
                            require(len(call['pluginEvents']) == expected * 2, 'complete CSS and debug-ID events')
                            require(sum(e['kind'] == 'debugIds' for e in call['pluginEvents']) == expected and sum(e['kind'] == 'cssRead' for e in call['pluginEvents']) == expected, 'plugin event kinds')
                            require(all(math.isfinite(e['ms']) and e['ms'] >= 0 for e in call['pluginEvents']), 'finite plugin times')
                        else:
                            require(call['pluginEvents'] == [], 'control has no plugin timing instrumentation')
                value = p50([s['ms'] for s in row['samples']])
                full[label].append(value)
                selected.append(value)
                compile_wall[label].append(p50([s['compileCalls'][0]['ms'] for s in row['samples']]))
                summary['graphs'][label] = {'inputs': 9, 'metafileInputBytes': sum(x['bytes'] for x in row['samples'][0]['compileCalls'][0]['inputs']), 'outputSha256': canonical[label]}
            worst.append(max(selected))
        summary['modes'][mode] = {'fullTransformMs': {label: envelope(values) for label, values in full.items()}, 'integrationCompileMs': {label: envelope(values) for label, values in compile_wall.items()}, 'diagnosticSelectorMs': envelope(worst)}
    for label in ['README', 'consumer']:
        native = {phase: [] for phase in phases}
        plugins = {'cssRead': [], 'debugIds': []}
        for i in range(1, 6):
            blocks = logs[f'profile-{i}.stderr.txt'].split('Timing information')[1:]
            require(len(blocks) == 18, 'exact native timing block count')
            position, values = 0, {phase: [] for phase in phases}
            report = data[f'profile-{i}.json']
            for row in report['rows']:
                for stage in ['setup', 'samples']:
                    for sample in row[stage]:
                        for call in sample['compileCalls']:
                            block = blocks[position]
                            position += 1
                            if stage != 'samples' or row['label'] != label:
                                continue
                            for phase, (name, indent) in phases.items():
                                matches = re.findall('^' + ' ' * indent + re.escape(name) + r': (\d+)ms$', block, re.M)
                                require(len(matches) == 1, 'native phase membership')
                                values[phase].append(int(matches[0]))
            require(position == len(blocks), 'native-to-compile call alignment')
            for phase in phases:
                require(len(values[phase]) == 6, 'six native samples')
                native[phase].append(p50(values[phase]))
            row = next(r for r in report['rows'] if r['label'] == label)
            for kind in plugins:
                plugins[kind].append(p50([sum(e['ms'] for e in s['compileCalls'][0]['pluginEvents'] if e['kind'] == kind) for s in row['samples']]))
        summary['nativePrintedMilliseconds'][label] = {phase: envelope(v) for phase, v in native.items()}
        summary['pluginMilliseconds'][label] = {kind: envelope(v) for kind, v in plugins.items()}
    return summary

if __name__ == '__main__':
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent
    data = {f'{mode}-{i}.json': json.loads((root / f'{mode}-{i}.json').read_text()) for mode in ['control', 'profile'] for i in range(1, 6)}
    logs = {f'profile-{i}.stderr.txt': (root / f'profile-{i}.stderr.txt').read_text() for i in range(1, 6)}
    print(json.dumps(derive(data, logs), indent=2))
