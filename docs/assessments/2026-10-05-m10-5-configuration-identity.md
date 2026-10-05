# M10.5 Task 2 — configuration identity and eligibility

Date: 2026-10-05. Private qualification tooling only; production compilation, exports, dependencies and artifacts are unchanged. Governing plan: [M10.5 Task 2](../superpowers/plans/2026-10-05-m10-5-cache-qualification.md).

## Admitted domain

Callers declare finite configuration, installation, loaded-artifact, symlink and input-root inventories. Receipts hash file bytes, not timestamps; retain logical inventory paths and resolved symlink targets; include actual esbuild 0.27.7 / integration 8.0.10 identities. The integration's dispatcher and all its selectable JavaScript implementations are inventoried automatically. Caller-declared loaded artifacts cover the qualification candidate and its additional loaded implementation files; this is not automatic discovery of every transitive compiler dependency.

Input roots are scanned without following undeclared symlinks. Package manifests and tsconfigs, including ancestors of every allowed root, must be declared. Relative JSON tsconfig extends closures are checked recursively. JSONC, package-based extends and project references are currently unqualified and select fresh compilation. Declared symlink targets need their own input root before their source inputs are admitted. `verifyBuildInputs` checks actual metafile paths after every build; Task 3 must call it before retaining a successful context/result. Declaration alone cannot qualify unseen resolver inputs.

Accepted explicit options match installed integration's forwarded option surface: external, conditions, define, loader, tsconfig and plugins. Loader values are restricted to measured source/data loaders. The file-scope plugin is supplied internally by integration; the optional receipt plugin is recognised by a private factory/WeakSet, never by caller-supplied name. All other executable plugins/options select fresh compilation.

Receipts are immutable, process-local values created by `captureConfiguration`; reconstructed JSON receipts have no provenance and select fresh. Context keys distinguish logical/canonical entry and cwd, identifier mode, build options, configuration and compiler identity. Entry/theme content is excluded because later retained requests must rebuild. Buffer/disk disagreement selects fresh. Double byte reads detect observed instability during receipt capture, but neither receipts nor metafile verification establish an atomic filesystem snapshot or prove what an overlapping build read. Task 3 still needs before/after build-input stability checks.

## Observed results

- Initial RED: nine identity assertions failed against the stub; the independent installed-package cache probe passed.
- Twenty focused tests pass, including byte edits with preserved mtimes, nested cwd, ancestor dependency config omission, missing/unknown inputs, symlink retargets, spoofed plugins, immutable receipts and real compiler/package-cache checks.
- Installed fresh compilation re-read an edited relative extends/alias target: emitted marker changed from 111 to 222 with the base config's mtime preserved. Reuse eligibility selected fresh after the edit.
- A disposable Node process returned the original cached package name after a same-cwd manifest rename. A second process saw the new name. Renaming/removing the loaded named manifest requires restart; a newly captured receipt cannot hide an already stale integration cache.
- A disposable integration copy's implementation edit returned `restart-required/loaded-artifact-changed`, without modifying installed packages. Changes to the observed module-selection environment likewise require restart.
- Fresh review found ancestor-config, implementation-inventory and removed-manifest gaps. Each received a failing regression then a fix; the reviewer independently reran 20 focused tests and confirmed all three findings resolved.
- Final verification: 1,398 package tests across 215 files, package typecheck and documentation build (28 pages) passed. The existing full-transform evidence verifier still passes with its 161-file artifact/input inventory unchanged.

This qualifies the identity decision layer and the recorded fresh-compiler behaviours. It does not qualify retained esbuild resources, complete transformer parity, Metro invalidation, Node 22 host budgets or devices. No production capacity/default is selected. Android remains last.

Next: **M10.5 Task 3 — resource-owning compile session**: consume these receipts, enforce resource bounds, serialise compilation/native evaluation, and qualify failure/disposal/idle behaviour.
