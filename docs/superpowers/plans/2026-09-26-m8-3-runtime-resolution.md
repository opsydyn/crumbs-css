# M8.3 ESM/CommonJS/Metro Resolution and Tree-Shaking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Qualify every installed Crumbs export across ESM, CommonJS, runtime dependency graphs, and production Expo Metro tree shaking.

**Architecture:** Extend the packed-consumer harness with manifest-derived export resolution and a packed-artifact dependency graph audit. Add three isolated Expo entry surfaces (ordinary runtime, schema decoder, and positive control), export each for iOS and web with production tree shaking enabled, inspect generated JavaScript and source-map inventories, then retain a qualification receipt and publish the compatibility boundary.

**Tech Stack:** TypeScript, Bun tests, Node ESM/CommonJS, TypeScript AST parsing, npm packed tarballs, Expo SDK 56.0.4, React Native 0.85.3, React 19.2.5, Metro, Effect 4.

**Spec:** `docs/superpowers/specs/2026-09-26-m8-3-runtime-resolution-design.md`

## Global Constraints

- The Node executable floor is `22.0.0`; the package declares `node >=22.0.0`.
- The packed Expo consumer baseline is Expo `56.0.4`, React Native `0.85.3`, and React `19.2.5`.
- The package manifest remains authoritative for public paths and conditional targets; test all declared compatibility aliases, including `./dist/theme` and `./dist/metro-plugin`.
- Ordinary runtime paths allow React only for theme entries, no external dependency for `./tokens`, and no Effect, Node built-ins, authoring modules, or compiler dependencies.
- `./tokens/schema` and `./tokens/optic` may bundle Effect internally; Effect remains an implementation dependency, not a consumer peer or required userland import.
- Compiler tooling may retain only Node and compiler dependencies admitted by `packages/css/build-policy.ts`; Effect must not remain an external import.
- Production Expo exports cover iOS and web with Metro tree shaking explicitly enabled. Android export, Android device behavior, physical-device acceptance, and publishing remain out of scope.
- Preserve existing `--check` and `--m8-2-check` behavior and receipts. Add a distinct `--m8-3-check` mode and receipt.
- The decoder-only generated JavaScript must omit the literal `external-token-theme`; a positive control importing and calling `decodeExternalTokenTheme` must retain it. Source-map `sourcesContent` and bundle-size changes do not count as canary evidence.
- Change package exports or build settings only when a qualification probe demonstrates a defect. Add no public API or consumer Effect peer dependency by default.
- Commit each task as its own slice and leave Android/device acceptance parked.

## Review Focus

- A newly declared conditional export, compatibility alias, or `./package.json` target is omitted or resolves to the wrong ESM/CommonJS/types file: Task 1 derives and checks targets from the packed manifest.
- The dedicated schema entry resolves in one module format but fails to load or decode in the other, or its declarations fail Node16/Bundler resolution: Task 1 packed runtime and type probes.
- A packed local graph edge is missing, a non-literal dynamic loader evades inspection, or an export path is not assigned a dependency class: Task 2 graph fixture tests.
- An ordinary entry leaks Effect/compiler/Node code, or an advanced Effect entry leaves Effect external: Task 2 per-entry dependency policy tests.
- A decoder canary check passes without detector sensitivity, uses source-map text, or overlooks one platform bundle: Task 3 paired raw-JavaScript canary and iOS/web inventory tests.

## File Map

| File | Responsibility |
| --- | --- |
| `scripts/packed-export-contract.ts` | Derive installed ESM/CommonJS/types resolutions from the packed manifest for tests and the receipt. |
| `packages/css/test/packed-export-contract.test.ts` | Pin manifest target flattening, package-boundary checks, and import/require resolution. |
| `packages/css/test/pack-consumer-contract.test.ts` | Exercise packed ESM, CommonJS, schema decoding, Node16, and Bundler consumers. |
| `scripts/packed-runtime-graph.ts` | Walk packed ESM/CommonJS local edges and enforce entrypoint dependency classes. |
| `packages/css/test/packed-runtime-graph.test.ts` | Pin graph traversal, missing-edge, dynamic-loader, and dependency-class behavior with packed-file fixtures. |
| `packages/css/fixtures/packed-distribution/app/src/runtime-surfaces/ordinary.tsx` | Use only `theme/core` and `tokens` in the ordinary runtime bundle. |
| `packages/css/fixtures/packed-distribution/app/src/runtime-surfaces/schema-decoder.tsx` | Call `decodeTokenValue` from `tokens/schema` without importing the external theme decoder. |
| `packages/css/fixtures/packed-distribution/app/src/runtime-surfaces/schema-positive-control.tsx` | Call `decodeExternalTokenTheme` so the canary detector has a positive control. |
| `scripts/metro-tree-shaking-contract.ts` | Read emitted JavaScript bundle files and assert the paired canary result. |
| `packages/css/test/metro-tree-shaking-contract.test.ts` | Prove the canary rejects false absence/presence results and ignores source maps. |
| `scripts/playground-distribution.ts` | Add `--m8-3-check`, stage each entry surface, run iOS/web production exports, and write the receipt. |
| `packages/css/COMPATIBILITY.md`, `docs/src/content/docs/reference/compatibility.mdx`, `apps/playground/README.md` | Publish the M8.3 policy, supported evidence boundary, command, and receipt path. |
| `packages/css/test/compatibility-matrix.test.ts` | Guard the published M8.3 entrypoint and qualification claims. |
| `docs/evidence/2026-09-26-m8-3-runtime-resolution/qualification.json` | Retain package hash, resolved exports, graph classifications, toolchain, bundle inventories, and canary outcomes. |
| `docs/roadmap.md` | Mark M8.3 complete only after all gates pass; recommend M8.4 next. |
| `docs/superpowers/specs/2026-09-26-m8-3-runtime-resolution-design.md` | Change the written-spec status from review-pending to approved. |

---

### Task 1: Resolve and load every packed public export

**Files:**
- Create: `scripts/packed-export-contract.ts`
- Create: `packages/css/test/packed-export-contract.test.ts`
- Modify: `packages/css/test/pack-consumer-contract.test.ts`

**Interfaces:** Export `collectPackedExportTargets(exports: Readonly<Record<string, unknown>>): ReadonlyArray<PackedExportTarget>` and `verifyPackedExportMap(packageRoot: string, consumerRoot: string): Promise<ReadonlyArray<PackedExportResolution>>` from `scripts/packed-export-contract.ts`. A target records its subpath, condition path, and target file; a resolution records the selected ESM, CommonJS, and types targets for use by both tests and the M8.3 receipt.

- [ ] **Step 1: Add failing packed export assertions**

Test nested conditional export flattening, rejection of targets outside the packed package, and target-file existence. For each manifest target, assert its resolved path is a regular file inside the installed package root. From the isolated consumer, compare Node's `import.meta.resolve` and `createRequire().resolve` results with the manifest's import and require conditions. Load each executable public path in both formats; separately read `./package.json`. Assert the package has no Effect peer dependency, and assert the running Node version is at least `22.0.0`.

Add ESM and CommonJS functional probes for `@opsydyn/crumbs-css/tokens/schema`: call `decodeTokenValue` with a valid color value and `decodeExternalTokenTheme` with a valid version-1 payload. Extend the existing consumer type source so both functions and the exported schema types resolve from the packed declaration graph in both Node16 and Bundler modes. Link the declared Effect dependency into this extracted-tarball type fixture only if the emitted declarations require it; its presence in the fixture must not grant it admission in a runtime graph.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `bun test packages/css/test/packed-export-contract.test.ts packages/css/test/pack-consumer-contract.test.ts`

Expected: FAIL because the packed-export helper and schema/export assertions are not yet present or satisfied.

- [ ] **Step 3: Implement the manifest-driven probes and verify them**

Keep the test based on the installed packed artifact. Include every export declared in the packed manifest, including `./dist/theme`, `./dist/metro-plugin`, and `./package.json`. Preserve the existing Node16 and Bundler checks and run:

Run: `bun test packages/css/test/packed-export-contract.test.ts packages/css/test/pack-consumer-contract.test.ts`

Expected: PASS for target existence, correct import/require conditions, runtime loads, schema decodes, and both declaration modes.

- [ ] **Step 4: Commit Task 1**

```sh
git add scripts/packed-export-contract.ts packages/css/test/packed-export-contract.test.ts packages/css/test/pack-consumer-contract.test.ts
git commit -m "test: qualify packed public exports"
```

### Task 2: Audit packed dependency graphs by entrypoint class

**Files:**
- Create: `scripts/packed-runtime-graph.ts`
- Create: `packages/css/test/packed-runtime-graph.test.ts`

**Interfaces:** Export `auditPackedRuntimeEntrypoints(packageRoot: string): Promise<ReadonlyArray<PackedRuntimeGraph>>`. Each result records `subpath`, module format, visited files, and external specifiers. Classify exports as ordinary runtime (`./theme`, `./theme/core`, `./dist/theme`, `./tokens`), advanced runtime (`./tokens/schema`, `./tokens/optic`), compiler tooling, or package metadata. Fail if any manifest export is unclassified.

- [ ] **Step 1: Add failing graph fixtures**

Test local ESM imports, re-exports, literal dynamic imports, and CommonJS requires; verify missing local files fail. Add cases where a non-literal `import()` or `require()` fails closed. Assert ordinary theme entries permit only React, `./tokens` permits no external imports, advanced entries permit no external imports (Effect must be bundled), and ordinary closures cannot reach either advanced entry target. Compiler entries admit only external dependencies covered by `compilerDependencies.neverBundle` and not `alwaysBundle` in `packages/css/build-policy.ts`.

- [ ] **Step 2: Run the graph tests and verify they fail**

Run: `bun test packages/css/test/packed-runtime-graph.test.ts`

Expected: FAIL because the auditor and its dependency-class rules do not exist.

- [ ] **Step 3: Implement AST-based graph traversal and verify it**

Parse emitted JavaScript with the repository's TypeScript parser, traverse each manifest-selected ESM and CommonJS entry, follow local files, and classify every bare specifier. Keep dynamic-loader exceptions empty unless the audit demonstrates a compiler entry that needs one; any exception must document the exact entry, specifier, and rationale next to the allowlist and have a regression test.

Run: `bun test packages/css/test/packed-runtime-graph.test.ts`

Expected: PASS with no missing local edges, unclassified exports, unauthorized external imports, or unapproved dynamic loaders.

- [ ] **Step 4: Commit Task 2**

```sh
git add scripts/packed-runtime-graph.ts packages/css/test/packed-runtime-graph.test.ts
git commit -m "test: audit packed runtime dependency graphs"
```

### Task 3: Prove production Metro tree shaking with paired surfaces

**Files:**
- Create: `packages/css/fixtures/packed-distribution/app/src/runtime-surfaces/ordinary.tsx`
- Create: `packages/css/fixtures/packed-distribution/app/src/runtime-surfaces/schema-decoder.tsx`
- Create: `packages/css/fixtures/packed-distribution/app/src/runtime-surfaces/schema-positive-control.tsx`
- Create: `scripts/metro-tree-shaking-contract.ts`
- Test: `packages/css/test/metro-tree-shaking-contract.test.ts`
- Modify: `scripts/playground-distribution.ts`

**Interfaces:** Export `verifyTreeShakingCanary(decoderBundles: ReadonlyArray<Readonly<{platform: "ios" | "web"; path: string; javascript: string}>>, positiveControlBundles: ReadonlyArray<Readonly<{platform: "ios" | "web"; path: string; javascript: string}>>, canary: string): Readonly<{decoder: ReadonlyArray<"ios" | "web">; positiveControl: ReadonlyArray<"ios" | "web">}>`. Accept only generated JavaScript bundle paths (for example `.js` or `.jsbundle`), fail if either platform is absent, if decoder JavaScript contains the canary, or if positive-control JavaScript omits it, and ignore/reject `.map` paths.

- [ ] **Step 1: Add failing canary helper tests**

Assert decoder-only iOS and web bundles omit `external-token-theme` and positive-control iOS and web bundles retain it. Assert the helper fails when a decoder bundle retains the literal, when a positive-control bundle omits it, when either platform is absent, and when only a source map contains the literal.

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `bun test packages/css/test/metro-tree-shaking-contract.test.ts`

Expected: FAIL because the canary helper and runtime-surface fixtures do not exist.

- [ ] **Step 3: Implement the surfaces and canary check**

The ordinary surface calls APIs imported only from `theme/core` and `tokens`; the decoder surface imports and calls only `decodeTokenValue`; the positive control imports and calls `decodeExternalTokenTheme`. In the staged consumer copy, point `index.js` at one surface at a time and export each surface for iOS and web into separate output directories.

Run Expo production export with source maps and bytecode disabled for JavaScript inspection. Set `EXPO_UNSTABLE_METRO_OPTIMIZE_GRAPH=1` and `EXPO_UNSTABLE_TREE_SHAKING=1` explicitly. Expo documents tree shaking as production-only and limited to ESM `import`/`export` modules ([tree-shaking guidance](https://docs.expo.dev/guides/tree-shaking/)).

Before exporting, call `verifyPackedExportMap` and `auditPackedRuntimeEntrypoints` on the installed Crumbs package and include both results in the receipt. Use source-map inventories to prove each surface resolves the installed packed ESM target: ordinary includes `theme-core.mjs` and `tokens.mjs`; decoder surfaces include `tokens-schema.mjs`. Reject Effect, advanced schema/optic, compiler, Node built-in, or repository sources from ordinary inventories; reject compiler, Node built-in, or repository sources from decoder inventories. Scan every generated JavaScript bundle directly for the paired canary; do not inspect `.map` files for canary results.

- [ ] **Step 4: Run focused checks and the new packed qualification mode**

Run: `bun test packages/css/test/metro-tree-shaking-contract.test.ts packages/css/test/packed-runtime-graph.test.ts packages/css/test/pack-consumer-contract.test.ts`

Run: `bun run playground:distribution --m8-3-check`

Expected: all packed exports and graph classes pass; iOS and web production exports exist for all three surfaces; ordinary and decoder source inventories use the installed packed ESM targets; the decoder-only bundles omit the literal and positive controls retain it.

- [ ] **Step 5: Commit Task 3**

```sh
git add packages/css/fixtures/packed-distribution/app/src/runtime-surfaces scripts/metro-tree-shaking-contract.ts packages/css/test/metro-tree-shaking-contract.test.ts scripts/playground-distribution.ts
git commit -m "test: prove Metro decoder tree shaking"
```

### Task 4: Publish the M8.3 compatibility policy

**Files:**
- Modify: `packages/css/COMPATIBILITY.md`
- Modify: `docs/src/content/docs/reference/compatibility.mdx`
- Modify: `apps/playground/README.md`
- Modify: `packages/css/test/compatibility-matrix.test.ts`

- [ ] **Step 1: Add failing M8.3 policy assertions**

Extend the compatibility test to require the M8.3 entrypoint classes, Effect boundary, Node floor, Expo/React Native/React row, iOS/web-only status, Android/device/publishing deferrals, `--m8-3-check` command, and receipt path. Require an explicit pending qualification state until Task 5 passes.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `bun test packages/css/test/compatibility-matrix.test.ts`

Expected: FAIL because the M8.3 policy and qualification link are not documented yet.

- [ ] **Step 3: Publish the pending policy**

Document the qualified entrypoint contract and state that the exact M8.3 resolution/tree-shaking row is pending its receipt. Link the package matrix from the public reference and add the command and receipt path to the playground README. Preserve the existing M8.1/M8.2 rows and Android/device/publishing boundaries.

Run: `bun test packages/css/test/compatibility-matrix.test.ts`

Expected: PASS with M8.3 clearly pending and no new compatibility claim.

- [ ] **Step 4: Commit Task 4**

```sh
git add packages/css/COMPATIBILITY.md docs/src/content/docs/reference/compatibility.mdx apps/playground/README.md packages/css/test/compatibility-matrix.test.ts
git commit -m "docs: document M8.3 runtime resolution policy"
```

### Task 5: Qualify, retain evidence, and close M8.3

**Files:**
- Modify: `packages/css/COMPATIBILITY.md`
- Modify: `packages/css/test/compatibility-matrix.test.ts`
- Create: `docs/evidence/2026-09-26-m8-3-runtime-resolution/qualification.json`
- Modify: `docs/roadmap.md`

- [ ] **Step 1: Run packed qualification from the clean Task 4 commit**

Run: `bun run playground:distribution --m8-3-check`

Expected: the packed qualification records the tarball hash, resolved ESM/CommonJS/types targets, runtime dependency classes, Node/Bun/npm and installed dependency versions, tree-shaking flags, iOS/web source inventories, and decoder/positive-control canary outcomes. The receipt's source snapshot is clean before the receipt is written.

- [ ] **Step 2: Validate evidence, publish the result, and close the roadmap item**

Inspect the receipt. Require every manifest export target and condition, both advanced runtime graphs, all six platform/surface exports, packed-source inventories, no forbidden ordinary/decoder graph sources, decoder canary absence, positive-control canary presence, exact dependency versions, and Android marked `not-run`. If any gate fails, do not mark M8.3 complete; fix the owning task and repeat qualification.

Only after the receipt and all gates pass, change the matrix from pending to qualified, retain the receipt link, and mark M8.3 `[x]` in `docs/roadmap.md` with M8.4 recommended next. Update the compatibility test to require the qualified state, then run `bun run check`, `bun run docs:build`, and `git diff --check` against the final documentation.

- [ ] **Step 3: Commit Task 5**

```sh
git add packages/css/COMPATIBILITY.md packages/css/test/compatibility-matrix.test.ts docs/evidence/2026-09-26-m8-3-runtime-resolution/qualification.json docs/roadmap.md
git commit -m "docs: complete M8.3 runtime qualification"
```
