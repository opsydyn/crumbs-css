# M8.1 Separately Packed Token and Component Consumers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox ([ ]) syntax for tracking.

**Goal:** Qualify separately packed token and component packages with a packed Crumbs artifact in a staged Expo app that resolves no workspace or unpublished source-tree files.

**Architecture:** Keep @opsydyn/crumbs-css as one library distribution. Build private @acme/design-tokens and @acme/ui fixture tarballs against the packed Crumbs artifact, precompile the component styles for iOS and web, then install all three tarballs into an Expo project staged outside the monorepo. Small contract helpers enforce artifact identity, installed-path, packed-file, and bundle-source boundaries; the integration runner records the qualification.

**Tech Stack:** Bun, TypeScript, npm pack/install, Crumbs transformer, Expo SDK 56, React Native 0.85.3, Metro source maps, fast local filesystem fixtures.

**Spec:** docs/superpowers/specs/2026-09-26-m8-1-packed-design-system-packages-design.md

## Global Constraints

- This slice does not split @opsydyn/crumbs-css into new first-party token and component packages.
- Use the current Expo SDK 56 / React Native 0.85.3 baseline. Do not upgrade that baseline in this slice.
- Generate native and web style modules from the same authored component style input, using the existing compiler's native StyleSheet output for iOS and object output for web.
- The installed component artifact must not require its unpublished .css.ts source.
- App package dependencies refer to the local tarballs for this run; package-to-package dependencies use declared semver ranges satisfied by the installed tarballs.
- Resolve installed package paths under the staged app's node_modules; reject symlinks, workspace: or link: dependencies, and real paths into the repository.
- Do not publish any package, change registry tags, or decide release automation.
- Do not add Effect dependencies to consumer packages; the fixture uses ordinary token APIs and excludes the schema/optic subpaths.
- Export and qualify iOS and web only. No Android export or device acceptance is required by this slice.
- Do not claim device, screen-reader, visual, or performance-budget acceptance.

## Review Focus

- Wrong package name/version or a missing packed artifact must stop before installation; pin with `verifyInstalledArtifact rejects a version mismatch` and `verifyInstalledArtifact rejects a missing package`.
- A package that resolves through a workspace/link dependency or symlink into the checkout must fail; pin with `assertNoWorkspaceOrLinkDependencies rejects workspace and link protocols` and `verifyInstalledArtifact rejects a package symlink resolving outside node_modules`.
- A component tarball missing either platform style module or declarations, or containing authored .css.ts source, must fail; pin with `assertPrecompiledComponentFiles requires native, web, and declaration outputs` and `assertPrecompiledComponentFiles rejects authored stylesheet sources`.
- A valid onActionPress prop must typecheck while a deliberately unsupported prop must fail typechecking; pin with `src/public-props.typecheck.ts`.
- Missing iOS/web source maps, a map that points into the worktree, or a map without the installed token/UI/Crumbs modules must fail; pin with `verifyExpoBundleInventory requires both iOS and web maps`, `verifyExpoBundleInventory rejects a worktree source`, and `verifyExpoBundleInventory requires all packed packages`.

## File Map

- Create packages/css/fixtures/packed-distribution/tokens/package.json, tsconfig.json, and src/index.ts for a private, versioned design-token package using the public Crumbs tokens entrypoint.
- Create packages/css/fixtures/packed-distribution/ui/package.json, tsconfig.json, build.ts, src/ActionCard.css.ts, src/ActionCard.tsx, and src/index.ts for a typed action component whose style source is build-only.
- Create packages/css/fixtures/packed-distribution/app/package.json, app.json, index.js, babel.config.js, metro.config.js, tsconfig.json, and src/App.tsx for the isolated Expo consumer. Its Metro config must not install the Crumbs transformer.
- Create scripts/packed-distribution-contract.ts for pure fail-closed artifact and bundle inventory checks.
- Create scripts/packed-distribution-build.ts for building and packing Crumbs, token, and UI artifacts from temporary copies.
- Create scripts/playground-distribution.ts for staging/installing the app, invoking TypeScript/Expo checks, and retaining run identity.
- Create packages/css/test/packed-distribution-contract.test.ts for focused boundary and negative tests.
- Modify package.json to add playground:distribution.
- Modify apps/playground/README.md to document the separate packed-design-system qualification.
- Create docs/assessments/2026-09-26-m8-1-packed-design-system.md and docs/evidence/2026-09-26-m8-1-packed-design-system/qualification.json after running the qualification.
- Modify docs/roadmap.md only after the acceptance checks pass; link the assessment and recommend M8.2.

---

### Task 1: Add artifact identity and path guards

**Files:**
- Create: scripts/packed-distribution-contract.ts
- Create: packages/css/test/packed-distribution-contract.test.ts
- Modify: docs/superpowers/specs/2026-09-26-m8-1-packed-design-system-packages-design.md
- Create: docs/superpowers/plans/2026-09-26-m8-1-packed-design-system-packages.md
- Include in the first implementation commit: the approved M8.1 spec and this plan

**Interfaces:**
- Produces PackageIdentity = Readonly<{name: string; version: string}>.
- Produces PackageManifest = Readonly<{dependencies?: Readonly<Record<string, string>>; optionalDependencies?: Readonly<Record<string, string>>; peerDependencies?: Readonly<Record<string, string>>}>.
- Produces InstalledPackage = PackageIdentity & Readonly<{entryPath: string; packageRoot: string}>.
- Produces assertNoWorkspaceOrLinkDependencies(manifest: PackageManifest): void, inspecting dependencies, optionalDependencies, and peerDependencies.
- Produces verifyInstalledArtifact(consumerRoot: string, expected: PackageIdentity): Promise<InstalledPackage>. Resolve the package entry through a createRequire rooted at the consumer manifest; ascend from its canonical entry path to the nearest package.json whose name matches, so package exports need not expose package.json. Compare exact name/version, canonicalize paths, and require packageRoot to remain below the consumer node_modules directory.

- [ ] **Step 1: Write failing identity and dependency-boundary tests**

Add these tests to packed-distribution-contract.test.ts:

~~~ts
test("verifyInstalledArtifact accepts the expected package under consumer node_modules", async () => {
  const installed = await verifyInstalledArtifact(consumerRoot, {
    name: "@acme/design-tokens",
    version: "1.0.0",
  })
  expect(installed.packageRoot.startsWith(await realpath(join(consumerRoot, "node_modules")))).toBe(true)
})

test("verifyInstalledArtifact rejects a missing package", async () => {
  await expect(verifyInstalledArtifact(consumerRoot, {
    name: "@acme/missing",
    version: "1.0.0",
  })).rejects.toThrow(/@acme\/missing.*not found|cannot resolve/i)
})

test("verifyInstalledArtifact rejects a version mismatch", async () => {
  await expect(verifyInstalledArtifact(consumerRoot, {
    name: "@acme/design-tokens",
    version: "1.0.1",
  })).rejects.toThrow(/@acme\/design-tokens.*version/)
})

test("verifyInstalledArtifact rejects a package symlink resolving outside node_modules", async () => {
  await expect(verifyInstalledArtifact(consumerRoot, {
    name: "@acme/design-tokens",
    version: "1.0.0",
  })).rejects.toThrow(/@acme\/design-tokens.*node_modules/)
})

test("assertNoWorkspaceOrLinkDependencies rejects workspace and link protocols", () => {
  expect(() => assertNoWorkspaceOrLinkDependencies({
    dependencies: { "@acme/design-tokens": "workspace:*" },
    optionalDependencies: {},
    peerDependencies: { "@opsydyn/crumbs-css": "link:../crumbs-css" },
  })).toThrow(/workspace:|link:/)
})
~~~

Use temporary package manifests and a symlink target outside consumerRoot; do not read or mutate repository node_modules.

- [ ] **Step 2: Run the focused tests and confirm they fail**

Run: bun test packages/css/test/packed-distribution-contract.test.ts
Expected: FAIL because the contract module and exports do not exist.

- [ ] **Step 3: Implement the pure contract helpers**

Implement the types and functions in scripts/packed-distribution-contract.ts. Resolve installed packages through a consumer-rooted createRequire, canonicalize with realpath, and include the package identity and resolved path in boundary errors. Check each runtime dependency group for workspace: and link: protocols.

- [ ] **Step 4: Run the focused tests**

Run: bun test packages/css/test/packed-distribution-contract.test.ts
Expected: PASS for the in-bound package and deterministic rejection of a missing package, version mismatch, path escape, and workspace/link cases.

- [ ] **Step 5: Check and commit the artifact guard**

Run: git diff --check
Expected: no whitespace errors.

Before this commit, update the approved spec status to “Approved design; implementation in progress.”

Commit: git add scripts/packed-distribution-contract.ts packages/css/test/packed-distribution-contract.test.ts docs/superpowers/specs/2026-09-26-m8-1-packed-design-system-packages-design.md docs/superpowers/plans/2026-09-26-m8-1-packed-design-system-packages.md && git commit -m "feat: add packed distribution artifact guards"

After commit, recommend Task 2 as the next implementation slice.

---

### Task 2: Build and pack the separate token and component artifacts

**Files:**
- Create: packages/css/fixtures/packed-distribution/tokens/package.json
- Create: packages/css/fixtures/packed-distribution/tokens/tsconfig.json
- Create: packages/css/fixtures/packed-distribution/tokens/src/index.ts
- Create: packages/css/fixtures/packed-distribution/ui/package.json
- Create: packages/css/fixtures/packed-distribution/ui/tsconfig.json
- Create: packages/css/fixtures/packed-distribution/ui/build.ts
- Create: packages/css/fixtures/packed-distribution/ui/src/ActionCard.css.ts
- Create: packages/css/fixtures/packed-distribution/ui/src/ActionCard.tsx
- Create: packages/css/fixtures/packed-distribution/ui/src/index.ts
- Create: scripts/packed-distribution-build.ts
- Create: scripts/playground-distribution.ts with --artifacts-only support
- Modify: scripts/packed-distribution-contract.ts
- Modify: packages/css/test/packed-distribution-contract.test.ts
- Modify: package.json

**Interfaces:**
- Consumes verifyInstalledArtifact and assertNoWorkspaceOrLinkDependencies from Task 1.
- Produces PackedArtifact = Readonly<{name: string; version: string; tarball: string; sha256: string}>.
- Produces buildPackedDistributionArtifacts(repositoryRoot: string, tempParent?: string): Promise<Readonly<{buildRoot: string; crumbs: PackedArtifact; tokens: PackedArtifact; ui: PackedArtifact}>>.
- Produces assertPrecompiledComponentFiles(files: ReadonlyArray<string>): void. Require the ActionCard native/web style modules and declarations; reject authored .css.ts files, source maps for those inputs, and missing entrypoints.

- [ ] **Step 1: Write failing archive-contract tests**

Add these cases to packed-distribution-contract.test.ts:

~~~ts
test("assertPrecompiledComponentFiles requires native, web, and declaration outputs", () => {
  expect(() => assertPrecompiledComponentFiles([
    "package/dist/ActionCard.styles.native.js",
    "package/dist/ActionCard.styles.web.js",
    "package/dist/ActionCard.styles.d.ts",
    "package/dist/index.js",
  ])).not.toThrow()
  expect(() => assertPrecompiledComponentFiles([
    "package/dist/ActionCard.styles.native.js",
    "package/dist/ActionCard.styles.d.ts",
    "package/dist/index.js",
  ])).toThrow(/web.*style/i)
})

test("assertPrecompiledComponentFiles rejects authored stylesheet sources", () => {
  expect(() => assertPrecompiledComponentFiles([
    "package/dist/ActionCard.styles.native.js",
    "package/dist/ActionCard.styles.web.js",
    "package/dist/ActionCard.styles.d.ts",
    "package/src/ActionCard.css.ts",
  ])).toThrow(/\.css\.ts/)
})
~~~

- [ ] **Step 2: Run the focused tests and confirm they fail**

Run: bun test packages/css/test/packed-distribution-contract.test.ts
Expected: FAIL because assertPrecompiledComponentFiles is not implemented.

- [ ] **Step 3: Create the token package fixture**

Use owner identity @acme/design-tokens/Foundation/version 1 and a minimal color/space semantic token contract. Export a complete theme snapshot from the public @opsydyn/crumbs-css/tokens entrypoint. Emit JavaScript and declarations into dist; set the private package files/exports to dist and declare a semver dependency on @opsydyn/crumbs-css.

- [ ] **Step 4: Create the typed component fixture and package build**

Implement ActionCard with a required onActionPress callback, public disabled prop, TokenThemeProvider-compatible token references, and typed componentRecipe styles. In build.ts, use only installed tarballs: compile the .css.ts input to dist/ActionCard.styles.native.js with useStyleSheet enabled and dist/ActionCard.styles.web.js with useStyleSheet disabled; emit declarations and ordinary component JavaScript. Do not copy the .css.ts input into the package tarball. Declare runtime package dependencies/peers with normal semver ranges and set package files/exports to built output.

- [ ] **Step 5: Pack all three packages in temporary build sandboxes**

Implement buildPackedDistributionArtifacts in scripts/packed-distribution-build.ts. Build and npm-pack the current Crumbs package first. Copy the token fixture to a fresh temporary build directory, install the Crumbs tarball, build, and pack it. Copy the UI fixture to another temporary directory, install the Crumbs and token tarballs, build against the installed public transformer/runtime, and pack it. Record each package name, exact version, tarball real path, and SHA-256. Never install from a workspace directory or publish.

- [ ] **Step 6: Verify the package artifacts**

Run: bun run playground:distribution --artifacts-only
Expected: three independently packed artifacts are printed; the component tarball passes assertPrecompiledComponentFiles; all package identities and dependency manifests pass the Task 1 checks; the UI tarball contains compiled style modules and declarations but no .css.ts source.

Run: bun test packages/css/test/packed-distribution-contract.test.ts
Expected: PASS.

- [ ] **Step 7: Check and commit token/component packaging**

Run: git diff --check
Expected: no whitespace errors.

Commit: git add packages/css/fixtures/packed-distribution/tokens packages/css/fixtures/packed-distribution/ui scripts/packed-distribution-build.ts scripts/packed-distribution-contract.ts scripts/playground-distribution.ts packages/css/test/packed-distribution-contract.test.ts package.json && git commit -m "feat: pack independent token and component fixtures"

After commit, recommend Task 3 as the next implementation slice.

---

### Task 3: Qualify the independent Expo consumer

**Files:**
- Create: packages/css/fixtures/packed-distribution/app/package.json
- Create: packages/css/fixtures/packed-distribution/app/app.json
- Create: packages/css/fixtures/packed-distribution/app/index.js
- Create: packages/css/fixtures/packed-distribution/app/babel.config.js
- Create: packages/css/fixtures/packed-distribution/app/metro.config.js
- Create: packages/css/fixtures/packed-distribution/app/tsconfig.json
- Create: packages/css/fixtures/packed-distribution/app/src/App.tsx
- Create: packages/css/fixtures/packed-distribution/app/src/public-props.typecheck.ts
- Modify: scripts/playground-distribution.ts with --prepare-only and --check support
- Modify: scripts/packed-distribution-contract.ts
- Modify: packages/css/test/packed-distribution-contract.test.ts
- Modify: apps/playground/README.md
- Create: docs/assessments/2026-09-26-m8-1-packed-design-system.md
- Create: docs/evidence/2026-09-26-m8-1-packed-design-system/qualification.json
- Modify: docs/roadmap.md

**Interfaces:**
- Consumes buildPackedDistributionArtifacts from Task 2.
- Produces verifyExpoBundleInventory(targets: ReadonlyArray<Readonly<{platform: "ios" | "web"; directory: string}>>, consumerRoot: string, repositoryRoot: string, expectedPackages: ReadonlyArray<string>): Promise<ReadonlyArray<BundleInventory>>.
- BundleInventory contains platform, sourceMapFiles, and installed package sources observed in the maps. Require at least one map per requested platform, required token/UI/Crumbs package sources across the platform set, and no repository-root or .css.ts source paths.
- The runner supports --artifacts-only, --prepare-only, and --check. --prepare-only leaves the installed app and package artifact directory available and prints their real paths; --check additionally typechecks and exports iOS/web.

- [ ] **Step 1: Write failing Expo bundle inventory tests**

Add these cases to packed-distribution-contract.test.ts:

~~~ts
test("verifyExpoBundleInventory requires both iOS and web maps", async () => {
  await expect(verifyExpoBundleInventory(
    [{ platform: "ios", directory: iosBundleRoot }],
    consumerRoot,
    repositoryRoot,
    ["@opsydyn/crumbs-css", "@acme/design-tokens", "@acme/ui"],
  )).rejects.toThrow(/web.*source map/i)
})

test("verifyExpoBundleInventory rejects a worktree source", async () => {
  await expect(verifyExpoBundleInventory(
    bundleTargets,
    consumerRoot,
    repositoryRoot,
    ["@opsydyn/crumbs-css", "@acme/design-tokens", "@acme/ui"],
  )).rejects.toThrow(/repository|worktree/i)
})

test("verifyExpoBundleInventory requires all packed packages", async () => {
  await expect(verifyExpoBundleInventory(
    bundleTargetsMissingUi,
    consumerRoot,
    repositoryRoot,
    ["@opsydyn/crumbs-css", "@acme/design-tokens", "@acme/ui"],
  )).rejects.toThrow(/@acme\/ui/)
})
~~~

Use small temporary source-map fixtures. Assert that iOS and web maps include the expected package install paths, while no map includes the repository root or authored .css.ts source.

- [ ] **Step 2: Run the focused tests and confirm they fail**

Run: bun test packages/css/test/packed-distribution-contract.test.ts
Expected: FAIL because verifyExpoBundleInventory is not implemented.

- [ ] **Step 3: Implement the bundle inventory guard**

Add verifyExpoBundleInventory in scripts/packed-distribution-contract.ts. Walk only the supplied iOS/web output directories, parse regular and indexed source maps, canonicalize consumerRoot and repositoryRoot, and return the source-map counts and matched package source paths. Reject empty platform output, repository/source leakage, absent package evidence, or a map that cannot be decoded. Do not impose Android or the full M8.3 runtime dependency graph audit.

- [ ] **Step 4: Add the independent Expo fixture and distribution runner**

Build the app fixture around TokenThemeProvider, the packed token theme, and the packed ActionCard. Add the public-props type fixture with valid onActionPress usage and a @ts-expect-error case for an unsupported prop. Keep metro.config.js on Expo defaults; it must not import withNativeStyles.

Implement scripts/playground-distribution.ts to copy the fixture app into a fresh temporary directory, rewrite only the three app package specifications to local tarballs, run npm install, verify all three package identities/paths and dependency protocols, run TypeScript, then run Expo export separately for ios and web with source maps. Write a qualification record with tarball SHA-256 values, source revision and dirty status, resolved app versions, lockfile hash, installed real paths, bundle inventory, and results. Never delete the staged app or artifacts automatically.

- [ ] **Step 5: Run packed Expo qualification**

Run: bun run playground:distribution --check
Expected: packed install and app typecheck pass; Expo production exports pass for iOS and web; bundle maps include the installed Crumbs, token, and UI artifacts and exclude repository paths and authored .css.ts sources; no Android export runs.

- [ ] **Step 6: Run repository checks and write the assessment**

Run: bun test packages/css/test/packed-distribution-contract.test.ts
Expected: PASS.

Run: bun run check
Expected: package build, package typecheck, CSS tests, and Storybook tests pass.

Run: bun run app:typecheck
Expected: PASS.

Run: bun run docs:build
Expected: PASS.

Write docs/assessments/2026-09-26-m8-1-packed-design-system.md with the exact artifact identities, commands/results, and limitations. Store docs/evidence/2026-09-26-m8-1-packed-design-system/qualification.json from the verified runner receipt. Update apps/playground/README.md with the packed-design-system command and distinction from the single-Crumbs-tarball mode. Mark M8.1 complete in docs/roadmap.md only after all acceptance checks pass and add the M8.2 recommendation.

- [ ] **Step 7: Review, check, and commit M8.1**

Run: git diff --check
Expected: no whitespace errors.

Run: git status --short
Expected: only the planned M8.1 fixture, runner, tests, evidence, roadmap, and documentation paths are changed.

Commit: git add packages/css/fixtures/packed-distribution/app scripts/playground-distribution.ts scripts/packed-distribution-contract.ts packages/css/test/packed-distribution-contract.test.ts apps/playground/README.md docs/assessments/2026-09-26-m8-1-packed-design-system.md docs/evidence/2026-09-26-m8-1-packed-design-system/qualification.json docs/roadmap.md && git commit -m "test: qualify separately packed Expo design system"

Recommend M8.2 after this commit: publish compiler/artifact/runtime compatibility rules and test supported combinations, unsupported versions, duplicate copies, provider identity, and lazy-loaded modules.

---

## Plan self-review

- Spec coverage: Tasks 1–3 cover the private token/UI tarballs, packed Crumbs dependency, platform-precompiled styles, declarations, independent Expo install, fail-closed identity/path/source checks, iOS/web bundles, evidence, documentation, and roadmap completion. Publishing, package-family splitting, Android, device acceptance, and M8.2–M8.5 remain excluded.
- Step scan: each task begins with named failing tests, runs them red, adds one contract/build/integration boundary, runs the focused green gate, then commits.
- Type consistency: the three produced interfaces—PackageIdentity/InstalledPackage, PackedArtifact/PackedDistributionArtifacts, and BundleInventory—are consumed by the subsequent task without renaming.
- Review Focus: all five cases map to named assertions in Tasks 1–3.
- Proportion: the plan is organized around three sequential deliverables; token packing, UI precompilation, and Expo bundle proof each depend on the preceding artifact boundary.
