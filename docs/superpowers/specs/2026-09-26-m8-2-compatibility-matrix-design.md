# M8.2 — Compiler, artifact, and runtime compatibility matrix

**Status:** Draft for user review; implementation is not approved.
**Governing decisions:** D5 (stable token identity), D11 (distributed package compatibility), and D12 (executable evidence) in the [design-system ADR](../../decisions/adopt-native-design-system-compiler.md).

## Intent

Publish an evidence-backed compatibility contract for design-system packages compiled with Crumbs and consumed by the Crumbs runtime. Make the compiler package version, runtime package version, artifact protocol, consumer package versions, and React Native host baseline distinct dimensions. Demonstrate that identified token themes remain available across physical Crumbs package copies and asynchronously loaded component modules in one JavaScript realm.

M8.2 extends the packed consumer path qualified by [M8.1](../../assessments/2026-09-26-m8-1-packed-design-system.md). It does not publish packages or qualify native-device behavior.

## Current boundary and facts

`@opsydyn/crumbs-css` currently ships compiler, authoring, and runtime entrypoints in one package. The package version therefore identifies both compiler and runtime for the initial matrix row; this milestone does not promise that separately versioned Crumbs compiler and runtime releases interoperate.

The M8.1 packed consumer established this exact baseline:

| Dimension | Qualified value |
| --- | --- |
| Crumbs compiler/runtime package | `@opsydyn/crumbs-css@0.1.1-alpha.1` |
| Consumer token package | `@acme/design-tokens@1.0.0` |
| Consumer component package | `@acme/ui@1.0.0` |
| Expo | `56.0.4` |
| React | `19.2.5` |
| React Native | `0.85.3` |
| Packed platform exports | iOS and web JavaScript bundles |

The retained M8.1 receipt records artifact hashes, lockfile identity, resolved package paths, typecheck results, and bundle inventories. Android and device acceptance remain parked.

The current versioned runtime-facing shapes include component recipe descriptors (legacy v1, v2, and contract-bound v3), component recipe extensions (v1), Sprinkles lookup plans (v1), and the generated native-module metadata/dependency-plan pair (`crumbs.css.native-module` v2 with dependency plan v1). The advanced external token-theme codec has its own payload version (v1). M8.2 will verify this inventory against the public entrypoints and keep each version attached to its owning boundary.

The `NativeArtifact` v1 envelope and Native IR v1 are internal compiler contracts, explicitly not published compiler/artifact ABIs. They must not be described as package compatibility promises. Internal plan versions that do not cross a supported compiler/runtime or consumer-package boundary likewise stay outside the published matrix.

## Decision

Use an explicit matrix with four evidence states:

- **Qualified:** the exact package artifacts and host versions completed the packed consumer checks named in the evidence record.
- **Runtime-supported:** the current runtime accepts the listed versioned shape in focused runtime contract tests, but the full packed consumer combination has not been qualified.
- **Rejected:** the runtime or decoder fails closed for the supplied unsupported version and reports the relevant boundary/version.
- **Unqualified:** no compatibility claim is made because the exact producer/runtime/package combination has not been exercised.

An npm semver range is installation metadata, not proof that compiler output from one Crumbs release is compatible with another Crumbs runtime release. The matrix will name tested release pairs. Older and newer Crumbs release pairs remain unqualified until actual packed artifacts are tested. Unknown protocol versions must fail explicitly and may not be interpreted as the newest known format or silently downgraded.

Token provider compatibility is based on the stable `{ owner, name, version }` contract identity and its canonical shape signature. Duplicate copies in the same JavaScript realm may share identified provider context when identity and shape match and both use the same React instance. A shape collision under the same identity fails; distinct contract identities remain isolated. Legacy path-scoped tokens receive no cross-package provider compatibility promise. No context-sharing claim applies across workers, separate JavaScript engines, or duplicate React instances.

## Compatibility matrix

The package compatibility page will report package and artifact dimensions separately. The initial package row remains the M8.1 exact packed baseline above. Artifact entries will distinguish current support from package-level qualification:

| Boundary | Current format | Initial M8.2 rule |
| --- | --- | --- |
| Component recipe runtime input | v1, v2, v3 | Current runtime accepts the listed generations; an unknown generation is rejected. |
| Component recipe extension | v1 | Current runtime accepts v1; unknown generations are rejected. |
| Sprinkles lookup plan | v1 | Current runtime accepts v1; unknown generations are rejected. |
| Generated native-module metadata | metadata v2; dependency plan v1 | The metadata envelope is compiler-emitted output; the public runtime resolver consumes the dependency plan. M8.2 qualifies this exact packed pair and reports each version at its own boundary. |
| External token-theme payload | v1 through `@opsydyn/crumbs-css/tokens/schema` | The current decoder accepts v1; unknown versions fail decoding without fallback. Effect remains an implementation dependency, not an application peer or render API. |
| `NativeArtifact` / Native IR | internal prototype / internal semantic contract | Excluded from published compatibility claims. |

The matrix will not broaden Expo, React, React Native, Metro, Node, or Bun support in M8.2. The supported host row remains the M8.1 baseline. M8.6 owns broader CI SDK gates; M8.3 owns ESM/CommonJS/Metro resolution and tree-shaking qualification.

## Duplicate-copy and lazy-module contract

Extend the packed consumer fixture to install the same Crumbs tarball at two physical `node_modules` paths: the app's direct dependency and a nested dependency of the separately packed component package. Both copies resolve the same React peer instance. This intentionally qualifies duplicate physical copies of one tested Crumbs release; it does not qualify arbitrary mixed Crumbs versions.

The fixture mounts `TokenThemeProvider` from the app's Crumbs copy and loads a consumer component asynchronously from the packed UI package. The lazy component imports `useTokenTheme` from its nested Crumbs copy and reads the shared, identified token contract. A React render harness must observe the expected themed value across the asynchronous boundary. This is JavaScript runtime evidence, not native rendering evidence.

The same test slice verifies that two distinct identified contracts can coexist without crossing values and that reusing an identity with a different shape fails with the established collision behavior. It also records that the compatibility relies on a singleton React peer and one JavaScript realm.

## Failure behavior

- An unsupported versioned input fails at its owning runtime/decoder boundary with the version and supported set where the boundary exposes that information.
- A same-identity, different-shape contract fails instead of selecting a provider or token value by name alone.
- A missing, escaped, or workspace-linked packed package fails before the provider scenario runs; the existing M8.1 provenance guarantees remain in force.
- A second React runtime, a separate JavaScript realm, or an unlisted Crumbs release pair is recorded as outside the qualified matrix rather than treated as a successful duplicate-copy case.
- No compatibility check may silently skip when an expected package copy, lazy module, or artifact-version case is absent.

## Verification and acceptance

M8.2 is complete when:

- `packages/css/COMPATIBILITY.md` publishes the exact compiler/runtime package pair, consumer package versions, host baseline, artifact families, evidence status, and unsupported/unqualified distinctions; the public compatibility docs link to the same policy.
- The version inventory has been checked against public runtime entrypoints. Publicly consumed, versioned payloads have positive current-version and negative unknown-version tests. Internal prototype formats are not called published ABIs.
- The packed fixture proves a provider created by one physical Crumbs copy is observed by an asynchronously loaded consumer using the other copy, with the same React peer and a matching identified contract.
- Distinct identities remain isolated, conflicting shapes fail, and unsupported runtime payload versions fail explicitly.
- The receipt identifies exact tarball hashes, resolved physical paths for both Crumbs copies, the single React resolution, contract identity/shape, lazy-module outcome, host versions, and all diagnostics.
- Relevant package tests, type checks, packed-consumer checks, and documentation checks pass. No publication, Android/device acceptance, expanded SDK support, HMR claim, or full ESM/CommonJS/Metro graph claim is recorded.

## Alternatives considered

- **Lockstep consumer package versions:** simpler to describe, but it constrains token and component package release independence without improving the evidence for the current packed baseline.
- **Capability negotiation or runtime manifests:** offers a future extension point, but overlaps the M9 manifest work and is unnecessary while the initial supported matrix is small.
- **Infer compatibility from peer semver ranges:** less explicit and would overstate what has been exercised. The selected matrix records actual supported pairs and keeps unknown pairs unqualified.

## Scope for the implementation plan

Expected work is limited to compatibility documentation and checks, a packed duplicate-copy/lazy-consumer fixture, focused version-boundary regressions, and an M8.2 evidence record. The implementation plan must preserve M8.1 provenance checks, avoid changing release automation or publishing, keep Android/device work parked, and leave M8.3–M8.6 as separate roadmap items.
