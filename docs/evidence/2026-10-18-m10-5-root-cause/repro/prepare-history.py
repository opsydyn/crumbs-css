import pathlib,subprocess,tarfile,io,json
repo=pathlib.Path('/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css');base=pathlib.Path('/private/tmp/crumbs-m105-root-cause-20261018')
for label,rev in [('historical','92852615e8d37c31d6bea29bc388a39bda40b9d7'),('current','b34f2ee')]:
 root=base/label;root.mkdir(exist_ok=True)
 data=subprocess.check_output(['git','archive',rev,'packages/css','package.json'],cwd=repo)
 with tarfile.open(fileobj=io.BytesIO(data))as t:t.extractall(root,filter='data')
 (root/'node_modules').symlink_to(repo/'node_modules',target_is_directory=True)
 (root/'packages/css/node_modules').symlink_to(repo/'packages/css/node_modules',target_is_directory=True)
 (root/'packages/css/probe-build.config.ts').write_text("import configs from './tsdown.config.ts';export default configs.filter(c=>!c.dts);\n")
 (root/'owner.json').write_text(json.dumps({'task':'M10.5 same-session historical source contrast','revision':rev,'repository':str(repo)}))
