"""Integrity/derivation checks, not independent execution attestation."""
import argparse
import gzip
import hashlib
import json
import shutil
import stat
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / 'repro'))
from derive import derive, load, union_ms


def verify(packet, repository=None):
    packet = Path(packet)
    pins = load(packet / 'packet-files.json')
    for relative, digest in pins.items():
        assert hashlib.sha256((packet / relative).read_bytes()).hexdigest() == digest, relative
    actual = derive(packet)
    assert actual == load(packet / 'summary.json'), 'Derived summary mismatch'
    assert actual['performanceQualified'] is False
    if repository:
        repository = Path(repository)
        snapshot = load(packet / 'preservation-before.json.gz')
        for relative, expected in snapshot['product'].items():
            file = repository / relative
            assert hashlib.sha256(file.read_bytes()).hexdigest() == expected['sha256'], relative
            assert stat.S_IMODE(file.stat().st_mode) == expected['mode'], relative
        artifacts = {str(p.relative_to(repository)): hashlib.sha256(p.read_bytes()).hexdigest()
                     for p in (repository / 'packages/css/dist').rglob('*') if p.is_file()}
        assert artifacts == snapshot['artifacts'], 'Live artifact drift'
        assert (repository / 'packages/css/bench/budgets.json').read_bytes() == (packet / 'budgets.json').read_bytes()
        historical = repository / 'docs/evidence/2026-10-17-m1-10c-expo58-release/final-release/host-report/comparison.json'
        assert historical.read_bytes() == gzip.decompress((packet / 'historical-comparison.json.gz').read_bytes())
        for dependency in load(packet / 'environment.json')['dependencies']:
            assert hashlib.sha256(Path(dependency['file']).read_bytes()).hexdigest() == dependency['sha256']
    return {'status': 'verified-diagnostic-only', 'retainedTransforms': actual['counts']['retainedTransforms'],
            'observedCompileCalls': actual['counts']['observedCompileCalls'],
            'repeatedPackageFiles': len(actual['repeatedPackageGraph']),
            'performanceQualified': False, 'livePreservationChecked': bool(repository)}


def self_test(packet):
    assert union_ms([(0, 3), (1, 2), (2, 4), (5, 7)]) == 6, 'Overlapping spans double counted'
    with tempfile.TemporaryDirectory(prefix='crumbs-cost-verifier-', dir='/private/tmp') as temp:
        relocated = Path(temp) / 'relocated'
        shutil.copytree(packet, relocated)
        verify(relocated)
        cases = ['output-drift', 'missing-package-input', 'false-qualification', 'corrupt-raw']
        for case in cases:
            target = Path(temp) / case
            shutil.copytree(packet, target)
            relative = 'raw/profile-1.json.gz'
            data = load(target / relative)
            if case == 'output-drift':
                data['events'][2]['outputSha256'] = '0' * 64
            elif case == 'missing-package-input':
                data['events'][2]['builds'][0]['inputs'].pop(0)
            elif case == 'false-qualification':
                relative = 'summary.json'
                data = load(target / relative)
                data['performanceQualified'] = True
            if case == 'corrupt-raw':
                with (target / relative).open('ab') as file:
                    file.write(b'corruption')
            else:
                content = (json.dumps(data, indent=2) + '\n').encode()
                (target / relative).write_bytes(gzip.compress(content, mtime=0) if relative.endswith('.gz') else content)
                # Update the pin: semantic controls must fail independently of byte integrity.
                pins = load(target / 'packet-files.json')
                pins[relative] = hashlib.sha256((target / relative).read_bytes()).hexdigest()
                (target / 'packet-files.json').write_text(json.dumps(pins))
            try:
                verify(target)
            except (AssertionError, KeyError, ValueError, OSError):
                continue
            raise AssertionError(f'Negative control accepted: {case}')
    return {'relocation': 'pass', 'overlapUnion': 'pass', 'negativeControls': cases}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--repository')
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    result = verify(root, args.repository)
    if args.self_test:
        result['selfTests'] = self_test(root)
    print(json.dumps(result))
