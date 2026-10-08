from pathlib import Path
import hashlib, json, shutil

out = Path('/private/tmp/crumbs-m105-fresh-profile')
repo = Path('/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css')
healthy = Path('/private/tmp/crumbs-css-m105-clean/node_modules/.bun')
package = out / 'package'
assert not package.exists(), 'Use a new owned output directory'
shutil.copytree(repo / 'packages/css', package, ignore=shutil.ignore_patterns('node_modules', '.turbo', '.DS_Store'))
modules = package / 'node_modules'
modules.mkdir()
integration_dependencies = healthy / '@vanilla-extract+integration@8.0.10/node_modules'
for item in integration_dependencies.iterdir():
    if item.name.startswith('@'):
        scope = modules / item.name
        scope.mkdir()
        for child in item.iterdir():
            target = scope / child.name
            if item.name == '@vanilla-extract' and child.name == 'integration':
                shutil.copytree(child.resolve(), target)
            else:
                target.symlink_to(child.resolve(), target_is_directory=True)
    elif item.name == 'esbuild':
        shutil.copytree(item.resolve(), modules / item.name)
    else:
        (modules / item.name).symlink_to(item.resolve(), target_is_directory=True)
# Add the package's direct dependencies, preserving the owned compiler overrides.
for item in (Path('/private/tmp/crumbs-css-m105-clean/packages/css/node_modules')).iterdir():
    if item.name.startswith('@'):
        scope = modules / item.name
        scope.mkdir(exist_ok=True)
        for child in item.iterdir():
            target = scope / child.name
            if not target.exists(): target.symlink_to(child.resolve(), target_is_directory=True)
    elif not (modules / item.name).exists():
        (modules / item.name).symlink_to(item.resolve(), target_is_directory=True)
binary_package = modules / '@esbuild/darwin-arm64'
binary_package.parent.mkdir(exist_ok=True)
shutil.copytree(healthy / '@esbuild+darwin-arm64@0.27.7/node_modules/@esbuild/darwin-arm64', binary_package)
dist = modules / '@vanilla-extract/integration/dist'
dev = dist / 'vanilla-extract-integration.cjs.dev.js'
original = dev.read_text()
modified = original.replace("const result = await babel__namespace.transformAsync(source, {", "const __debugStart = performance.now();\n    const result = await babel__namespace.transformAsync(source, {")
needle = "    code = result.code;\n  }\n  return addFileScope({"
assert modified.count(needle) == 2
# Only instrument async transform: inject after its await, not transformSync.
position = modified.index('const __debugStart')
prefix, tail = modified[:position], modified[position:]
tail = tail.replace(needle, "    globalThis.__CRUMBS_FRESH_PROFILE.push({kind: 'debugIds', filePath, ms: performance.now() - __debugStart});\n" + needle, 1)
modified = prefix + tail
needle = "      const originalSource = await fs.promises.readFile(path$1, 'utf-8');"
assert modified.count(needle) == 1
modified = modified.replace(needle, "      const __readStart = performance.now();\n" + needle + "\n      globalThis.__CRUMBS_FRESH_PROFILE.push({kind: 'cssRead', filePath: path$1, ms: performance.now() - __readStart});")
needle = '  const result = await esbuild.build({'
assert modified.count(needle) == 1
modified = modified.replace(needle, needle + "\n    logLevel: 'info',")
(dist / 'vanilla-extract-integration.cjs.profile.js').write_text(modified)
main = dist / 'vanilla-extract-integration.cjs.js'
entry = main.read_text()
needle = 'require("./vanilla-extract-integration.cjs.dev.js")'
assert needle in entry
main.write_text(entry.replace(needle, "require(process.env.CRUMBS_OWNED_FRESH_PROFILE === '1' ? './vanilla-extract-integration.cjs.profile.js' : './vanilla-extract-integration.cjs.dev.js')"))
binary = binary_package / 'bin/esbuild'
wrapper = out / 'timing-service.sh'
wrapper.write_text('#!/bin/sh\nexec ' + str(binary) + ' --timing "$@"\n')
wrapper.chmod(0o755)
sha = lambda b: hashlib.sha256(b).hexdigest()
context = {
    'packageRoot': str(package), 'nativeBinary': str(binary), 'binarySha256': sha(binary.read_bytes()),
    'integrationOriginalSha256': sha(original.encode()), 'integrationProfileSha256': sha(modified.encode()),
    'wrapper': str(wrapper), 'purpose': 'Owned diagnostic only; no production candidate or cache',
    'copiedArtifacts': [{'path': str(p.relative_to(package / 'dist')), 'sha256': sha(p.read_bytes())} for p in sorted((package / 'dist').rglob('*')) if p.is_file()]
}
(out / 'preparation.json').write_text(json.dumps(context, indent=2) + '\n')
(out / 'integration-instrumentation.patch').write_text(''.join(__import__('difflib').unified_diff(original.splitlines(True), modified.splitlines(True), fromfile='owned-original-integration.dev.js', tofile='owned-profile-integration.dev.js')))
print(json.dumps({'ownedPackage': str(package), 'artifacts': len(context['copiedArtifacts'])}))
