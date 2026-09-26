# M8.2 Compiler, Artifact, and Runtime Compatibility Matrix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish and qualify the exact Crumbs compiler/artifact/runtime combinations that support separately packed token and component packages.

**Architecture:** Preserve the M8.1 three-tarball Expo qualification and add a distinct M8.2 mode that installs a second physical copy of the same Crumbs tarball beneath the packed UI package. A Node React render harness will asynchronously load a small UI consumer through that nested copy, verify token provider identity and unsupported-version handling, and write a separate receipt.

**Tech Stack:** TypeScript, Bun tests, Node ESM, React 19.2.5, React DOM server renderer, npm-packed tarballs, Expo SDK 56, React Native 0.85, Metro source maps.

**Spec:** `docs/superpowers/specs/2026-09-26-m8-2-compatibility-matrix-design.md`

## Global Constraints

- Initial Crumbs compiler/runtime pair: `@opsydyn/crumbs-css@0.1.1-alpha.1`; consumer packages: `@acme/design-tokens@1.0.0` and `@acme/ui@1.0.0`.
- Qualified host row: Expo `56.0.4`, React `19.2.5`, React Native `0.85.3`; packed iOS and web JavaScript exports.
- Duplicate-copy sharing is limited to one JavaScript realm, matching identified contract identity and shape, and one React instance.
- Unknown versioned runtime inputs fail explicitly; `NativeArtifact` v1 and Native IR v1 remain internal, not published ABIs.
- Effect remains an implementation dependency, not an application peer or render API.
- Preserve M8.1 `--check` behavior and receipt; M8.2 uses a separate mode and receipt.
- Keep Android/device acceptance parked; M8.3–M8.6 remain separate roadmap items.
- Do not publish packages, alter release automation, broaden SDK support, or modify `.release-please-manifest.json`, `bun.lock`, or `packages/css/package.json`.
- Commit each task as its own slice and keep unrelated changes unstaged.

## Review Focus

- A nested package path resolving through a symlink or to the same physical copy must fail: Task 1 contract tests.
- The nested Crumbs copy resolving a second React package must fail before rendering: Task 3 compares React real paths.
- A lazy module using the nested Crumbs copy must read the provider's identified token value: Task 2 streamed render assertion.
- Distinct contract identities must keep values isolated, while reusing an identity with a different shape fails: Task 2 identity probe plus existing identity tests.
- Future recipe, extension, Sprinkles, dependency-plan, and external-theme versions must not fall through to current readers: Task 2 negative probes and the focused runtime suites.

## File Map

| File | Responsibility |
| --- | --- |
| `scripts/packed-distribution-contract.ts` | Verify exact direct and nested artifacts at distinct regular package paths. |
| `scripts/playground-distribution.ts` | Preserve M8.1 mode; add nested installation, React-resolution checks, M8.2 probes, exports, and receipt. |
| `packages/css/test/packed-distribution-contract.test.ts` | Pin direct/nested package admission, identity, and symlink behavior. |
| `packages/css/fixtures/packed-distribution/ui/src/ThemeTokenProbe.tsx` | Precompiled lazy consumer using `useTokenTheme` from its Crumbs dependency. |
| `packages/css/fixtures/packed-distribution/ui/package.json` | Expose the probe on a dedicated package subpath. |
| `packages/css/fixtures/packed-distribution/app/verify-m8-2-compatibility.mjs` | Render the lazy probe and check public runtime version/identity boundaries. |
| `packages/css/test/compatibility-matrix.test.ts` | Guard the published compatibility table and its public documentation link. |
| `packages/css/COMPATIBILITY.md`, `docs/src/content/docs/reference/compatibility.mdx` | Publish the package matrix and public reference. |
| `apps/playground/README.md` | Document the reproducible M8.2 command. |
| `docs/evidence/2026-09-26-m8-2-compatibility-matrix/qualification.json` | Retain artifact hashes, physical paths, React resolution, protocol probes, host versions, and bundle results. |
| `docs/roadmap.md` | Mark M8.2 complete only after final evidence and gates pass. |

---

### Task 1: Verify distinct direct and nested installations

**Files:**
- Modify: `scripts/packed-distribution-contract.ts`
- Test: `packages/css/test/packed-distribution-contract.test.ts`

**Interfaces:** `verifyDistinctInstalledArtifactCopies(directConsumerRoot: string, nestedConsumerRoot: string, expected: PackageIdentity): Promise<Readonly<{direct: InstalledPackage; nested: InstalledPackage}>>`. Both results use existing package identity and non-symlink checks; canonical package roots must differ.

- [ ] **Step 1: Add failing helper tests**

Create regular direct and nested package fixtures with the same expected identity. Assert the helper returns both real paths and they differ. Assert the same package root cannot qualify twice and a nested symlink is rejected.

- [ ] **Step 2: Run the focused tests and verify they fail**

Run:
`bun test packages/css/test/packed-distribution-contract.test.ts`
Expected: the new helper import/call fails because the export is absent.

- [ ] **Step 3: Implement and verify the helper**

Call `verifyInstalledArtifact` for both roots, compare `packageRoot`, and report the package identity and paths if they are equal. Re-run `bun test packages/css/test/packed-distribution-contract.test.ts`; all existing and new direct/nested cases must pass.

- [ ] **Step 4: Commit Task 1**

~~~sh
git add scripts/packed-distribution-contract.ts packages/css/test/packed-distribution-contract.test.ts
git commit -m "test: verify distinct packed runtime copies"
~~~

---

### Task 2: Add a lazy consumer and packed runtime probe

**Files:**
- Create: `packages/css/fixtures/packed-distribution/ui/src/ThemeTokenProbe.tsx`
- Modify: `packages/css/fixtures/packed-distribution/ui/package.json`
- Create: `packages/css/fixtures/packed-distribution/app/verify-m8-2-compatibility.mjs`

**Interfaces:** `@acme/ui/theme-probe` default-exports a component that reads `vars` through `useTokenTheme` and renders `color.accent` in a `span`. The `.mjs` probe exits zero only when the expected lazy output and version/identity assertions pass.

- [ ] **Step 1: Create the UI probe and M8.2 render harness**

Expose `./theme-probe` with type, `react-native`, `import`, and `default` conditions. In the harness, dynamically import it through `React.lazy` and use `renderToPipeableStream` beneath the app's `TokenThemeProvider`. Assert the output contains `#2457d6`. Check the app and UI Crumbs resolutions are distinct and that both resolve the same React real path. Include a second identified contract/provider and assert the two rendered values stay distinct; recreate the token package identity with a different shape and assert the established collision error.

In the same harness, pass future versions to the packed public boundaries: component recipe v4, extension v2, Sprinkles plan v2, theme dependency plan v2, and external token theme v2. Each must be rejected. Use valid current inputs as the starting points and change only the version field.

- [ ] **Step 2: Run the harness against the current prepared app and verify the copy check fails**

Run `bun run playground:distribution --prepare-only`, use its printed `consumerRoot`, then run `node verify-m8-2-compatibility.mjs` from that directory. Expected: the harness fails because npm has deduplicated the direct and UI Crumbs resolutions to one path; it must stop before reporting a lazy-provider pass.

- [ ] **Step 3: Commit Task 2**

~~~sh
git add packages/css/fixtures/packed-distribution/ui/src/ThemeTokenProbe.tsx packages/css/fixtures/packed-distribution/ui/package.json packages/css/fixtures/packed-distribution/app/verify-m8-2-compatibility.mjs
git commit -m "test: add packed lazy theme consumer probe"
~~~

---

### Task 3: Add the M8.2 packed qualification mode

**Files:**
- Modify: `scripts/playground-distribution.ts`
- Verify: `docs/evidence/2026-09-26-m8-2-compatibility-matrix/qualification.json`

- [ ] **Step 1: Add the `--m8-2-check` mode**

Keep `--check` and its M8.1 receipt unchanged. In the new mode, unpack the same Crumbs tarball beneath the installed `@acme/ui/node_modules`, verify the direct/nested copies with `verifyDistinctInstalledArtifactCopies`, and fail unless `createRequire` from both Crumbs roots resolves React to the same real path.

- [ ] **Step 2: Run the packed runtime probe and capture compiler metadata**

Run `node verify-m8-2-compatibility.mjs` from the staged app. Inspect the packed `ActionCard.styles.native.js` output and require `__crumbsModule` v2 with dependency plan v1. Retain probe results, both Crumbs paths, their shared tarball SHA-256, the single React path, and diagnostics in the M8.2 receipt.

- [ ] **Step 3: Run the M8.2 packed Expo check**

Run:

~~~sh
bun test packages/css/test/component-recipe-theme.test.ts packages/css/test/component-recipe-extension.test.ts packages/css/test/component-recipe-resolution-plan.test.ts packages/css/test/sprinkles.test.ts packages/css/test/theme-dependency-plan.test.ts packages/css/test/token-theme-external.test.ts packages/css/test/token-contract-identity.property.test.ts
bun run playground:distribution --m8-2-check
~~~

Expected: focused current-version and identity suites pass; the packed app typecheck and runtime probes pass; iOS and web exports pass the existing source-map inventory; the new M8.2 receipt is separate from M8.1.

- [ ] **Step 4: Commit Task 3**

~~~sh
git add scripts/playground-distribution.ts docs/evidence/2026-09-26-m8-2-compatibility-matrix/qualification.json
git commit -m "test: qualify lazy themes across packed copies"
~~~

---

### Task 4: Publish the compatibility policy

**Files:**
- Modify: `packages/css/COMPATIBILITY.md`
- Modify: `docs/src/content/docs/reference/compatibility.mdx`
- Modify: `apps/playground/README.md`
- Create: `packages/css/test/compatibility-matrix.test.ts`

- [ ] **Step 1: Add failing documentation checks**

Assert the package matrix lists the exact package/host row, recipe v1–v3, extension v1, Sprinkles v1, native-module metadata v2/dependency plan v1, external theme v1, all four evidence states, and the internal-only NativeArtifact/Native IR boundary. Assert the public reference links to `COMPATIBILITY.md` and the playground README documents `--m8-2-check` and its separate receipt.

- [ ] **Step 2: Run the new test and verify it fails**

Run:
`bun test packages/css/test/compatibility-matrix.test.ts`
Expected: the matrix, evidence labels, or M8.2 command link is missing.

- [ ] **Step 3: Update compatibility documentation**

Publish the exact qualified package row and artifact statuses in `packages/css/COMPATIBILITY.md`; link the public reference page and document the command/receipt in `apps/playground/README.md`. Keep the M8.1 host limits and Android/device deferral.

- [ ] **Step 4: Verify and commit Task 4**

Run `bun test packages/css/test/compatibility-matrix.test.ts packages/css/test/expo-sdk-56-contract.test.ts`, `bun run docs:build`, and `git diff --check`. Commit only after they pass; do not mark M8.2 complete in this task.

~~~sh
git add packages/css/COMPATIBILITY.md docs/src/content/docs/reference/compatibility.mdx apps/playground/README.md packages/css/test/compatibility-matrix.test.ts
git commit -m "docs: publish M8.2 compatibility policy"
~~~

---

### Task 5: Run final gates and close M8.2

**Files:**
- Modify: `docs/roadmap.md`
- Verify/update: `docs/evidence/2026-09-26-m8-2-compatibility-matrix/qualification.json`

- [ ] **Step 1: Run final gates from the clean committed state**

Run `bun run check`, `bun run docs:build`, and `bun run playground:distribution --m8-2-check`. The packed command must run with no pre-existing worktree changes so its receipt records the current committed source revision as clean.

- [ ] **Step 2: Validate the final receipt and mark M8.2 complete**

Verify the receipt records two distinct Crumbs paths, one React real path, the expected package/artifact versions, lazy render value, rejected future versions, iOS/web inventories, and `dirty: false`. Only then mark M8.2 `[x]` in `docs/roadmap.md`; leave M8.3 as the next roadmap item.

- [ ] **Step 3: Commit Task 5**

~~~sh
git add docs/roadmap.md docs/evidence/2026-09-26-m8-2-compatibility-matrix/qualification.json
git commit -m "docs: complete M8.2 compatibility qualification"
~~~
