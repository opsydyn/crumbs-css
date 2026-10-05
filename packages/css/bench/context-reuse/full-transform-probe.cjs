// Private Task 4 probe. Runs in disposable fixture paths, restores every authored edit and awaits owned close.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const transformer = require(process.argv[2]);
const fixture = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const scenario = process.argv[4] || 'matrix';
const sourceFiles = Object.values(fixture.files);
const originals = new Map(sourceFiles.map(file => [file, fs.readFileSync(file)]));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const operations = []; let sequence = 0; let closed; let failure;
async function transform(entry, flags = {}, data) {
  const operationId = sequence++;
  const file = fixture.files[entry];
  const settings = { strictDiagnostics: true, includeStyleExplanations: true, dev: true, platform: 'ios', ...flags };
  try {
    const result = await transformer.transform({ upstreamTransformerPath: fixture.upstream, nativeStyles: { strictDiagnostics: settings.strictDiagnostics, includeStyleExplanations: settings.includeStyleExplanations } }, fixture.cwd, file, data || fs.readFileSync(file), { dev: settings.dev, platform: settings.platform });
    const receipts = [];
    const row = { operationId, entry, settings, result, receipts, snapshot: transformer.__crumbsQualificationSnapshot ? transformer.__crumbsQualificationSnapshot() : null };
    operations[operationId] = row; return row;
  } catch (error) {
    const row = { operationId, entry, settings, error: { name: error.name, message: error.message, code: error.code || null }, receipts: [], snapshot: transformer.__crumbsQualificationSnapshot ? transformer.__crumbsQualificationSnapshot() : null };
    operations[operationId] = row; return row;
  }
}
(async () => {
  try {
    if (scenario === 'matrix') {
      await transform('A'); await transform('A'); await transform('B'); await transform('B');
      await Promise.all(['A', 'B', 'C'].map(entry => transform(entry, { platform: 'web', dev: false, includeStyleExplanations: false, strictDiagnostics: false })));
      fs.writeFileSync(fixture.files.token, 'export const token = 41;\n'); await transform('A'); await transform('A');
      fs.writeFileSync(fixture.files.workspace, 'export const workspaceToken = 43;\n'); await transform('A');
      fs.writeFileSync(fixture.files.nested, fixture.nestedEdited); await transform('A');
      fs.writeFileSync(fixture.files.A, fixture.entryEdited); await transform('A');
      fs.writeFileSync(fixture.files.bad, fixture.invalidCompatibility); await transform('bad', { strictDiagnostics: true });
      fs.writeFileSync(fixture.files.bad, 'export const broken = ;');
      await Promise.all([transform('bad'), transform('C')]);
      fs.writeFileSync(fixture.files.bad, originals.get(fixture.files.bad)); await transform('bad');
    } else if (scenario === 'direct') {
      for (let index = 0; index < 2; index++) {
        const code = await transformer.transformCssTsToStyleSheet(fixture.files.A, fixture.cwd, { platform: 'ios', dev: true });
        operations.push({ entry: 'A', result: { code }, snapshot: transformer.__crumbsQualificationSnapshot() });
        const result = await transformer.transformCssTsToStyleSheetWithManifestSidecar(fixture.files.A, fixture.cwd, { platform: 'ios', dev: true });
        operations.push({ entry: 'A', result, snapshot: transformer.__crumbsQualificationSnapshot() });
      }
    } else if (scenario === 'negative') {
      await transform('A');
      fs.writeFileSync(fixture.files.A, fixture.entryEdited);
      if (process.env.CRUMBS_QUALIFICATION_STALE_CONTROL === '1') transformer.__crumbsQualificationStaleInputsOnce();
      await transform('A');
    } else if (scenario === 'bypass') {
      await transform('A'); await transform('A', {}, Buffer.from('old Metro entry buffer'));
      transformer.__crumbsQualificationOptionsOnce({ alias: { unmodelled: './token.ts' } }); await transform('A');
      const manifest = fixture.manifest; const before = fs.readFileSync(manifest);
      try { fs.writeFileSync(manifest, JSON.stringify({ name: 'renamed-session-fixture' })); await transform('A'); }
      finally { fs.writeFileSync(manifest, before); }
    } else if (scenario === 'artifact') {
      await transform('A');
      const artifact = fixture.loadedArtifact; const before = fs.readFileSync(artifact);
      try { fs.appendFileSync(artifact, '\n// owned loaded-artifact edit\n'); await transform('A'); }
      finally { fs.writeFileSync(artifact, before); }
    } else if (scenario === 'unstable') {
      // A known receipt callback edits a declared source while esbuild is completing this request.
      // Expose the candidate's own factory to avoid importing a second plugin-identity registry.
      transformer.__crumbsQualificationUnstableOnce(fixture.files.token, 'export const token = 97;\n'); await transform('A');
    } else throw new Error('Unknown qualification scenario');
  } catch (error) { failure = { name: error.name, message: error.message }; }
  finally {
    try { if (transformer.__crumbsQualificationClose) await transformer.__crumbsQualificationClose(); closed = transformer.__crumbsQualificationSnapshot ? transformer.__crumbsQualificationSnapshot() : null; }
    catch (error) { failure = { name: error.name, message: error.message }; }
    for (const [file, bytes] of originals) fs.writeFileSync(file, bytes);
  }
  const restored = [...originals].every(([file, bytes]) => hash(fs.readFileSync(file)) === hash(bytes));
  console.log(JSON.stringify({ node: process.version, compilerKey: transformer.getCacheKey(), scenario, operations, receipts: transformer.__crumbsQualificationDrainReceipts ? transformer.__crumbsQualificationDrainReceipts() : [], closed, restored, failure }));
  if (failure || !restored) process.exitCode = 1;
})();
