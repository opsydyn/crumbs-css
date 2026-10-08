from pathlib import Path
import hashlib, json, os, subprocess, sys

repo = Path('/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css')
prior = repo / 'docs/evidence/2026-10-08-m10-5-warm-proof-feasibility'
healthy = Path('/private/tmp/crumbs-css-m105-clean/node_modules/.bun')
sha = lambda b: hashlib.sha256(b).hexdigest()
source = json.loads((prior / 'source-after.json').read_text())
for row in source['files']:
    p = repo / row['path']
    assert sha(p.read_bytes()) == row['sha256'], row['path']
    assert bool(p.lstat().st_mode & 0o111) == row['executable'], row['path']
    if 'link' in row:
        assert os.readlink(p) == row['link']
artifacts = json.loads((prior / 'artifact-before.json').read_text())
dist = repo / 'packages/css/dist'
assert sorted(str(p.relative_to(dist)) for p in dist.rglob('*') if p.is_file()) == sorted(r['path'] for r in artifacts)
for row in artifacts:
    assert sha((dist / row['path']).read_bytes()) == row['sha256'], row['path']
shared = {}
for relative in ['@vanilla-extract+integration@8.0.10/node_modules/@vanilla-extract/integration', 'esbuild@0.27.7/node_modules/esbuild', '@esbuild+darwin-arm64@0.27.7/node_modules/@esbuild/darwin-arm64']:
    tree = healthy / relative
    for p in sorted(tree.rglob('*')):
        if p.is_file():
            shared[str(p)] = sha(p.read_bytes())
primary = Path('/Users/alancurrie/Projects/crumbs-css')
snapshot = {
    'sourceDigest': source['sha256'], 'sourceFileCount': len(source['files']),
    'artifactCount': len(artifacts), 'artifactReceiptSha256': sha((prior / 'artifact-before.json').read_bytes()),
    'registrySha256': sha((repo / 'packages/css/bench/budgets.json').read_bytes()),
    'policySha256': sha((repo / 'scripts/release-host-budget-policy.json').read_bytes()),
    'sharedCompilerFiles': shared,
    'primaryDirtyFiles': {name: sha((primary / name).read_bytes()) for name in ['.release-please-manifest.json', 'bun.lock', 'packages/css/package.json']},
    'managedDependencyLinks': {name: os.readlink(repo / name) for name in ['node_modules', 'packages/css/node_modules']},
    'primaryStatus': subprocess.check_output(['git', 'status', '--short'], cwd=primary, text=True),
}
Path(sys.argv[1]).write_text(json.dumps(snapshot, indent=2) + '\n')
print(json.dumps({'sourceFiles': len(source['files']), 'artifacts': len(artifacts), 'sharedCompilerFiles': len(shared)}))
