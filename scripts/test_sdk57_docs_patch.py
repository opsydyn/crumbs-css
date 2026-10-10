import importlib.util
import io
import json
from pathlib import Path
import tarfile
import subprocess
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('sdk57_docs_patch', Path(__file__).with_name('sdk57-docs-patch.py'))
patcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(patcher)


class DocumentationPatchTests(unittest.TestCase):
    def setUp(self):
        self.metadata = {
            'name': '@opsydyn/crumbs-css', 'version': '1.1.0',
            'exports': {'.': './dist/index.mjs'}, 'dependencies': {'effect': '4.0.0-rc.115'},
            'peerDependencies': {'react-native': '>=0.85 <0.87'},
        }
        self.base = {
            'package/package.json': json.dumps(self.metadata).encode(),
            'package/README.md': b'npm publication remains pending',
            'package/COMPATIBILITY.md': b'Existing compatibility contract',
            'package/LICENSE': b'MIT',
            'package/dist/index.mjs': b'export const style = 1;',
            'package/dist/index.cjs': b'exports.style = 1;',
            'package/dist/index.d.mts': b'export declare const style: 1;',
        }
        self.readme = b'Crumbs CSS v1 is available on npm. Version `1.1.1` corrects documentation.\n'
        self.current = {**self.metadata, 'version': '1.1.1'}
        self.candidate = {**self.base, 'package/package.json': json.dumps(self.current).encode(), 'package/README.md': self.readme}

    def check(self, candidate=None, current=None, readme=None):
        return patcher.verify_contents(self.base, self.candidate if candidate is None else candidate,
                                      self.current if current is None else current,
                                      self.readme if readme is None else readme)

    def test_accepts_only_readme_and_version_changes(self):
        receipt = self.check()
        self.assertEqual(receipt['changedPaths'], ['package/README.md', 'package/package.json'])
        self.assertEqual(receipt['unchangedFiles'], 5)

    def test_accepts_only_exact_checked_in_compatibility_correction(self):
        compatibility = b'Current stable v1 compatibility documentation'
        candidate = {**self.candidate, 'package/COMPATIBILITY.md': compatibility}
        receipt = patcher.verify_contents(self.base, candidate, self.current, self.readme, compatibility)
        self.assertEqual(receipt['changedPaths'], ['package/COMPATIBILITY.md', 'package/README.md', 'package/package.json'])
        with self.assertRaises(ValueError):
            patcher.verify_contents(self.base, candidate, self.current, self.readme, compatibility+b'injected')

    def test_source_context_rejects_changed_dirty_or_injected_product_source(self):
        with tempfile.TemporaryDirectory(prefix='crumbs-v111-source-control-') as directory:
            root = Path(directory)
            def git(*args):
                return subprocess.check_output(['git', '-C', str(root), *args], text=True, stderr=subprocess.DEVNULL).strip()
            def commit():
                git('add', '.')
                git('-c', 'user.name=Crumbs fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'fixture')
            git('init', '-q')
            source = root/'packages/css/src/index.ts'
            source.parent.mkdir(parents=True)
            source.write_text('export const style = 1;')
            policy = root/'packages/css/build-policy.ts'
            policy.write_text('export const policy = 1;')
            (root/'packages/css/package.json').write_text(json.dumps(self.metadata))
            (root/'packages/css/README.md').write_bytes(self.base['package/README.md'])
            (root/'packages/css/COMPATIBILITY.md').write_bytes(self.base['package/COMPATIBILITY.md'])
            (root/'.release-please-manifest.json').write_text('{"packages/css":"1.1.0"}')
            commit()
            base_revision = git('rev-parse', 'HEAD')
            git('tag', 'v1.1.0')
            (root/'packages/css/package.json').write_text(json.dumps(self.current))
            (root/'packages/css/README.md').write_bytes(self.readme)
            (root/'.release-please-manifest.json').write_text('{"packages/css":"1.1.1"}')
            commit()
            git('tag', 'v1.1.1')
            original_revision = patcher.BASE_REVISION
            patcher.BASE_REVISION = base_revision
            try:
                self.assertEqual(patcher.context(root)[0], git('rev-parse', 'HEAD'))
                policy.write_text('export const policy = 2;')
                with self.assertRaises(ValueError): patcher.context(root)
                commit()
                git('tag', '-f', 'v1.1.1')
                with self.assertRaises(ValueError): patcher.context(root)
                policy.write_text('export const policy = 1;')
                commit()
                git('tag', '-f', 'v1.1.1')
                self.assertEqual(patcher.context(root)[0], git('rev-parse', 'HEAD'))
                source.write_text('export const style = 2;')
                with self.assertRaises(ValueError): patcher.context(root)
                git('checkout', '--', 'packages/css/src/index.ts')
                injected = source.with_name('injected.ts')
                injected.write_text('export const injected = true;')
                with self.assertRaises(ValueError): patcher.context(root)
                injected.unlink()
                for name in ['é.ts', 'tab\tpath.ts', 'line\nbreak.ts']:
                    unusual = source.with_name(name)
                    unusual.write_text('export const injected = true;')
                    commit()
                    git('tag', '-f', 'v1.1.1')
                    with self.assertRaises(ValueError): patcher.context(root)
                    unusual.unlink()
                    commit()
                    git('tag', '-f', 'v1.1.1')
                    self.assertEqual(patcher.context(root)[0], git('rev-parse', 'HEAD'))
                policy.write_text('export const policy = 2;')
                with self.assertRaises(ValueError): patcher.context(root)
                commit()
                git('tag', '-f', 'v1.1.1')
                with self.assertRaises(ValueError): patcher.context(root)
                policy.write_text('export const policy = 1;')
                commit()
                git('tag', '-f', 'v1.1.1')
                self.assertEqual(patcher.context(root)[0], git('rev-parse', 'HEAD'))
                source.write_text('export const style = 2;')
                commit()
                with self.assertRaises(ValueError): patcher.context(root)
                git('tag', '-f', 'v1.1.1')
                with self.assertRaises(ValueError): patcher.context(root)
            finally:
                patcher.BASE_REVISION = original_revision

    def test_rejects_runtime_declaration_and_compatibility_changes(self):
        for name in ['package/dist/index.mjs', 'package/dist/index.cjs', 'package/dist/index.d.mts', 'package/COMPATIBILITY.md', 'package/LICENSE']:
            with self.subTest(name=name):
                with self.assertRaises(ValueError):
                    self.check({**self.candidate, name: self.candidate[name]+b'changed'})

    def test_rejects_new_or_missing_package_files(self):
        missing = dict(self.candidate)
        missing.pop('package/dist/index.mjs')
        for candidate in [missing, {**self.candidate, 'package/dist/injected.mjs': b'injected'}]:
            with self.assertRaises(ValueError): self.check(candidate)

    def test_rejects_changed_dependencies_peers_exports_and_package_identity(self):
        for key, value in [('dependencies', {}), ('peerDependencies', {}), ('exports', {}), ('name', '@other/package')]:
            with self.subTest(key=key):
                metadata = {**self.current, key: value}
                with self.assertRaises(ValueError):
                    self.check({**self.candidate, 'package/package.json': json.dumps(metadata).encode()}, current=metadata)

    def test_rejects_other_patch_versions_and_missing_version_bump(self):
        for version in ['1.1.0', '1.1.2', '2.0.0']:
            metadata = {**self.current, 'version': version}
            with self.assertRaises(ValueError):
                self.check({**self.candidate, 'package/package.json': json.dumps(metadata).encode()}, current=metadata)

    def test_binds_readme_and_metadata_to_checked_out_source(self):
        for candidate in [{**self.candidate, 'package/README.md': self.readme+b'injected'},
                          {**self.candidate, 'package/package.json': json.dumps({**self.current, 'description': 'injected'}).encode()}]:
            with self.assertRaises(ValueError): self.check(candidate)

    def test_rejects_unchanged_or_stale_readme(self):
        for readme in [self.base['package/README.md'], b'1.1.1: npm publication remains pending', b'1.1.1: source/GitHub release only']:
            with self.assertRaises(ValueError):
                self.check({**self.candidate, 'package/README.md': readme}, readme=readme)

    def test_archive_round_trip_preserves_every_file_byte(self):
        archive = patcher.write_archive(self.candidate)
        self.assertEqual(patcher.read_archive(archive), self.candidate)
        self.assertEqual(archive, patcher.write_archive(self.candidate))

    def test_archive_rejects_duplicate_traversal_and_nonregular_members(self):
        for kind in ['duplicate', 'traversal', 'symlink']:
            buffer = io.BytesIO()
            with tarfile.open(fileobj=buffer, mode='w:gz') as archive:
                info = tarfile.TarInfo('package/../escape' if kind == 'traversal' else 'package/file')
                info.size = 1
                if kind == 'symlink': info.type = tarfile.SYMTYPE; info.linkname = '/tmp/escape'
                archive.addfile(info, io.BytesIO(b'x'))
                if kind == 'duplicate': archive.addfile(info, io.BytesIO(b'x'))
            with self.assertRaises(ValueError): patcher.read_archive(buffer.getvalue())


if __name__ == '__main__': unittest.main()
