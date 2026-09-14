# M0 token declarations implementation plan

**Goal:** repair assessment E5: token-backed declarations obey native property validation and retain their order relative to literal declarations.

**Architecture:** use one ordered conversion accumulator for supported native property declarations. Validate a token's native property before creating its reference; preserve current strict-error codes and contextual messages. This slice does not introduce semantic token domains or change shorthand normalization.

**Tech stack:** current Bun/TypeScript package, vanilla-extract compatibility pipeline, `fast-check`. Effect 4 adoption remains M1.

**Spec:** [North Star ADR](../../decisions/adopt-native-design-system-compiler.md), decisions D2 and D3, and [M0](../../roadmap.md#m0--establish-native-correctness-and-runtime-isolation).

## Constraints

- Preserve existing unrelated dependency/release changes and planning drafts.
- Use the supported Expo 56 / React Native 0.85 baseline.
- Commit after each completed slice, as requested by the user. Publication requires separate authorization.
- Do not mark the whole M0 milestone complete for this slice.
- Preserve existing token payload shape and public API exports.
- Shorthand/longhand conflicts, malformed token references, structured values, and runtime graph isolation remain separate M0 work.

## Task 1: Reproduce token ordering and validation defects

**Files:** `packages/css/test/css-to-rn.test.ts`, `packages/css/test/css-declarations.property.test.ts`.

- [x] Add a token-first/literal-last colour regression expecting the literal.
- [x] Add the reverse-order regression expecting the token reference.
- [x] Add a strict unsupported token declaration regression expecting `NativeStylesDeclarationError`, stable code, file/export/property context.
- [x] Add a non-strict regression showing an unsupported token property is dropped while valid adjacent declarations survive.
- [x] Generate mixed literal/token declarations for colour, background colour, and opacity; compare final values with a small independent last-declaration model. Generate invalid property names with native token values and assert strict rejection.
- [x] Run the two test files and confirm failure is the reproduced behavior.

## Task 2: Repair the ordered conversion boundary

**File:** `packages/css/src/css-to-rn.ts`.

- [x] Remove the separate token accumulator and write validated references into the ordered native declaration result.
- [x] Validate camel-cased native property names against the existing native support set before accepting a token reference.
- [x] Record unsupported token declarations in the existing dropped-declaration list so strict mode keeps context and diagnostic codes.
- [x] Run focused tests and confirm both ordering directions and invalid-property cases pass.

## Task 3: Document, qualify, and record limits

**Files:** `packages/css/COMPATIBILITY.md`, `docs/roadmap.md`.

- [x] Document token property validation and token/literal ordering without claiming shorthand normalization or semantic domains.
- [x] Record this slice and its verification evidence in the roadmap.
- [x] Add early Expo consumer feedback work to M0/M1: workspace/public-dist watch loop, isolated tarball/published installations, and package identity reporting. Keep supported baseline and newest-SDK qualification separate.
- [x] Run `bun run check`, package benchmark, `bun run docs:build`, and `git diff --check`.
- [x] Report remaining M0 work and recommend the next bounded slice. Do not automatically start M1.

## Verification evidence — 2026-09-14

`bun run check` passed build, typechecking, and all 123 tests (5,238 assertions). The focused suites went from five reproduced failures to 28 passing tests. `bun run docs:build` built 20 pages. The benchmark passed its existing local Bun budgets after build completion; an initial concurrent attempt encountered missing clean-build output and was rerun sequentially. No device performance or whole-M0 completion is claimed. The user subsequently authorized committing each completed slice.
