# M1.9 Expo playground closure audit

## Decision

M1.9 is complete. The repository has repeatable workspace, packed-artifact and published-registry consumer paths; exact source/version receipts; a committed Expo 56 dependency resolution; and repeatable measurement scenarios. The newest stable SDK is now tested through a separate nested configuration that cannot alter the supported workspace.

This closes the playground architecture contract, not every consumer result. On 2026-09-15 the current `alpha` tag resolved to the exact registry artifact `0.1.2-alpha.1`, installed without a workspace link and then failed typechecking because the current playground uses composition and primitive-reference behavior introduced after that artifact was published. This is a useful distribution-drift signal. No publication or peer override was used to hide it.

## Supported baseline

The playground and internal Storybook both declare Expo 56, React 19.2.5 and React Native 0.85.3. The committed `bun.lock` resolves Expo 56.0.4 and `@expo/metro-runtime` 56.0.12. Contract tests now keep the two consumer manifests aligned and require those exact lockfile resolutions. The pre-existing unstaged lockfile change updates only the Crumbs workspace package version; it does not change these consumer resolutions and is excluded from this slice.

Current workspace qualification passed TypeScript plus production web, iOS and Android exports, with all three source maps proving the runtime bundle contains the public theme runtime and excludes authoring/compiler sources. The current packed tarball passed the same checks outside monorepo resolution. Its SHA-256 and exact working-tree identity are retained in the [qualification record](../evidence/2026-09-15-playground-closure/qualification.json).

## Newest SDK isolation

npm `latest` resolved to Expo 57.0.22. The current official blank template is 57.0.24 and specifies React 19.2.3, React Native 0.86.3 and Expo `~57.0.22`. The nested [Expo 57 configuration](../../apps/playground/upgrade/expo-57.json) pins the complete candidate stack to exact versions and is outside the root `apps/*` workspace match.

`bun run playground:sdk-candidate` refreshes the live tag and template metadata, rejects a stale recorded candidate, packs the current Crumbs source, and performs npm resolution in a temporary consumer and cache. npm returned `ERESOLVE` because React Native 0.86.3 is outside the supported Crumbs peer range `>=0.85 <0.86`. The runner treats only that exact expected boundary as a passed isolation contract. Expo 57 remains unsupported and compatibility documentation is unchanged. See the [candidate receipt](../evidence/2026-09-15-expo-sdk-candidate/qualification.json).

## Scope and remaining gates

The playground already includes fixed-size list lifecycle, recipe/scope, scroll, context, retained-memory and direct Metro-edit scenarios with run identities and terminal reports. Their earlier browser and host receipts remain separate from release-device budgets.

M0.9 remains open because Android native journey acceptance is parked until last. M1.5, M1.6, M1.7 and M1.8 retain their device, future-API and missing-budget gates. The published `alpha` result will remain red for the current playground until a compatible Crumbs artifact is published; publishing is outside this slice.
