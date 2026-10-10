import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { m115SourceIdentity, m115Sha, verifyM115InputFiles } from '../../../../scripts/m11-5-qualification';
import { captureGuaranteesSourceIdentity } from '../../../../scripts/guarantees-matrix/source-identity';
const root = process.cwd(), evidence = join(root, 'docs/evidence/2026-10-10-m11-5-runtime-extensions');
const read = async (path: string) => JSON.parse(await readFile(path, 'utf8'));
function ensure(value: unknown, message: string): asserts value { if (!value) throw Error(message); }
const checks: {kind: string; path: string; sha256: string}[] = [];
const check = async (kind: string, path: string, expected: string) => { const actual = m115Sha(await readFile(path)); ensure(actual === expected, 'Drift: ' + path); checks.push({kind, path, sha256: actual}); };
const host = await read(join(evidence, 'host/qualification.json')), native = await read(join(evidence, 'native/qualification.json'));
ensure(host.mode === 'full' && host.host === 'passed' && native.acceptance === 'passed' && native.ios === 'passed' && native.android === 'passed', 'Incomplete current cohort');
const source = await m115SourceIdentity();
for (const identity of [host.sourceBefore, host.sourceAfter, native.sourceBefore, native.sourceAfter]) ensure(identity.digest === source.digest, 'Source digest drift');
for (const file of source.files) await check('source', join(root, file.path), file.sha256);
for (const artifact of [host.artifact, host.extensionArtifact]) await check('tarball', artifact.tarball, artifact.sha256);
await check('native-host-receipt', join(evidence, 'host/qualification.json'), native.hostReceiptSha256);
await check('ownership', join(evidence, 'execution/ownership.json'), native.ownershipSha256);
for (const name of ['crumbs-css', 'crumbs-css-copy']) {
 const base = join(host.consumerRoot, 'node_modules/@opsydyn', name); await verifyM115InputFiles(base, host.artifactHashes);
 for (const file of host.artifactHashes) await check('installed-' + name, join(base, file.path), file.sha256);
}
const runtime = join(host.consumerRoot, 'node_modules/@acme/crumbs-extensions');
await verifyM115InputFiles(runtime, host.runtimePackageFiles);
for (const file of host.runtimePackageFiles) await check('installed-runtime', join(runtime, file.path), file.sha256);
await verifyM115InputFiles(host.consumerRoot, host.nativeInputs);
for (const file of host.nativeInputs) await check('native-input', join(host.consumerRoot, file.path), file.sha256);
for (const command of [...host.commands, ...native.commands]) { ensure(command.exitCode === 0, 'Failed accepted command'); await check('command', command.log, command.sha256); }
for (const platform of ['ios', 'android']) {
 ensure(native[platform + 'Phases'].length === 12, 'Incomplete phases: ' + platform);
 for (const phase of native[platform + 'Phases']) await check('image', phase.file, phase.sha256);
}
for (const bundle of native.bundles) for (const [suffix, key] of [['bundle','sha256'], ['map','mapSha256']]) {
 const path = join(evidence, 'native', bundle.platform + '-served.' + suffix + '.gz'), bytes = gunzipSync(await readFile(path));
 ensure(m115Sha(bytes) === bundle[key], 'Archived served bytes drift'); checks.push({kind: 'served-' + suffix, path, sha256: m115Sha(bytes)});
}
for (const id of [1, 2]) {
 const sample = await read(join(evidence, 'cost/sample-' + id + '.json'));
 ensure(sample.sourceBefore.digest === source.digest && sample.sourceAfter.digest === source.digest && sample.consumed, 'Cost source/consumption drift');
 for (const file of sample.artifactFiles) await check('cost-artifact', join(root, 'packages/css/dist', file.path), file.sha256);
}
const input = await read(join(evidence, 'host-budgets/input-identity.json')), collector = captureGuaranteesSourceIdentity(root);
ensure(input.sourceBefore.sha256 === input.sourceAfter.sha256 && input.sourceAfter.sha256 === collector.sha256, 'Collector source drift');
ensure(JSON.stringify(input.artifactsBefore) === JSON.stringify(input.artifactsAfter) && JSON.stringify(input.policyBefore) === JSON.stringify(input.policyAfter), 'Collector artifact/policy drift');
for (const file of input.artifactsAfter) await check('collector-artifact', join(root, 'packages/css/dist', file.path), file.sha256);
const preflight = await read(join(evidence, 'execution/preflight.json'));
await check('lock', join(root, 'bun.lock'), preflight.lockSha256);
for (const file of (await read(join(evidence, 'host/exports-archive/inventory.json'))).files) {
 await check('export-archive', join(root, file.archive), file.archiveSha256);
 ensure(m115Sha(gunzipSync(await readFile(join(root, file.archive)))) === file.sha256, 'Lossless export archive drift');
}
ensure(native.cleanup.every((row: any) => row.status === 'passed'), 'Native cleanup failed');
await writeFile(join(evidence, 'final-integrity.json'), JSON.stringify({schema:'crumbs.m11.5.final-integrity.v1', sourceDigest:source.digest, artifactSha256:host.artifact.sha256, extensionArtifactSha256:host.extensionArtifact.sha256, collectorSourceDigest:collector.sha256, checks, checkedAt:new Date().toISOString(), allPassed:true}, null, 2) + '\n');
console.log(JSON.stringify({source:source.digest, checks:checks.length, allPassed:true}));
