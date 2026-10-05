"use strict";
const fs = require('node:fs'), path = require('node:path'), { createRequire } = require('node:module');
const f = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const workspaceRequire = createRequire(path.join(f.repo, 'apps/storybook/package.json'));
const expoRequire = createRequire(fs.realpathSync(workspaceRequire.resolve('expo/package.json')));
const requireFromApp = createRequire(expoRequire.resolve('@expo/cli/package.json'));
const Metro = requireFromApp('@expo/metro/metro');
const t = require(f.artifact.transformerPath);
const projects = [f.integration.app, f.integration.app, f.app], rows = [];
(async () => {
    for (const [index, project] of projects.entries()) {
        const cfg = await requireFromApp('@expo/metro/metro-config').loadConfig({ cwd: project, config: path.join(project, 'metro.config.js') });
        cfg.server.port = 8150;
        cfg.maxWorkers = 1;
        cfg.transformer.unstable_workerThreads = false;
        cfg.cacheStores = [];
        cfg.resetCache = true;
        cfg.reporter = { update() { } };
        let finished;
        const ended = new Promise(resolve => { finished = resolve; });
        const returned = await Metro.runServer(cfg, { host: '::1', onClose: () => finished() });
        const server = returned.httpServer || returned;
        let status, body;
        try {
            const response = await fetch('http://[::1]:8150/index.bundle?platform=ios&dev=false&minify=false&modulesOnly=false&runModule=true');
            status = response.status;
            body = await response.text();
        }
        finally {
            await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
            await ended;
        }
        const before = t.__crumbsQualificationSnapshot();
        const began = performance.now();
        while ((t.__crumbsQualificationSnapshot().live > 0 || performance.now() - began < 1500) && performance.now() - began < 10000)
            await new Promise(resolve => setTimeout(resolve, 250));
        const after = t.__crumbsQualificationSnapshot();
        rows.push({ index, project, status, bodyError: status >= 400 ? body : null, bundleBytes: body.length, before, after, mainPid: process.pid, mainAlive: true });
        console.log(JSON.stringify({ project, index, status, before, after }));
    }
    await t.__crumbsQualificationClose();
    fs.writeFileSync(process.argv[3], JSON.stringify({ node: process.version, rows, closed: t.__crumbsQualificationSnapshot(), scope: 'stock-single-worker-server-close-idle-main-stays-alive' }));
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
