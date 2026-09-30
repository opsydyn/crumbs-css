# M10.4 North Star Journeys Qualification Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Use the TDD and verification instructions for every code change.

**Goal:** Qualify all three M10.4 North Star journeys using the current packed Crumbs package and independent consumer packages, with retained versioned evidence and explicit limits.

**Architecture:** Reuse the M8.1 packed-distribution builder and staged Expo consumer. Add a second theme brand and portal/accessibility integration to the consumer fixtures, exercise M9 manifest and migration APIs through the packed Crumbs tooling subpaths, and emit one M10.4 receipt with artifact identities, results, bundle inventory, diagnostics and the existing host benchmark report. A typed alias-semantic finding extends the strict compatibility report, so the closed finding-code set advances to wire version 2; manifest v1 and migration v1 remain unchanged. The M9.7 ownership tooling continues to accept the updated report version; its previously retained v1 evidence is historical. The host benchmark compares cold and warm transforms from the same fixture-root process cwd and retains package-relative fixture paths.

**Tech Stack:** Bun, TypeScript, npm pack/install, Expo SDK 56, React Native 0.85.3, Crumbs public ESM/CommonJS entrypoints, existing contract fixtures and performance harness.

**Spec:** `docs/roadmap.md` M10.4 and Journeys A–C; ADR D9–D12; `docs/superpowers/specs/2026-09-26-m8-1-packed-design-system-packages-design.md`; M9.2 and M9.5 specifications.

## Global Constraints

- Build and consume the current local Crumbs tarball; do not publish or resolve through workspace, link, symlink, or repository source paths.
- Preserve the Expo SDK 56 / React Native 0.85.3 fixture baseline and existing component public variant/slot types.
- Exercise `tooling/manifest`, `tooling/migrations`, and token runtime APIs from the staged packed installation.
- Android, physical-device, screen-reader, and device-performance acceptance remain separate and must be reported as not-run.
- Report only the existing measured host smoke budget as host evidence; do not call it native-device or full M1 performance qualification.
- Retain package identities and hashes, deterministic report digests, explicit diagnostics, and the source revision in portable evidence paths.

## Review Focus

- The packed tooling entry must resolve beneath the staged consumer's `node_modules`, at the exact artifact version; workspace or source fallbacks fail.
- An alias-target change and public-token removal must identify the affected supplied consumer and produce explicit findings; migration output must only change named files and become unchanged when repeated.
- The old theme snapshot must retain its values after a new snapshot is constructed.
- The same packed component and public types must work under both brand scopes and at a portal boundary, including disabled/accessibility state behavior.
- iOS/web source maps must include the installed token, UI, and Crumbs artifacts and exclude repository source; report any native, accessibility, or budget coverage that remains open.

---

### Task 1: Add a second-brand packed consumer journey

**Files:**
- Modify: `packages/css/fixtures/packed-distribution/tokens/src/index.ts`
- Modify: `packages/css/fixtures/packed-distribution/ui/src/ActionCard.tsx` and `src/index.ts` only if the fixture needs a public probe component
- Modify: `packages/css/fixtures/packed-distribution/app/package.json` and `src/App.tsx`
- Create: `packages/css/fixtures/packed-distribution/app/test/north-star-journeys.integration.tsx`
- Test: staged packed-app typecheck and integration test

**Interfaces:** Keep `ActionCard`'s existing required `onActionPress`, `disabled`, public `root`/`label` slots, and disabled/pressed recipe contract. Export a second validated brand scope from the token fixture and use the same packed `ActionCard` under both scopes. Put one scoped `ActionCard` behind the fixture portal host; the portal child must receive its brand scope explicitly at the host boundary.

- [x] Write the failing packed-app test for both brand token values, reuse of the same component/type surface, portal-scoped rendering, and disabled accessibility state.
- [x] Confirm it fails against the current single-brand fixture.
- [x] Add the second brand data and portal host integration without copying component implementation or changing Crumbs runtime APIs.
- [x] Run the packed-app test and typecheck; verify normal and disabled states and portal resolution.

### Task 2: Qualify safe token change and migration through packed tooling

**Files:**
- Create: `packages/css/fixtures/m10-4-north-star/` manifest, migration, consumer and explicit-source cases
- Create: `packages/css/test/north-star-qualification.test.ts`
- Create: `scripts/m10-4-north-star-qualification.ts`
- Modify: compatibility report model, decoder, comparison tests, and existing ownership fixtures for report v2

**Interfaces:** From the staged app, resolve `@opsydyn/crumbs-css/tooling/manifest`, `@opsydyn/crumbs-css/tooling/migrations`, and `@opsydyn/crumbs-css/tokens` using a consumer-rooted `createRequire`. Use `compareManifests` for the alias/removal report and `planSourceMigration` for a deterministic explicit-file migration. Keep the token package's prior theme snapshot while constructing the changed snapshot.

- [x] Write failing fixture/model tests for alias-target change, public-token removal, supplied-consumer impact, and the expected migration output. Assert the compatibility report wire version and strict decoder contract.
- [x] Run them to confirm missing M10.4 fixture coverage.
- [x] Add versioned M10.4 fixtures with a stable package/contract identity and an unrelated source file that must remain byte-identical.
- [x] In the packed qualification runner, assert the public subpaths resolve from the packed Crumbs artifact; compare canonical reports with expected findings; apply only planned output in a disposable staged consumer; rerun to prove no further change; prove the previous theme snapshot remains unchanged.

### Task 3: Orchestrate, retain evidence, and close M10.4

**Files:**
- Modify: `scripts/playground-distribution.ts` or create `scripts/m10-4-north-star-qualification.ts` for one packed run across all journeys
- Modify: root `package.json` with `northstar:qualify`
- Modify: `packages/css/bench/native-styles.bench.ts` so cold and warm transforms use the same fixture-root cwd and fixture paths are portable
- Modify: M9.7 ownership fixtures/tests to consume compatibility report v2
- Create: `docs/evidence/2026-09-30-m10-4-north-star/qualification.json`, diagnostics, compatibility/migration reports, and host benchmark report
- Create: `docs/assessments/2026-09-30-m10-4-north-star-journeys.md`
- Modify: `docs/roadmap.md` M10.4 status and next recommendation only after gates pass

- [x] Run packed artifact build/install; verify exact name/version/hash and no repository resolution.
- [x] Run the staged app integration tests, TypeScript check, and iOS/web Expo exports; verify bundle source maps.
- [x] Run the existing native-style host smoke benchmark and preserve its JSON as host-only evidence.
- [x] Run repository `bun run check`, `bun run app:typecheck`, `bun run docs:build`, and `git diff --check`; report outputs and open limits.
- [x] Review the complete change and document the M10.5 recommendation. The user-requested M10.4 commit is the final action for this slice.
