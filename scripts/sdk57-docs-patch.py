"""Publish only the authorised 1.1.1 documentation correction to verified 1.1.0 bytes.

This is not a build or a new performance qualification. Every executable and
all declarations are inherited byte-for-byte from the already published 1.1.0.
"""
import argparse
import gzip
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import subprocess
import tarfile
import urllib.request

BASE_REVISION = 'f08a58d022f9237cf3f4aae8bc9bd77d5c75f204'
BASE_SHA256 = '51b36b137a97364a30e401dc97f017890b6d3e09ad14d2319ad5cd03925baeda'
BASE_URL = 'https://registry.npmjs.org/@opsydyn/crumbs-css/-/crumbs-css-1.1.0.tgz'
VERSION = '1.1.1'
TARBALL = 'opsydyn-crumbs-css-1.1.1.tgz'
SOURCE_PATHS = ['packages/css/src', 'packages/css/tsdown.config.ts', 'packages/css/build-policy.ts', ':(glob)packages/css/tsconfig*.json']


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha256(value):
    return hashlib.sha256(value).hexdigest()


def read_archive(data):
    result = {}
    total = 0
    with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as archive:
        for member in archive:
            path = PurePosixPath(member.name)
            require(member.isfile() and len(path.parts) > 1 and path.parts[0] == 'package'
                    and '..' not in path.parts and str(path) == member.name
                    and '\\' not in member.name and member.name not in result,
                    'Unsafe, duplicate or nonregular package member: '+member.name)
            total += member.size
            require(0 <= member.size <= 10*1024*1024 and total <= 50*1024*1024 and len(result) < 500,
                    'Package archive exceeds its bounded inventory')
            result[member.name] = archive.extractfile(member).read()
    require(result, 'Empty package archive')
    return result


def write_archive(files):
    buffer = io.BytesIO()
    with gzip.GzipFile(fileobj=buffer, mode='wb', filename='', mtime=0, compresslevel=9) as compressed:
        with tarfile.open(fileobj=compressed, mode='w', format=tarfile.PAX_FORMAT) as archive:
            for name, data in sorted(files.items()):
                info = tarfile.TarInfo(name)
                info.size = len(data)
                info.mode = 0o644
                info.mtime = 0
                archive.addfile(info, io.BytesIO(data))
    return buffer.getvalue()


def verify_contents(base, candidate, current, readme, compatibility=None):
    require(set(candidate) == set(base), 'Documentation patch added or removed package files')
    original = json.loads(base['package/package.json'])
    metadata = json.loads(candidate['package/package.json'])
    require(original.get('name') == '@opsydyn/crumbs-css' and original.get('version') == '1.1.0', 'Wrong base package')
    expected = {**original, 'version': VERSION}
    require(metadata == expected and metadata == current, 'Only the exact 1.1.1 metadata version bump is allowed')
    docs = {'package/README.md': readme, 'package/COMPATIBILITY.md': base['package/COMPATIBILITY.md'] if compatibility is None else compatibility}
    require(candidate['package/README.md'] != base['package/README.md'], 'README correction is missing')
    text = readme.decode('utf-8').lower()
    require(VERSION in text and 'npm publication remains pending' not in text
            and 'source/github release only' not in text, 'README still describes an unpublished release')
    for name, data in candidate.items():
        if name in docs:
            require(data == docs[name], 'Documentation does not match checked-out source: '+name)
        elif name != 'package/package.json':
            require(data == base[name], 'Non-documentation package bytes changed: '+name)
    changed = sorted(name for name in base if candidate[name] != base[name])
    return {'changedPaths': changed, 'unchangedFiles': len(base)-len(changed),
            'javascriptFiles': sum(name.endswith(('.mjs', '.cjs', '.js')) for name in base),
            'declarationFiles': sum(name.endswith(('.d.mts', '.d.cts', '.d.ts')) for name in base),
            'fileSha256': {name: sha256(data) for name, data in sorted(candidate.items())}}


def git(repo, *args):
    return subprocess.check_output(['git', '-C', str(repo), *args], text=True).strip()


def product_tree(repo, revision):
    entries = [entry for entry in git(repo, 'ls-tree', '-r', '-z', revision, '--', 'packages/css').split('\0') if entry]
    return [entry for entry in entries if
            entry.split('\t', 1)[1].startswith('packages/css/src/')
            or entry.split('\t', 1)[1] in ['packages/css/tsdown.config.ts', 'packages/css/build-policy.ts']
            or (entry.split('\t', 1)[1].startswith('packages/css/tsconfig')
                and entry.split('\t', 1)[1].endswith('.json')
                and '/' not in entry.split('\t', 1)[1].removeprefix('packages/css/'))]


def context(repo):
    revision = git(repo, 'rev-parse', 'HEAD')
    require(git(repo, 'rev-parse', 'v1.1.0^{commit}') == BASE_REVISION, 'Base tag moved')
    require(git(repo, 'rev-parse', 'v1.1.1^{commit}') == revision, 'Patch tag differs from checked-out revision')
    require(product_tree(repo, BASE_REVISION) == product_tree(repo, revision), 'Product source or build configuration changed')
    tracked = ['packages/css/package.json', 'packages/css/README.md', 'packages/css/COMPATIBILITY.md', *SOURCE_PATHS]
    require(not git(repo, 'diff', 'HEAD', '--', *tracked), 'Dirty source or packaged documentation')
    require(not git(repo, 'ls-files', '--others', '--exclude-standard', '--', *SOURCE_PATHS), 'Injected product source')
    metadata = json.loads((repo/'packages/css/package.json').read_text())
    require(json.loads((repo/'.release-please-manifest.json').read_text())['packages/css'] == VERSION, 'Release manifest version mismatch')
    return revision, metadata


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['prepare', 'verify'])
    parser.add_argument('--repo', type=Path, required=True)
    parser.add_argument('--bundle', type=Path, required=True)
    args = parser.parse_args()
    repo, bundle = args.repo.resolve(), args.bundle.resolve()
    revision, metadata = context(repo)
    with urllib.request.urlopen(urllib.request.Request(BASE_URL, headers={'Cache-Control': 'no-cache'}), timeout=60) as response:
        base_bytes = response.read(2*1024*1024)
    require(sha256(base_bytes) == BASE_SHA256, 'Published 1.1.0 base tarball identity mismatch')
    base = read_archive(base_bytes)
    require(len(base) == 185, 'Unexpected verified 1.1.0 inventory')
    readme = (repo/'packages/css/README.md').read_bytes()
    compatibility = (repo/'packages/css/COMPATIBILITY.md').read_bytes()
    if args.mode == 'prepare':
        require(not bundle.exists(), 'Bundle destination already exists')
        files = {**base, 'package/package.json': (repo/'packages/css/package.json').read_bytes(),
                 'package/README.md': readme, 'package/COMPATIBILITY.md': compatibility}
        verify_contents(base, files, metadata, readme, compatibility)
        packed = write_archive(files)
        bundle.mkdir(parents=True)
        (bundle/TARBALL).write_bytes(packed)
    packed = (bundle/TARBALL).read_bytes()
    files = read_archive(packed)
    require(files['package/package.json'] == (repo/'packages/css/package.json').read_bytes(), 'Package metadata is not checked-out source bytes')
    receipt = {'format': 'crumbs.sdk57.documentation-patch.v1', 'releaseTag': 'v1.1.1', 'sourceRevision': revision,
               'baseRevision': BASE_REVISION, 'baseTarballSha256': BASE_SHA256, 'packageVersion': VERSION,
               'tarballName': TARBALL, 'tarballSha256': sha256(packed),
               'qualification': 'Inherited published 1.1.0 runtime and declarations; documentation/version changes only. No new performance pass, numerical exception or extension of the 1.1.0 disposition.',
               **verify_contents(base, files, metadata, readme, compatibility)}
    manifest = bundle/'manifest.json'
    if args.mode == 'prepare':
        manifest.write_text(json.dumps(receipt, indent=2)+'\n')
    else:
        require(json.loads(manifest.read_text()) == receipt, 'Sealed documentation-patch receipt changed')
    print(json.dumps({key: value for key, value in receipt.items() if key != 'fileSha256'}, indent=2))


if __name__ == '__main__':
    main()
