import { readFileSync, writeFileSync, readdirSync, unlinkSync, symlinkSync, realpathSync } from 'node:fs';
import { join, relative } from 'node:path';
import { qualificationHash as hash } from './qualify';
const root = process.argv[2]!;
const fixture = JSON.parse(readFileSync(join(root, 'qualification-fixture.json'), 'utf8'));
const f = { ...fixture, ...fixture.integration, logs: process.argv[4]! };
const url = process.argv[3]!;
const observations: any[] = [];
const matches = (text: string, property: string, value: number) => ({ padding: ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'], margin: ['marginTop', 'marginBottom', 'marginLeft', 'marginRight'], borderWidth: ['borderTopWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderRightWidth'] }[property] || [property]).every(field => new RegExp('\\b' + field + '"?\\s*:\\s*' + value + '\\b').test(text));
const logs = () => readdirSync(f.logs).flatMap(n => readFileSync(join(f.logs, n), 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line))).sort((a, b) => a.at - b.at).filter(r => r.kind === 'transform' && r.args[1] === f.app && r.args[2].endsWith('Q0.css.ts'));
async function request(kind: string, property: string, value: number, prior?: number, unchanged?: string) {
    const began = performance.now();
    let body = '', status = 0, attempts = 0;
    while (performance.now() - began < 30000) {
        attempts++;
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
            status = response.status;
            body = await response.text();
            if (status === 200 && matches(body, property, value) && (!prior || !matches(body, property, prior)))
                break;
        }
        catch { }
        await Bun.sleep(500);
    }
    const actual = logs().at(-1);
    let reference: any, referenceMatched = false;
    if (status === 200 && actual) {
        const spec: any = { kind: 'performance', transformerPath: f.artifact.transformerPath, mode: 'fresh', capacity: 8 };
        Object.assign(spec, { id: 'reference-' + kind, app: f.app, entries: f.entries.map((p: string) => relative(f.app, p)), requests: [0], config: actual.args[0], options: actual.args[3], output: join(root, 'reference-' + kind + '.json') });
        const specPath = join(root, 'reference-' + kind + '-spec.json'), configPath = join(root, 'reference-' + kind + '-session.json');
        writeFileSync(specPath, JSON.stringify(spec));
        writeFileSync(configPath, JSON.stringify({ mode: 'fresh', settings: { capacity: 8, admission: 'immediate' }, idleMs: 1000, domain: f.domain }));
        const result = Bun.spawnSync([process.argv[5]!, join(f.repo, 'packages/css/bench/context-reuse/qualification-probe.cjs'), specPath], { cwd: f.app, env: { ...process.env, CRUMBS_CONTEXT_QUALIFICATION_CONFIG: configPath }, maxBuffer: 1000000 });
        if (!result.exitCode) {
            reference = JSON.parse(readFileSync(spec.output, 'utf8')).rows[0];
            referenceMatched = actual.resultHash === reference.resultHash && actual.receipts[0].sourceHash === reference.sourceHash && actual.receipts[0].inputsHash === reference.inputsHash && hash(JSON.stringify(actual.metadata)) === reference.metadataHash;
        }
    }
    const receipt = { kind, property, value, prior, status, attempts, elapsedMs: performance.now() - began, bytes: body.length, sha256: hash(body), expectedPresent: matches(body, property, value), previousAbsent: !prior || !matches(body, property, prior), importerUnchanged: unchanged === undefined ? undefined : hash(readFileSync(f.entries[0])) === unchanged, referenceMatched, actual, reference };
    observations.push(receipt);
    writeFileSync(join(root, 'integration-observations.json'), JSON.stringify(observations));
    console.log(kind, status, receipt.expectedPresent, receipt.previousAbsent, referenceMatched, actual?.snapshot?.lastBypassReason);
}
const watched = [f.entries[0], join(f.app, 'src/token.ts'), join(f.app, 'src/nested.css.ts'), join(f.app, 'src/alias-token.ts'), join(f.app, 'tsconfig.base.json'), join(f.workspace, 'tokens.ts'), join(f.workspace, 'package.json'), join(root, 'bun.lock')];
const originals = new Map(watched.map((p: string) => [p, readFileSync(p)]));
const originalLink = f.workspace;
try {
    await request('initial', 'padding', 40011);
    const q0 = f.entries[0], source = readFileSync(q0, 'utf8'), unchanged = hash(source);
    writeFileSync(q0, source.replace('40000+token', '40005+token'));
    await request('entry-edit', 'padding', 40016, 40011);
    writeFileSync(q0, source.replace("import {token} from './token';", '').replace('40000+token', '40043'));
    await request('import-removal', 'padding', 40043, 40016);
    writeFileSync(q0, source);
    await request('entry-restored', 'padding', 40011, 40043);
    if (!process.argv.includes('--entry-only')) {
        writeFileSync(join(f.app, 'src/token.ts'), 'export const token = 29;\n');
        await request('plain-token', 'padding', 40029, 40011, unchanged);
        writeFileSync(join(f.app, 'src/nested.css.ts'), readFileSync(join(f.app, 'src/nested.css.ts'), 'utf8').replace('42000 + 1', '42000 + 3'));
        await request('nested-css', 'margin', 42003, 42001, unchanged);
        writeFileSync(join(f.workspace, 'tokens.ts'), 'export const workspaceToken = 31;\n');
        await request('workspace-source', 'borderWidth', 41031, 41013, unchanged);
        writeFileSync(q0, source.replace("from './token'", "from './alias-token'"));
        await request('import-replacement', 'padding', 40017, 40029);
        writeFileSync(join(f.app, 'tsconfig.base.json'), JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { 'qual-token': ['./src/token.ts'] } } }));
        writeFileSync(q0, source.replace("from './token'", "from 'qual-token'"));
        await request('alias-added', 'padding', 40029, 40017);
        writeFileSync(join(f.app, 'tsconfig.base.json'), JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { 'qual-token': ['./src/alias-token.ts'] } } }));
        await request('alias-retarget', 'padding', 40017, 40029, hash(readFileSync(q0)));
        writeFileSync(q0, readFileSync(q0, 'utf8').replace("'../../bundle-workspace/tokens'", "'qualification-workspace-tokens/tokens'"));
        await request('workspace-package-import', 'borderWidth', 41031);
        writeFileSync(join(f.workspace, 'package.json'), '{"name":"qualification-workspace-tokens","exports":{"./tokens":"./other.ts"}}');
        await request('manifest-exports', 'borderWidth', 41019, 41031, hash(readFileSync(q0)));
        unlinkSync(f.link);
        symlinkSync(f.otherWorkspace, f.link);
        await request('symlink-retarget', 'borderWidth', 41023, 41019, hash(readFileSync(q0)));
        writeFileSync(join(root, 'bun.lock'), 'qualification-installation-edit');
        writeFileSync(join(f.app, 'src/alias-token.ts'), 'export const token = 37;\n');
        await request('installation-lock', 'padding', 40037, 40017, hash(readFileSync(q0)));
        writeFileSync(q0, 'export const broken = ;');
        let errorStatus = 0, errorBody = '';
        const errorStart = performance.now();
        while (performance.now() - errorStart < 20000) {
            const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
            errorStatus = response.status;
            errorBody = await response.text();
            if (errorStatus >= 400 && errorBody.includes('Unexpected token'))
                break;
            await Bun.sleep(500);
        }
        observations.push({ kind: 'syntax-error', status: errorStatus, sha256: hash(errorBody), diagnostic: errorBody.includes('Unexpected token') });
        writeFileSync(q0, source);
        await request('syntax-repair', 'padding', 40029, 40037);
    }
    writeFileSync(join(root, 'integration-observations.json'), JSON.stringify(observations));
}
finally {
    for (const [file, bytes] of originals)
        writeFileSync(file, bytes);
    unlinkSync(f.link);
    symlinkSync(originalLink, f.link);
    writeFileSync(join(root, 'integration-restoration.json'), JSON.stringify({ files: [...originals].map(([path, bytes]) => ({ path, originalSha256: hash(bytes), restoredSha256: hash(readFileSync(path)) })), link: { path: f.link, originalTarget: originalLink, restoredTarget: realpathSync(f.link) } }));
}
