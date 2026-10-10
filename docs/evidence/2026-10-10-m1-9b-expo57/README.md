# M1.9b — Expo 57 compatibility

**Complete: npm 1.1.0/latest and GitHub v1.1.0/latest are published and independently verified.** [Current status](publication-status.json). Historical prerequisite and failed-gate states below remain evidence of those exact attempts.

The approved slice adds SDK 57 / RN 0.86 and retains SDK 56 / RN 0.85. Agent-skill authoring is deferred until this compatibility release is available. Physical-device and performance acceptance remain separate.

The retained working-tree receipts are diagnostic, with explicit dirty-source identity. Clean CI and the generic exact-release-tarball workflow establish separate qualification/publication identities. No v1 performance exception is inherited.

- [SDK 56 packed diagnostic](sdk56-diagnostic.json): Crumbs1.1.0, Expo 56.0.23, React19.2.3, RN 0.85.3; all 185 installed files match the exact tarball, consumer types and iOS/Android/web exports pass. [Raw log](sdk56-packed.log).
- [SDK 57 packed diagnostic](sdk57-diagnostic.json) and [raw command logs](sdk-57-logs/): all 185 installed files match; strict resolution, consumer types, motion contracts and iOS/Android/web exports pass on genuine Node 24.15.0 and Bun1.4.3. SDK 57 pins Expo 57.0.27, React/DOM/renderer 19.2.8, RN 0.86.3 and TS6.0.3. The current CLI/router optional peer graph requires the compatible React patch above the blank template's19.2.3; strict npm peers install without overrides.
- Consumer typechecking uses `strict:true` with the official Expo base (`skipLibCheck:true`); it checks user code and motion type fixtures against the installed declarations, not every third-party declaration. Library typechecking and declaration emission are separate checks.
- Motion renderer probes use real React with a controlled public Animated peer; separate Node ESM/CommonJS probes verify the pure entry without React/RN/Effect installed. Metro exports and source-map inspection cover the ordinary runtime and every platform, not device rendering.

Published1.0.1 initially rejects RN 0.86.3 in a real strict npm control, confirming the existing peer block. Behavioral regression tests cover preserved app runtime imports, stable SDK pins, peer expectation agreement, argument validation, installed byte/inventory tampering, compatible React patches, isolated pure motion probes and the real SDK Node floor.

Release status: [1.1.0](../../releases/1.1.0.md).

Local checks: 1,848 package tests / 33 Storybook tests, library and Storybook typechecks, frozen install and 33-page docs build. The package suite retains one existing skip. Clean CI records its own final-source checks below.

## Clean source qualification and publication prerequisite

[Final CI 38085552585](https://github.com/opsydyn/crumbs-css/actions/runs/38085552585) passes tests, types, both SDK 56 packed rows and SDK 57. Its [SDK 57 receipt](sdk57-ci.json) records a clean checkout, strict consumer types and all compatibility checks passed. The tested pull-request merge tree is identical to merged main/source tag `f08a58d022f9237cf3f4aae8bc9bd77d5c75f204`; [source binding](release-source.json). PR [#7](https://github.com/opsydyn/crumbs-css/pull/7) is merged; the v1.1.0 GitHub source release exists, with npm publication separate.

[First generic release run 38086172913](https://github.com/opsydyn/crumbs-css/actions/runs/38086172913) stops before host measurement: the locked Bun baseline exposes Vanilla Extract 1.20.1 only to the package, while the disposable app needs that exact dependency edge. The workflow repair exposes the existing locked package to the app and rejects drift; baseline manifests/locks and all eight package versions remain unchanged. The actual frozen [scaffold preparation](matched-scaffold-verified.json) passes, and nine publisher/scaffold/CI regression tests pass. The fixed source tag and generic budget limits are unchanged. The fresh gate outcome is recorded below.

## Fresh release gate and exact candidate

[Run 38086830759](https://github.com/opsydyn/crumbs-css/actions/runs/38086830759) passes the repaired scaffold prerequisite but stops on another project's occupied port 8093. [Run 38087033318](https://github.com/opsydyn/crumbs-css/actions/runs/38087033318), using the supported free port 18093, completes all measurements and fails the normal release check solely on the warm-transform numerical row: 9.269750 ms versus the effective 6.513744 ms limit. Ten blocking rows pass, none are incomplete. Eight advisory failures remain visible. npm publication is skipped.

The [full 20-file report](host-report/comparison.json), [checker log](release-host-gate.log), [exact-tarball SDK 57 receipt](exact-candidate/sdk57-qualification.json) and [public 1.0.1 JavaScript comparison](v101-code-comparison.json) are retained. The measured candidate passes all SDK 57 checks; all 105 JavaScript files match npm 1.0.1. The [proposed disposition](release-review.md) pins the exact source, report and artifact; it is explicitly approved and executed as recorded below. The generic policy and earlier v1-only exception are unchanged.

## Approved execution

The user explicitly approved the v1.1.0-only exception and publication; [approval record](release-approval.json). The scoped verifier requires the exact source/report/tarball/SDK 57 receipt and allows only the complete warm numerical failure. The generic policy and raw failed result remain unchanged. Fourteen focused tests and library types pass; a real diagnostic bundle seals/verifies and seven source-artifact/report/receipt/tooling rejection controls pass. [Integration evidence](publisher-integration.json). Production sealing and independent hosted publication now pass; registry acceptance is recorded below.

## Publication and registry acceptance

[Run 38088014069](https://github.com/opsydyn/crumbs-css/actions/runs/38088014069) passes independent hosted qualification and publication. The [sealed manifest](publication/manifest.json), [version-scoped exception receipt](publication/m19b-exception.json) and [seal identity](publication/seal-identity.json) bind the exact immutable source, 20-file raw report and approved tarball. No timing is resampled or failure rewritten.

[Public registry verification](registry/registry-verification.json) and [npm CLI](registry/npm-view.json) confirm version/latest 1.1.0, RN peers `>=0.85 <0.87` and exact SHA-256/SHA-512 integrity. The initial processing-time 404 is retained. [Attestations](registry/npm-attestations.json) and [cryptographic verification](registry/npm-provenance-verification.json) verify the GitHub Actions issuer/workflow identity, signed tarball subject and publication run; a changed signed payload rejects. Provenance identifies the dispatched workflow commit, while the sealed manifest binds the separate immutable product source. [npm README](registry/npm-readme-verification.json) matches the exact published tarball.

The fresh [SDK 56 registry consumer](published-sdk56-verification.json) passes all 185 installed-file comparisons, strict types, iOS/Android/web exports and three ordinary-runtime source-map checks; [raw log](published-sdk56.log). It uses Expo 56.0.23, React/DOM 19.2.3 and RN 0.85.3. The fresh [SDK 57 consumer of the downloaded registry tarball](published-sdk57/qualification.json) passes all 185 bytes, strict npm resolution, consumer types, motion contracts, peer-free motion and every platform export; [raw log](published-sdk57.log). The SDK 57 receipt's local tarball input is independently bound to downloaded public registry bytes; it does not claim an npm version-specifier install.

The [docs build](published-docs-build.log) passes 33 pages with current onboarding at 1.1.0. M1.9b closes. M1.9c consumer-agent authoring remains deferred as the next recommended slice. Physical-device/readers/release-FPS acceptance remains deferred, and M11.6 remains parked.
