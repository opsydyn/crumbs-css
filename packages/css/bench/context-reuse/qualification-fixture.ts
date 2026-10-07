import { cpSync, mkdirSync, readFileSync, realpathSync, readdirSync, symlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildCandidate } from "./build-candidate";
import { transformerFixture } from "../../test/support/context-reuse-transformer";
const repository = resolve(import.meta.dir, "../../../..");
export async function prepareQualificationFixture(root: string, builder: typeof buildCandidate = buildCandidate) {
    mkdirSync(root, { recursive: true });
    const artifact = await builder(join(root, "candidate"));
    const fixture = transformerFixture(root, artifact), app = fixture.cwd;
    const modules = realpathSync(join(repository, "apps/storybook/node_modules"));
    const sharedModules = realpathSync(join(repository, "node_modules"));
    symlinkSync(modules, join(app, "node_modules"));
    writeFileSync(join(app, "package.json"), JSON.stringify({ name: "qualification-app", private: true, main: "index.js", dependencies: JSON.parse(readFileSync(join(repository, "apps/storybook/package.json"), "utf8")).dependencies }));
    writeFileSync(join(app, "app.json"), JSON.stringify({ expo: { name: "Crumbs qualification", slug: "crumbs-qualification", platforms: ["ios", "android", "web"] } }));
    writeFileSync(join(app, "babel.config.js"), 'module.exports={presets:[require.resolve("babel-preset-expo")]};\n');
    const base = join(app, "tsconfig.base.json");
    cpSync(join(modules, "expo/tsconfig.base.json"), base);
    writeFileSync(join(app, "tsconfig.json"), JSON.stringify({ extends: "./tsconfig.base.json", compilerOptions: {} }));
    const imp = `import { viewStyle } from ${JSON.stringify(join(artifact.packageRoot, "dist/style.cjs"))};\n`;
    const entries: string[] = [];
    for (let index = 0; index < 32; index++) {
        const file = join(app, "src", `Q${index}.css.ts`);
        writeFileSync(file, imp + `export const probe = viewStyle({ padding: 40000 + ${index} });\n`);
        entries.push(file);
    }
    writeFileSync(join(app, "index.js"), entries.slice(0, 7).map((_, index) => `import {probe as q${index}} from './src/Q${index}.css';`).join("\n") + '\nglobalThis.__crumbsProbe=[' + Array.from({ length: 7 }, (_, index) => `q${index}`).join(",") + '];\n');
    const logs = join(root, "logs");
    mkdirSync(logs);
    const wrapper = join(root, "wrapper.cjs");
    writeFileSync(wrapper, `const t=require(${JSON.stringify(artifact.transformerPath)}),fs=require('fs'),crypto=require('crypto');const hash=x=>crypto.createHash('sha256').update(x).digest('hex');let sequence=0;const log=r=>fs.appendFileSync((process.env.CRUMBS_QUALIFICATION_TRACE||${JSON.stringify(logs)})+'/'+process.pid+'.jsonl',JSON.stringify(r)+'\\n');exports.getCacheKey=t.getCacheKey;exports.transform=async(...args)=>{const start=performance.now();try{const result=await t.transform(...args);if(args[2].endsWith('.css.ts'))log({kind:'transform',pid:process.pid,sequence:sequence++,parentPid:process.ppid,threadId:require('node:worker_threads').threadId,at:Date.now(),entryHash:hash(args[3]),args:[args[0],args[1],args[2],args[4]],resultHash:hash(JSON.stringify(result)),metadata:result.__crumbsNativeStyles,elapsedMs:performance.now()-start,snapshot:t.__crumbsQualificationSnapshot(),receipts:t.__crumbsQualificationDrainReceipts().map(r=>({filePath:r.filePath,sourceHash:hash(r.receipt.source),inputs:r.receipt.inputs,inputsHash:hash(JSON.stringify(r.receipt.inputs))}))});return result;}catch(e){if(args[2].endsWith('.css.ts'))log({kind:'error',pid:process.pid,sequence:sequence++,at:Date.now(),entryHash:hash(args[3]),file:args[2],message:e.message,snapshot:t.__crumbsQualificationSnapshot()});throw e;}};\n`);
    const configure = (project: string) => {
        const cache = join(project, ".qualification-file-map");
        mkdirSync(cache);
        writeFileSync(join(project, "metro.config.js"), `const {getDefaultConfig}=require('expo/metro-config');const {withNativeStyles}=require(${JSON.stringify(join(artifact.packageRoot, "dist/metro-plugin.cjs"))});const c=getDefaultConfig(__dirname);c.watchFolders=${JSON.stringify([root, sharedModules, modules])};c.resolver.useWatchman=false;c.resolver.nodeModulesPaths=[__dirname+'/node_modules',${JSON.stringify(modules)},${JSON.stringify(sharedModules)}];c.transformer={...c.transformer,upstreamTransformerPath:c.transformerPath,nativeStyles:{strictDiagnostics:true}};const config=withNativeStyles(c);config.transformerPath=${JSON.stringify(wrapper)};config.maxWorkers=Number(process.env.CRUMBS_QUALIFICATION_WORKERS||1);config.transformer.unstable_workerThreads=process.env.CRUMBS_QUALIFICATION_THREADS==='1';config.fileMapCacheDirectory=${JSON.stringify(cache)};module.exports=config;\n`);
    };
    configure(app);
    fixture.domain.configurationFiles.push(base);
    const integration = join(root, "integration");
    mkdirSync(integration);
    for (const file of ["src", "index.js", "package.json", "app.json", "babel.config.js", "tsconfig.json", "tsconfig.base.json"])
        cpSync(join(app, file), join(integration, file), { recursive: true });
    const integrationModules = join(integration, "node_modules");
    mkdirSync(integrationModules);
    for (const item of readdirSync(modules)) {
        if (item.startsWith("@")) {
            mkdirSync(join(integrationModules, item));
            for (const child of readdirSync(join(modules, item)))
                try {
                    symlinkSync(realpathSync(join(modules, item, child)), join(integrationModules, item, child));
                }
                catch { }
        }
        else if (item !== ".bin")
            try {
                symlinkSync(realpathSync(join(modules, item)), join(integrationModules, item));
            }
            catch { }
    }
    const workspace = join(root, "bundle-workspace"), otherWorkspace = join(root, "bundle-workspace-other");
    for (const dir of [workspace, otherWorkspace]) {
        mkdirSync(dir);
        writeFileSync(join(dir, "package.json"), '{"name":"qualification-workspace-tokens","exports":{"./tokens":"./tokens.ts"}}');
    }
    writeFileSync(join(workspace, "tokens.ts"), 'export const workspaceToken = 13;\n');
    writeFileSync(join(workspace, "other.ts"), 'export const workspaceToken = 19;\n');
    writeFileSync(join(otherWorkspace, "tokens.ts"), 'export const workspaceToken = 23;\n');
    const link = join(integrationModules, "qualification-workspace-tokens");
    symlinkSync(workspace, link);
    writeFileSync(join(integration, "src/nested.css.ts"), imp + 'export const nested = viewStyle({ margin: 42000 + 1 });\n');
    writeFileSync(join(integration, "src/Q0.css.ts"), imp + `import {token} from './token';import {workspaceToken} from '../../bundle-workspace/tokens';import {nested} from './nested.css';export const probe=viewStyle([nested,{padding:40000+token,borderWidth:41000+workspaceToken}]);\n`);
    writeFileSync(join(integration, "src/alias-token.ts"), 'export const token = 17;\n');
    configure(integration);
    const domain = { ...fixture.domain, configurationFiles: [join(root, "package.json"), join(integration, "package.json"), join(integration, "tsconfig.json"), join(integration, "tsconfig.base.json"), join(workspace, "package.json"), join(otherWorkspace, "package.json"), join(artifact.packageRoot, "package.json")], allowedInputRoots: [join(integration, "src"), workspace, otherWorkspace, join(artifact.packageRoot, "dist")], symlinkPaths: [link] };
    const result = { root, repo: repository, app, artifact, fixture, entries, logs, wrapper, expoCli: join(modules, "expo/bin/cli"), integration: { app: integration, workspace, otherWorkspace, link, domain, entries: entries.map((_, index) => join(integration, "src", `Q${index}.css.ts`)) } };
    writeFileSync(join(root, "qualification-fixture.json"), JSON.stringify(result));
    return result;
}
export type QualificationFixture = Awaited<ReturnType<typeof prepareQualificationFixture>>;
