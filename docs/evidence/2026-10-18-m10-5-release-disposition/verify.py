"""Offline integrity checks; no publication admission or network calls."""
import argparse
import base64
import hashlib
import io
import json
import subprocess
import tarfile
import zipfile
from pathlib import Path


def read(path):
    return json.loads(path.read_text())


def sha(data):
    return hashlib.sha256(data).hexdigest()


parser = argparse.ArgumentParser()
parser.add_argument('--repository', required=True)
args = parser.parse_args()
repo, packet = Path(args.repository).resolve(), Path(__file__).resolve().parent
for name, digest in read(packet / 'files.json').items():
    assert sha((packet / name).read_bytes()) == digest, name
final = repo / 'docs/evidence/2026-10-17-m1-10c-expo58-release/final-release'
candidate = read(packet / 'candidate.json')
assert candidate == read(final / 'candidate.json')
assert subprocess.check_output(['git', 'rev-parse', 'v1.2.0^{commit}'], cwd=repo, text=True).strip() == candidate['sourceRevision']
assert read(packet / 'live/github-tag.json')['object']['sha'] == candidate['sourceRevision']
ci, tree = read(packet / 'live/github-release-ci.json'), read(packet / 'live/github-release-ci-tree.json')
assert ci['conclusion'] == 'success' and tree['sha'] == ci['head_sha']
assert tree['tree']['sha'] == subprocess.check_output(['git', 'rev-parse', 'v1.2.0^{tree}'], cwd=repo, text=True).strip()
tarbytes = (packet / 'artifact/opsydyn-crumbs-css-1.2.0.tgz').read_bytes()
assert sha(tarbytes) == candidate['tarballSha256']
assert 'sha512-' + base64.b64encode(hashlib.sha512(tarbytes).digest()).decode() == candidate['tarballIntegrity']
inventory = {}
with tarfile.open(fileobj=io.BytesIO(tarbytes)) as archive:
    for member in archive.getmembers():
        assert member.isfile() or member.isdir()
        if member.isdir():
            continue
        assert member.name.startswith('package/') and '..' not in Path(member.name).parts
        name = member.name.removeprefix('package/')
        assert name not in inventory
        inventory[name] = sha(archive.extractfile(member).read())
assert len(inventory) == 185
matrix = read(final / 'sdk-matrix.json')
assert sha((final / 'sdk-matrix.json').read_bytes()) == candidate['sdkMatrixSha256']
assert matrix['tarballSha256'] == candidate['tarballSha256'] and matrix['sourceRevision'] == candidate['sourceRevision']
assert sorted(row['sdk'] for row in matrix['receipts']) == [56, 57, 58]
for row in matrix['receipts']:
    assert sha((final / row['file']).read_bytes()) == row['sha256']
    receipt = read(final / row['file'])
    assert inventory == {f['path']: f['sha256'] for f in receipt['crumbs']['files']}
    assert receipt['crumbs']['tarballSha256'] == candidate['tarballSha256']
    assert receipt['source']['revision'] == candidate['sourceRevision'] and receipt['source']['dirty'] is False
current_dist = {str(f.relative_to(repo / 'packages/css')): sha(f.read_bytes()) for f in (repo / 'packages/css/dist').rglob('*') if f.is_file()}
assert current_dist == {f: h for f, h in inventory.items() if f.startswith('dist/')}
assert len(current_dist) == 181
reports = {row['path']: row['sha256'] for row in candidate['reportFiles']}
assert len(reports) == 20
assert reports == {str(f.relative_to(final / 'host-report')): sha(f.read_bytes()) for f in (final / 'host-report').rglob('*') if f.is_file()}
assert sha(json.dumps(candidate['reportFiles'], separators=(',', ':')).encode()) == candidate['reportDigest']
zipbytes = (packet / 'host-report-download.zip').read_bytes()
artifact = read(packet / 'live/github-artifacts.json')['artifacts'][0]
assert 'sha256:' + sha(zipbytes) == artifact['digest']
with zipfile.ZipFile(io.BytesIO(zipbytes)) as archive:
    zipped = {item.filename.removeprefix('host-report/'): sha(archive.read(item)) for item in archive.infolist() if not item.is_dir()}
assert zipped == reports
host = read(packet / 'host-replay-pinned.json')
assert host == read(final / 'host-verification.json')
assert host == read(packet / 'bindings-verification.json')['hostVerification']
failures = ['cold-transform-ms', 'warm-transform-ms', 'incremental-rebuild']
assert host['blocking']['failIds'] == failures and not host['blocking']['incompleteIds']
assert len(host['blockers']) == 3 and host['releasePolicyQualified'] is False
assert read(packet / 'host-replay-initial.json')['blockers'][0] == 'Host-budget source digest or file inventory does not match the current repository source'
for row in read(packet / 'tooling-inputs.json'):
    assert sha((repo / row['path']).read_bytes()) == row['sha256']
latest, version, tags = [read(packet / ('live/' + name + '.json')) for name in ['npm-latest', 'npm-v120', 'npm-dist-tags']]
assert latest['status'] == tags['status'] == 200 and latest['body']['version'] == tags['body']['latest'] == '1.1.1'
assert version['status'] == 404
jobs = {job['name']: job for job in read(packet / 'live/github-jobs.json')['jobs']}
assert jobs['qualify']['conclusion'] == 'failure' and jobs['publish']['conclusion'] == 'skipped'
disposition = read(packet / 'disposition.json')
assert disposition['defaultChoice'] == 'keep-publication-blocked' and disposition['explicitChoicePending'] is True
assert all(disposition[key] is False for key in ['exceptionApproved', 'publicationAuthorizedByThisSlice', 'normalQualificationManifestSealed', 'genericPolicyChanged', 'newQualificationRun', 'newSdkOrNativeRun'])
assert disposition['pinsConfirmed']['tarballSha256'] == candidate['tarballSha256']
print(json.dumps({'status': 'verified-pins-publication-blocked', 'packageFiles': len(inventory), 'distFiles': len(current_dist),
                  'hostReportFiles': len(reports), 'sdkCohorts': [56, 57, 58], 'numericalFailures': failures,
                  'registryObservation': 'latest1.1.1/version1.2.0-not-found', 'newQualificationRun': False}))
