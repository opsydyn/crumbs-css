# M8.1 — Separately packed token and component consumers

**Status:** Approved design; implementation in progress.
**Governing decisions:** D3 (Effect boundaries), D5 (token identity), D11 (distribution and compatibility), and D12 (executable evidence) in the [design-system ADR](../../decisions/adopt-native-design-system-compiler.md).

## Intent

Prove that a design system can publish its tokens and components as separate packages, then consume those package artifacts from an independent Expo application alongside a packed Crumbs artifact. The Expo app must resolve the installed packages without workspace links or access to unpublished package sources.

This slice qualifies an application-facing package boundary. It does not split Crumbs itself into new first-party token and component packages. The current `@opsydyn/crumbs-css` package remains the Crumbs compiler, authoring, and runtime distribution.

## Current boundary and gap

The packed playground runner builds `@opsydyn/crumbs-css`, packs its tarball, and installs it into a newly staged Expo app outside the monorepo. The package test separately packs Crumbs and exercises token and component APIs. Its owner and brand packages are generated inside one consumer fixture, however, and the test links several dependencies from the repository installation. It does not install separately packed token and component tarballs into an Expo app or qualify their Metro resolution.

M7.4 also verifies the owner/brand authoring relationship. Its Node test loader adapts emitted `.css.ts` dependencies to test-generated `.css` files; that evidence is not a precompiled-package or Metro qualification. M8.1 adds the missing installed-artifact path.

## Goals

- Pack a consumer-owned token package and a component package as distinct versioned tarballs.
- Pack the current Crumbs working-tree build and install all three artifacts into a staged Expo consumer outside the workspace.
- Build the component package's Crumbs-authored styles before packing. Its installed package must contain platform-resolved JavaScript style artifacts and declarations, not require its unpublished `.css.ts` source.
- Exercise the token contract, component recipe, public component props, theme runtime, and Expo Metro production bundle through package exports.
- Retain package identities, artifact hashes, lockfile identity, and consumer results for reproduction.
- Fail clearly when an artifact is missing, resolves outside the staged installation, or requires a workspace or source-tree path.

## Non-goals

- Splitting `@opsydyn/crumbs-css` into new first-party npm packages or choosing permanent first-party package names.
- Publishing any package, changing registry tags, or deciding release automation.
- Establishing the M8.2 compatibility matrix, duplicate-version/provider behavior, or artifact migration rules.
- Completing the M8.3 ESM/CommonJS/tree-shaking/runtime dependency audit or the M8.4 hot-reload and invalidation qualification.
- Adding an Effect dependency to consumer packages or putting Effect values in component/render APIs. The fixture uses ordinary token APIs; dedicated schema/optic subpaths are outside this slice.
- Device, screen-reader, visual-acceptance, Android, or performance-budget claims. Android remains parked for the final native step.

## Considered alternatives

- Split Crumbs into first-party token and component npm packages now. That would commit package names, dependency direction, and release coupling before M8.2 establishes compatibility rules and M8.5 confirms publication policy. It adds migration risk without improving this consumer-boundary test, so it is deferred.
- Extend only the current single-package packed Expo check. It is smaller, but does not prove that separately versioned token and component artifacts work together, so it does not satisfy M8.1.
- Pack private consumer-owned token and component fixtures and install them with Crumbs in an independent Expo app. This verifies the architecture named by ADR D11 while keeping first-party package ownership and release policy unchanged. The tradeoff is a dedicated fixture build flow, which this milestone will retain as executable evidence.

## Chosen package topology

Use private, repository-owned fixtures to represent separately versioned consumer packages. Fixture names such as `@acme/design-tokens` and `@acme/ui` are test identities only; they are not proposed publication names.

| Artifact | Responsibility | Installed by |
| --- | --- | --- |
| `@opsydyn/crumbs-css` tarball | Current built Crumbs public APIs and runtime | Component build sandbox and Expo app |
| `@acme/design-tokens` tarball | A stable-identity token contract, a small semantic token set, and a theme value/snapshot | Component build sandbox and Expo app |
| `@acme/ui` tarball | A typed reference component and its compiled style modules/declarations; depends on the token package and Crumbs runtime | Expo app |
| Independent Expo app | Imports the token package and component package, provides the identified token theme, and exercises a component callback | Temporary directory outside the repository |

The component package uses public Crumbs authoring and runtime entrypoints. Its isolated build may use the packed Crumbs artifact's exported transformer subpath as a build-only tool; the installed component must not import the transformer at runtime. Component styles may be authored in `.css.ts` during package build, but the packed artifact must expose the built JavaScript and declaration surface needed by Metro and TypeScript. Generate native and web style modules from the same authored component style input, using the existing compiler's native `StyleSheet` output for iOS and object output for web. The component package's public wrapper may remain ordinary package JavaScript; it must not import the style source or the Crumbs transformer at runtime.

The reference component should be intentionally small: a typed action component with an `onActionPress` callback, one or more token-backed styles, and a public disabled state. Its purpose is to verify package types and runtime resolution. M7.5 remains the owner of the broader shared visual/accessibility state contract; M8.1 does not reimplement that work.

## Build and consumption flow

1. Build the current `@opsydyn/crumbs-css` sources and create a local npm tarball. Record its package name, version, source revision, and SHA-256.
2. Stage the token package in a fresh temporary build sandbox. Install the Crumbs tarball, build the token package JavaScript and declarations against that installed artifact, and pack the token output. Record its package name, version, and SHA-256.
3. Stage a separate component-package build sandbox under a fresh temporary directory. Install the Crumbs and token tarballs there, with no workspace resolution. Build the component package against those installed artifacts, emit its platform style modules and declarations, and pack the component output.
4. Stage the independent Expo app under a separate fresh temporary directory. Install the Crumbs, token, and component tarballs plus app dependencies at the current Expo SDK 56 / React Native 0.85.3 baseline. Do not upgrade that baseline in this slice. App package dependencies refer to the local tarballs for this run; package-to-package dependencies use declared semver ranges satisfied by the installed tarballs.
5. Verify the installed package names and versions against the packed manifests. Resolve package entrypoints from the staged app and require every installed package path to remain under its `node_modules`; reject symlinks, `workspace:` or `link:` dependencies, and real paths into the repository.
6. Typecheck the staged app against installed declarations. Export production JavaScript bundles for iOS and web from the staged app with source maps and inspect the resulting module/source-map inventory for package resolution and source-tree leakage.
7. Write a qualification record under docs/evidence/2026-09-26-m8-1-packed-design-system/ containing the three tarball names and hashes, exact versions, Git revision/dirty status, Expo/RN versions, lockfile hash, installed real paths, typecheck/export results, and any diagnostics. Keep the temporary directories available for manual reproduction until the user chooses to clean them up.

Use the existing packed-consumer workflow and artifact identity conventions where they fit. Keep this qualification separate from the ordinary workspace playground path so a green workspace run cannot be mistaken for packed-package evidence.

## Artifact and runtime contract

- The token package exports a normal TypeScript/JavaScript API built on `@opsydyn/crumbs-css/tokens`. It does not require `tokens/schema`, `tokens/optic`, compiler code, or repository-relative paths for the Expo use case.
- The component package's `.css.ts` sources are build inputs only. The tarball contains the compiled `.native.js` and `.web.js` style modules, declaration files, package entrypoints, and any ordinary component runtime code required by the app. It excludes authored `.css.ts` files and source maps that point to them.
- The app imports the public component and token package exports and provides the token package theme through TokenThemeProvider from the Crumbs theme runtime. It does not configure Crumbs Metro transformation for the precompiled package path and does not import `@opsydyn/crumbs-css/dist/transformer` or internal source files.
- Package metadata and generated declarations must not refer to a path outside the package artifact. A package that resolves only because a source directory, symlink, or repository-level dependency is available fails qualification.
- This is a functional distribution qualification. It makes no claim that precompiled output is faster than workspace transformation or that the package has passed the full runtime dependency audit.

## Failure behavior

Treat missing required files and artifacts as failures rather than skipped capabilities. Stop before Expo export when package identity, installed path, package linkage, or declaration checks fail. Report the package name, requested version, resolved path, and violated boundary so the failure can be reproduced. Do not silently fall back to workspace packages, registry tags, or source files.

A failed or interrupted run must retain enough identity metadata to distinguish a failed package build from a successful Expo consumer check. Only a completed typecheck and the required platform exports produce a passing M8.1 receipt.

## Verification and acceptance

M8.1 is complete when all of the following are evidenced:

- The three packages are independently packed; each installed name/version matches its tarball manifest, and tarball SHA-256 values are recorded.
- The token and component artifacts install from tarballs into a staged Expo app outside the monorepo with no symlink or workspace dependency.
- The component package's tarball contains the precompiled platform style modules and usable declarations, and contains no required authored `.css.ts` source or transformer import.
- The app typechecks using installed public declarations. Positive usage of the action callback and public component props succeeds; a deliberately invalid prop is rejected by a type fixture.
- Expo's iOS and web production exports complete from the staged app and their module inventory resolves the installed packages without reading the worktree. No Android export or device acceptance is required by this slice.
- Missing artifacts, an escaped real path, or a workspace/source dependency cause a deterministic failure with actionable context.
- The focused package/consumer checks and relevant repository checks pass; the assessment and playground instructions distinguish packed qualification from workspace and published-version modes.
- No publish, compatibility-matrix claim, visual acceptance, native-device result, or performance-budget claim is recorded as an M8.1 result.

## Scope for the implementation plan

Expected changes are limited to private distribution fixtures, the packed-consumer/Expo qualification runner and tests, the M8.1 assessment or evidence record, and focused documentation. The implementation plan should name exact paths after confirming the existing fixture layout. It must not reorganize the Crumbs package family, modify release workflows, or broaden the supported Expo/RN baseline.
