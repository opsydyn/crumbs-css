"""Verify this decision's retained inputs; no builds or qualification runs."""
import argparse
import hashlib
import json
from pathlib import Path


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read(path):
    return json.loads(path.read_text())


parser = argparse.ArgumentParser()
parser.add_argument('--repository', required=True)
args = parser.parse_args()
packet = Path(__file__).resolve().parent
repository = Path(args.repository).resolve()
for name, digest in read(packet / 'files.json').items():
    assert sha((packet / name).read_bytes()) == digest, name
observations = read(packet / 'source-observations.json')
for row in observations:
    data = (repository / row['path']).read_bytes()
    assert sha(data) == row['sha256'], row['path']
    lines = data.decode().splitlines()
    for excerpt in row['excerpts']:
        assert '\n'.join(lines[excerpt['startLine'] - 1:excerpt['endLine']]) == excerpt['text']
for row in read(packet / 'inputs.json'):
    assert sha((repository / row['path']).read_bytes()) == row['sha256'], row['path']
checks = {row['id']: row for row in read(packet / 'checks.json')}
assert checks['attribution']['exit_code'] == checks['retained-context-history']['exit_code'] == 0
assert checks['later-restore-correction']['exit_code'] != 0
assert 'Source hash mismatch: packages/css/src/transformer.ts' in checks['later-restore-correction']['output']
historical = read(packet / 'historical-replay.json')
assert historical['exitCode'] == 0 and historical['pinnedSourceFiles'] == 14
assert historical['historicalRevision'] == 'be182d2ec6e1462b16688c588c36629c5f73d074'
assert '4 stages, 10 transform traces, 14 pinned source files' in historical['stdout']
decision = read(packet / 'decision.json')
assert decision['outcome'] == 'retain-fresh-compilation-park-reuse'
assert all(decision[key] is False for key in ['productionCandidateSelected', 'newCacheOrReleasePolicyAccepted',
                                             'performanceQualified', 'releaseExceptionApproved', 'prototypeRun'])
assert decision['originalBlockingFailures'] == ['cold-transform-ms', 'warm-transform-ms', 'incremental-rebuild']
print(json.dumps({'status': 'verified-decision-inputs', 'sourceFiles': len(observations),
                  'evidenceInputs': len(read(packet / 'inputs.json')), 'newPerformanceEvidence': False,
                  'currentSourceHistoricalReplay': 'rejected-source-drift', 'pinnedHistoricalReplay': 'pass'}))
