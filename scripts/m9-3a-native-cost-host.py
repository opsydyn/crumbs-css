"""Temporary native cost setup; run stage/serve/restore against an owned checkout."""
import argparse
import hashlib
import json
from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['stage', 'serve', 'restore'])
    parser.add_argument('--root', type=Path, default=Path.cwd())
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--port', type=int, default=8099)
    parser.add_argument('--run-id', default='m93a-native-cost')
    args = parser.parse_args()
    root, out = args.root.resolve(), args.out.resolve()
    if args.command == 'stage':
        out.mkdir(parents=True, exist_ok=True)
        manifest = out / 'staging.json'
        if manifest.exists():
            raise SystemExit('Existing staging manifest: restore it before staging again')
        capture = root / 'packages/css/src/devtools/native/capture.ts'
        original = capture.read_bytes()
        before = b'export const explainInspectorInput = (input: CrumbsInspectorInput) => explainStyle(input)'
        after = b'export const explainInspectorInput = (input: CrumbsInspectorInput) => { (globalThis as any).__crumbsNativeCostObserver?.(); return explainStyle(input) }'
        if original.count(before) != 1:
            raise SystemExit('Capture implementation differs; re-review instrumentation')
        harness = (root / 'scripts/fixtures/m9-3a-native-cost.tsx').read_bytes()
        changes = [(capture, original.replace(before, after))]
        for app, fixture in [('playground', './src/devtools/DevtoolsPanel.css'), ('storybook', './src/components/devtools/DevtoolsFixture.css')]:
            target = root / f'apps/{app}/.m93a-native-cost.tsx'
            if target.exists():
                raise SystemExit(f'Refusing to overwrite {target}')
            changes.append((target, harness))
            entry = '\n'.join([
                'import { registerRootComponent } from "expo"',
                'import { createNativeCostScreen } from "./.m93a-native-cost"',
                f'import * as fixture from "{fixture}"',
                f'registerRootComponent(createNativeCostScreen(fixture, {json.dumps(app)}, "http://127.0.0.1:{args.port}", {json.dumps(args.run_id)}))', ''
            ]).encode()
            changes.append((root / f'apps/{app}/index.js', entry))
        rows = []
        for i, (path, staged) in enumerate(changes):
            old = path.read_bytes() if path.exists() else None
            if old is not None:
                (out / f'original-{i}').write_bytes(old)
            rows.append({'path': str(path.relative_to(root)), 'backup': f'original-{i}' if old is not None else None, 'originalSha256': sha(old) if old is not None else None, 'stagedSha256': sha(staged)})
        manifest.write_text(json.dumps({'root': str(root), 'runId': args.run_id, 'files': rows}, indent=2) + '\n')
        for path, staged in changes:
            path.write_bytes(staged)
        print('Staged native qualification screens; restore before committing or building packages.')
    elif args.command == 'restore':
        manifest = json.loads((out / 'staging.json').read_text())
        if manifest['root'] != str(root):
            raise SystemExit('Checkout identity differs')
        for row in manifest['files']:
            path = root / row['path']
            if not path.exists() or sha(path.read_bytes()) != row['stagedSha256']:
                raise SystemExit(f'Concurrent edit; refusing restore: {path}')
            if row['backup'] and sha((out / row['backup']).read_bytes()) != row['originalSha256']:
                raise SystemExit('Backup digest mismatch')
        for row in manifest['files']:
            path = root / row['path']
            if row['backup']:
                path.write_bytes((out / row['backup']).read_bytes())
            else:
                path.unlink()
        (out / 'restored.json').write_text(json.dumps({'restored': True, 'runId': manifest['runId']}) + '\n')
        print('Original source/entries restored byte-for-byte; generated screens removed.')
    else:
        out.mkdir(parents=True, exist_ok=True)
        class Handler(BaseHTTPRequestHandler):
            def do_POST(self):
                n = int(self.headers.get('Content-Length', '0'))
                if not 1 <= n <= 262144:
                    self.send_error(400); return
                value = json.loads(self.rfile.read(n))
                app, platform = value.get('app'), value.get('platform')
                if app not in ['playground', 'storybook'] or platform not in ['ios', 'android'] or value.get('runId') != args.run_id:
                    self.send_error(400); return
                (out / f'{app}-{platform}.json').write_text(json.dumps(value, indent=2) + '\n')
                self.send_response(200); self.end_headers(); self.wfile.write(b'ok')
            def log_message(self, *unused):
                pass
        ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()


if __name__ == '__main__':
    main()
