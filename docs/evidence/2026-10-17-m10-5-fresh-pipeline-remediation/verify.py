#!/usr/bin/env python3
"""Verify retained rejection evidence independently; does not rerun or qualify a release."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import subprocess
import tarfile
import tempfile

HERE = Path(__file__).resolve().parent
sha = lambda data: hashlib.sha256(data).hexdigest()
def raw(name):
    path = HERE / name
    if path.exists():
        return path.read_bytes()
    return gzip.decompress(Path(str(path) + '.gz').read_bytes())


def read(name):
    return json.loads(raw(name))


def archive(name):
    files = {}
    with tarfile.open(HERE / name) as handle:
        for member in handle.getmembers():
            path = PurePosixPath(member.name)
            assert not path.is_absolute() and '..' not in path.parts, member.name
            assert member.isfile() or member.isdir(), member.name
            if member.isfile():
                assert member.name not in files, member.name
                files[member.name] = handle.extractfile(member).read()
    return files


def js_string(value):
    encoded = json.dumps(value, ensure_ascii=False, separators=(',', ':'))
    return ''.join('\\u%04x' % ord(c) if 0xD800 <= ord(c) <= 0xDFFF else c for c in encoded)


def encoded(value, at=()):
    if value is None:
        return 'n;'
    if isinstance(value, bool):
        return 'b1;' if value else 'b0;'
    if isinstance(value, str):
        text = js_string(value)
        return f's{len(text.encode())}:{text}'
    if isinstance(value, (int, float)):
        assert isinstance(value, int) or value.is_integer(), 'Unexpected numeric receipt'
        return f'd{int(value)};'
    if isinstance(value, list):
        parts = [encoded(v, (*at, str(i))) for i, v in enumerate(value)]
        if len(at) == 3 and at[0] == 'inputs' and at[2] == 'imports':
            parts.sort(key=lambda s: s.encode('utf-16-be', 'surrogatepass'))
        return f'a{len(parts)}[' + ''.join(parts) + ']'
    assert isinstance(value, dict), type(value)
    keys = sorted(value, key=lambda s: s.encode('utf-16-be', 'surrogatepass'))
    return f'o{len(keys)}' + '{' + ''.join(encoded(k) + encoded(value[k], (*at, k)) for k in keys) + '}'


def stringify(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def marker(receipt, source_bytes):
    proof, context = receipt['proof'], receipt['proof']['context']
    compiler = hashlib.md5(b"@opsydyn/crumbs-css" + source_bytes).hexdigest()
    assert context['compilerKey'] == compiler + ':style-explanations=' + ('1' if context['dev'] else '0')
    if proof['kind'] == 'legacy':
        material = stringify(dict(entryHash=proof['entryHash'], inputs=proof['inputs'], resolutionIdentity=proof['resolutionIdentity']))
    else:
        assert proof['kind'] == 'fresh'
        material = 'crumbs-fresh-input-v1\0' + encoded(dict(sourceHash=sha(proof['source'].encode()), inputs=proof['inputs'], resolutionIdentity=proof['resolutionIdentity']))
    resolution = sha(material.encode())
    text = 'crumbs-native-cache-v1\0' + f"compiler={context['compilerKey']}\0platform={context['platform'] or ''}\0dev={int(context['dev'])}\0strict={int(context['strictDiagnostics'])}\0styleSheet={int(context['useStyleSheet'])}\0ident={context['identOption']}\0"
    for dependency in sorted(proof['dependencies'], key=lambda d: d['importPath']):
        text += dependency['importPath'] + '\0' + dependency['sourceHash'] + '\0'
    text += 'resolution=' + resolution + '\0'
    found = re.match(r'/\* @crumbs-native-cache ([a-f0-9]{64}) \*/', receipt['code'])
    assert found and found[1] == sha(text.encode()), receipt['case']


def comparable_maps(receipt):
    start = len('/* @crumbs-native-cache ')
    result = []
    for segment in receipt['maps']:
        if len(segment) >= 4 and segment[0] == 1 and start <= segment[1] < start + 64 and segment[2:4] == [1, 0]:
            result.append([segment[0], start, *segment[2:]])
        else:
            result.append(segment)
    return result


def compare(a, b):
    assert a['case'] == b['case']
    if 'error' in a or 'error' in b:
        for key in ('error', 'authoredInputs'):
            assert a.get(key) == b.get(key), (a['case'], key)
        return
    assert re.sub(r'^/\* @crumbs-native-cache [a-f0-9]{64} \*/', '', a['code']) == re.sub(r'^/\* @crumbs-native-cache [a-f0-9]{64} \*/', '', b['code'])
    assert comparable_maps(a) == comparable_maps(b), (a['case'], 'maps')
    for key in ('observation', 'metadata', 'authoredInputs', 'externalVersions', 'diagnostics', 'events'):
        assert a[key] == b[key], (a['case'], key)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--repository', type=Path)
    args = parser.parse_args()
    for item in read('qualification/original-inventory.json'):
        assert sha(raw('qualification/' + item['path'])) == item['sha256'], item['path']
    disposition = read('disposition.json')
    assert disposition['status'] == 'rejected'
    assert sha((HERE / 'control-v1.2.0.tgz').read_bytes()) == disposition['controlTarballSha256'] == '4bd7897aa5beb6383b158f4e214436ba5d0d659b6b0fc005142c945a10dda02e'
    assert sha(gzip.decompress((HERE / 'candidate-tracked.patch.gz').read_bytes())) == disposition['candidatePatchSha256']
    control = archive('control-v1.2.0.tgz')
    for item in read('control-recovery.json')['files']:
        assert sha(control['package/' + item['path']]) == item['sha256']
    assert len(control) == 185
    candidate, original = archive('candidate-files.tar.gz'), archive('initial-source.tar.gz')
    file_list = read('candidate-files.json')
    assert set(candidate) == {item['path'] for item in file_list}
    for item in file_list:
        assert sha(candidate[item['path']]) == item['sha256']
    with tempfile.TemporaryDirectory(prefix='crumbs-m105-verify-') as temporary:
        temp = Path(temporary)
        for path, data in original.items():
            file = temp / path
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_bytes(data)
        subprocess.run(['git', 'apply'], input=gzip.decompress((HERE / 'candidate-tracked.patch.gz').read_bytes()), cwd=temp, check=True, capture_output=True)
        for item in file_list:
            if not item['new']:
                assert (temp / item['path']).read_bytes() == candidate[item['path']], item['path']
    candidate_dist, original_dist = archive('candidate-dist.tar.gz'), archive('initial-dist.tar.gz')
    for item in read('candidate-artifact-inventory.json'):
        assert sha(candidate_dist['dist/' + item['path']]) == item['sha256']
    restoration = read('restoration.json')
    for item in restoration['artifacts']:
        assert sha(original_dist[item['path']]) == item['sha256']
    assert len(original_dist) == 181 and restoration['candidateAddedFilesAbsent']
    counts = {'pairs': 0, 'verifiedMarkers': 0}
    source_name = 'packages/css/src/transformer.ts'
    for stage in ('control', 'parity'):
        a = read(f'qualification/{stage}-control.json')
        b = read(f'qualification/{stage}-candidate.json')
        assert len(a) == len(b) == 17
        assert read(f'qualification/{stage}-comparison.json')['errors'] == []
        for left, right in zip(a, b):
            compare(left, right)
            counts['pairs'] += 1
        for variant, values in (('control', a), ('candidate', b)):
            is_candidate = stage == 'parity' and variant == 'candidate'
            dist = candidate_dist if is_candidate else control
            for receipt in values:
                if 'error' in receipt:
                    continue
                marker(receipt, candidate[source_name] if is_candidate else original[source_name])
                counts['verifiedMarkers'] += 1
                for item in receipt['privateInputs']:
                    key = item['path'] if is_candidate else 'package/' + item['path']
                    if is_candidate:
                        key = item['path']
                    assert sha(dist[key]) == item['hash'], (stage, variant, key)
        for values in (a, b):
            trace = [r for r in values if '.fresh-pipeline-owned' in r['case'] and 'error' not in r]
            assert len(trace) == 7
            for item in trace:
                if 'restore' in item['case'] or 'repair' in item['case']:
                    assert item['code'] == trace[0]['code']
    candidate_log = gzip.open(HERE / 'logs/candidate-suite.log.gz', 'rt').read()
    assert re.search(r'\b1896 pass\b', candidate_log) and re.search(r'\b22 fail\b', candidate_log)
    assert 'ordinary-runtime export imports unauthorized external @vanilla-extract/css' in candidate_log
    failures = []
    for line in candidate_log.splitlines():
        if '(fail)' in line:
            name = re.sub(r'^.*?\(fail\)\s*', '', line)
            name = re.sub(r'\s*\[[\d.]+ms\]$', '', name)
            if name not in failures:
                failures.append(name)
    assert failures == read('candidate-failures.json') and len(failures) == 22
    restored = gzip.open(HERE / 'logs/restored-suite.log.gz', 'rt').read()
    assert re.search(r'\b0 fail\b', restored), 'Restored suite must pass'
    assert not list((HERE / 'qualification').glob('warm-*.json')), 'No warm gate was attempted'
    if args.repository:
        ignored = {'docs/roadmap.md', 'docs/superpowers/plans/2026-10-17-m10-5-fresh-pipeline-remediation.md', 'docs/superpowers/specs/2026-10-17-m10-5-fresh-pipeline-remediation-design.md'}
        for item in read('initial-tracked-inventory.json'):
            if item['path'] not in ignored:
                assert sha((args.repository / item['path']).read_bytes()) == item['sha256'], item['path']
        for item in restoration['artifacts']:
            assert sha((args.repository / 'packages/css' / item['path']).read_bytes()) == item['sha256']
        for item in file_list:
            if item['new']:
                assert not (args.repository / item['path']).exists(), item['path']
    inventory = read('inventory.json')
    for item in inventory:
        assert sha((HERE / item['path']).read_bytes()) == item['sha256'], item['path']
    print(json.dumps(dict(status='verified-rejection', **counts, restoredArtifacts=181, controlFiles=185, failedTests=22)))


if __name__ == '__main__':
    main()
