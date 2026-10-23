#!/usr/bin/env python3
"""Offline validation of this rejected candidate; never executes archived code."""
import hashlib
import json
from pathlib import Path
import shutil
import sys
import tarfile
import tempfile


def digest(data):
    return hashlib.sha256(data).hexdigest()


def verify(root):
    errors = []
    def require(ok, message):
        if not ok:
            errors.append(message)
    def read(name):
        return json.loads((root / name).read_text())
    try:
        inventory = read('inventory.json')
        for name, expected in inventory.items():
            target = root / name
            require(not Path(name).is_absolute() and '..' not in Path(name).parts,
                    'unsafe inventory path')
            if Path(name).is_absolute() or '..' in Path(name).parts:
                continue
            require(target.is_file() and digest(target.read_bytes()) == expected,
                    'missing/changed evidence: ' + name)
        require(set(inventory) == {p.name for p in root.iterdir() if p.is_file()} - {'inventory.json'},
                'incomplete inventory')
        packet = read('packet.json')
        identity = read('candidate-identity.json')
        require(packet['disposition'] == 'rejected', 'this evidence cannot admit a candidate')
        require(packet['failedGate'] == 'metro-session-cache-isolation', 'wrong failed gate')
        require(packet['sourceDigest'] == identity['sourceDigest'] ==
                digest(json.dumps(identity['product'], sort_keys=True, separators=(',', ':')).encode()),
                'wrong candidate source identity')
        require(identity['dirty'] is True, 'candidate source state rewritten')
        require(packet['gates'] == {
            'witness': 'partial', 'memo': 'partial', 'transformer': 'partial',
            'metro': 'failed', 'isolation': 'incomplete', 'sdk': 'unrun',
            'native': 'unrun', 'host': 'unrun', 'restoration': 'passed'}, 'unsupported gate claim')
        key = read('supervisor-key.json')
        require(key['sessionIsolationPassed'] is False and key['sessionA'] != key['sessionB'],
                'missing failed session-only key comparison')
        require(key['unchangedControlStable'] is True and key['unchangedA'] == key['unchangedB']
                and key['noSessionA'] == key['noSessionB'], 'unstable key controls')
        require(key['onlyDifference'] == '__crumbsNativeCacheSession.token', 'key comparison scope')
        with tarfile.open(root / 'candidate-sources-artifacts.tar.gz', 'r:gz') as archive:
            archived = {}
            expected = identity['product'] | identity['dist']
            for member in archive.getmembers():
                require(member.isfile() and member.name in expected, 'unexpected candidate member: ' + member.name)
                if member.isfile() and member.name in expected:
                    actual = digest(archive.extractfile(member).read())
                    require(actual == expected[member.name], 'candidate member changed: ' + member.name)
                    archived[member.name] = actual
            require(set(identity['ownedProductPaths']) <= set(archived), 'missing owned candidate source')
            require(set(identity['dist']) <= set(archived), 'missing candidate artifact')
        with tarfile.open(root / 'development-logs.tar.gz', 'r:gz') as archive:
            for item in read('development-log-index.json'):
                data = archive.extractfile(item['path']).read()
                require(digest(data) == item['sha256'] and len(data) == item['bytes'],
                        'development log differs: ' + item['path'])
        with tarfile.open(root / 'metro-journeys.tar.gz', 'r:gz') as archive:
            result = json.load(archive.extractfile('metro-eligible/result.json'))
            rows = result['observations']
            require(result['passed'] is False, 'Metro failure rewritten')
            for row in rows:
                bundle = archive.extractfile('metro-eligible/' + row['stage'].replace(' ', '-') + '.bundle.js').read()
                require(digest(bundle) == row['bundleSha256'], 'Metro bundle differs: ' + row['stage'])
                require(row['width'] == row['expected'], 'incorrect observed value: ' + row['stage'])
            restore = next(row for row in rows if row['stage'] == 'candidate restore')
            restarts = [row for row in rows if row['stage'].startswith('candidate restart')]
            require(len(restarts) == 3, 'missing restart evidence')
            previous = set(restore['keys'])
            require(len(previous) == 16, 'wrong starting cache cardinality')
            for row in restarts:
                current = set(row['keys'])
                require(len(row['ordinaryFiles']) == 6 and row['native'] == 1,
                        'restart transform counts differ')
                require(previous < current and len(current - previous) == 7, 'restart key growth missing')
                previous = current
        restoration = read('restoration.json')
        preservation = read('preservation.json')
        require(restoration == {'verified': True, 'sourceFiles': 948, 'shippingArtifacts': 181, 'errors': []},
                'shipping restoration not verified')
        require(len(preservation['product']) == 948 and len(preservation['dist']) == 181,
                'original preservation inventory differs')
        checks = read('verification.json')
        require(all(checks[name]['exitCode'] == 0 for name in ['build', 'typecheck', 'test']),
                'restored shipping checks failed')
        with tarfile.open(root / 'restored-checks.tar.gz', 'r:gz') as archive:
            for item in checks.values():
                require(digest(archive.extractfile(item['log']).read()) == item['sha256'],
                        'restored check log differs')
    except (OSError, ValueError, KeyError, TypeError, StopIteration, tarfile.TarError, AttributeError) as exc:
        errors.append('unreadable/incomplete evidence: ' + str(exc))
    return errors


def self_test(root):
    assert not verify(root), verify(root)
    for variant in ['accepted', 'source', 'stable-keys', 'missing-raw', 'corrupt-artifact']:
        with tempfile.TemporaryDirectory(prefix='crumbs-evidence-negative-') as temporary:
            copy = Path(temporary) / 'packet'
            shutil.copytree(root, copy)
            if variant in ['accepted', 'source']:
                p = json.loads((copy / 'packet.json').read_text())
                p['disposition' if variant == 'accepted' else 'sourceDigest'] = 'accepted' if variant == 'accepted' else '0' * 64
                (copy / 'packet.json').write_text(json.dumps(p))
            elif variant == 'stable-keys':
                p = json.loads((copy / 'supervisor-key.json').read_text())
                p['sessionB'] = p['sessionA']
                (copy / 'supervisor-key.json').write_text(json.dumps(p))
            elif variant == 'missing-raw':
                (copy / 'metro-journeys.tar.gz').unlink()
            else:
                (copy / 'candidate-sources-artifacts.tar.gz').write_bytes(b'corrupt archive')
            # Re-sign the index so semantic negatives do not pass solely on stale hashes.
            (copy / 'inventory.json').write_text(json.dumps({p.name: digest(p.read_bytes()) for p in copy.iterdir() if p.is_file() and p.name != 'inventory.json'}))
            assert verify(copy), 'negative control passed: ' + variant
    return 5


if __name__ == '__main__':
    args = [x for x in sys.argv[1:] if x != '--self-test']
    root = Path(args[0]).resolve() if args else Path(__file__).resolve().parent
    errors = verify(root)
    negatives = self_test(root) if '--self-test' in sys.argv and not errors else 0
    print(json.dumps({'valid': not errors, 'disposition': 'rejected', 'negativeControls': negatives, 'errors': errors}, indent=2))
    sys.exit(bool(errors))
