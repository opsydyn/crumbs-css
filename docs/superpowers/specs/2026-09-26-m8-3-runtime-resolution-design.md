# M8.3 ESM/CommonJS/Metro Resolution and Tree-Shaking Design

**Status:** Architecture approved; written-spec review pending.
**Date:** 2026-09-26
**Roadmap:** M8.3 in [roadmap.md](../../roadmap.md)

## Intent

Qualify the package consumers actually install. Every declared export must resolve to the intended ESM or CommonJS artifact, ordinary runtime paths must stay isolated from Effect and compiler tooling, and production Metro must remove unused code from an explicitly imported decoder surface.

This slice extends the existing packed-consumer and runtime-isolation checks. It does not redesign the export map in advance. Change package exports or build settings only when a probe demonstrates a real resolution or dependency-graph defect.

## Existing baseline and gap

The package already declares explicit root and subpath exports, emits ESM and CommonJS builds, and separates ordinary runtime dependencies from compiler dependencies. The packed consumer contract exercises ESM and CJS consumers across several authoring and runtime paths. Runtime isolation inspects ordinary theme and token graphs. The Metro bundle contract rejects Effect and compiler sources in ordinary Expo runtime maps.

The remaining gap is a systematic check derived from the complete manifest export map, direct qualification of the dedicated schema entry in both module formats, dependency classification of the advanced Effect entrypoints, and observable proof that production Metro removes an unused Crumbs export implementation. Existing size differences or source-map presence alone do not prove tree shaking.

## Entrypoint dependency contract

| Class | Public paths | Allowed emitted dependencies | Forbidden dependencies |
| --- | --- | --- | --- |
| Ordinary runtime | ./theme, ./theme/core, ./dist/theme, ./tokens | React for theme entries; no external dependency for the token entry unless a later decision documents one | Effect, Node built-ins, authoring/compiler modules and compiler dependencies |
| Explicit advanced runtime | ./tokens/schema, ./tokens/optic | Effect may be bundled inside the Crumbs artifact; it is an implementation dependency, not a consumer peer or required userland import | External Effect imports, Node built-ins, authoring/compiler modules and compiler dependencies |
| Authoring/compiler tooling | ., ./style, ./metro-plugin, ./dist/transformer, ./dist/metro-plugin | The Node and compiler dependencies admitted by the package build policy | Missing local artifacts, unresolved local imports, or an undocumented dynamic-loading edge |
| Package metadata | ./package.json | The packed manifest | Workspace-only or source-tree targets |

The manifest remains authoritative for the list of public paths and conditional targets. Tests must cover compatibility aliases as declared, including ./dist/theme and ./dist/metro-plugin. Declaration targets must exist, and consumer type checks must resolve the conditional export map in both Node16 and Bundler module-resolution modes.

Ordinary runtime imports must not transitively reach either advanced Effect subpath. The schema and optic paths may contain bundled Effect only when a consumer explicitly imports one of those public paths. Compiler tooling stays separately reachable through its declared authoring/build paths.

## Artifact resolution and graph checks

Qualification starts from a packed Crumbs tarball installed into an isolated consumer, with its package identity and tarball hash retained. The tests derive import and require targets from the packed exports map, confirm each target exists inside the installed artifact, and resolve it from the consumer using Node ESM and CommonJS resolution. Runtime-class entries receive functional load probes. The Node executable version is recorded, including a check against the declared Node engine floor of 22.0.0.

An emitted-graph audit follows local ESM imports/exports, dynamic imports and CommonJS requires. It fails on missing local files and classifies external imports against the entrypoint contract above. Non-literal loading in ordinary or advanced runtime graphs fails closed. Compiler entries may retain known dynamic loaders only when the exact specifier and owning entry are documented and tested.

The packed Expo consumer uses the M8.1/M8.2 baseline recorded in the M8.2 compatibility qualification (Expo 56.0.4, React Native 0.85.3, React 19.2.5). Production exports run for iOS and web with Metro tree shaking explicitly enabled. Android export, Android device behavior and physical-device acceptance are outside this slice.

## Production Metro proof

The Metro fixture has separate ordinary-runtime and schema-decoder import surfaces:

1. The ordinary fixture imports only theme/core and tokens. Its retained module/source inventory must identify the packed ESM targets and contain no Effect, Node built-ins, or compiler sources.
2. The decoder-only fixture imports and calls decodeTokenValue from tokens/schema. It may contain bundled Effect, but it must still exclude Node built-ins and compiler sources.
3. A positive control imports and calls decodeExternalTokenTheme from the same subpath.

The deterministic tree-shaking canary is the literal external-token-theme, created by packages/css/src/contracts/payloads.ts when externalTokenThemeCodec is retained. The decoder-only production bundle must omit this literal; the positive control must retain it. Check generated bundle JavaScript directly, not source-map sourcesContent or total bundle size alone. This paired absent/present result demonstrates both removal and detector sensitivity.

The module inventory also proves that the Metro consumer resolved the installed packed ESM entries. The receipt records the exact package hash, dependency versions, Node version, production flags, iOS/web bundle identities, allowed/forbidden module results and canary outcomes.

## Failure handling and scope

Missing manifest targets, an incorrect ESM/CommonJS branch, unresolved local graph edges, unauthorized external imports, compiler leakage, an ordinary bundle that contains Effect, or a failed canary pair blocks M8.3 completion. Fix only defects demonstrated by these probes; preserve public API behavior and the approved Effect boundary.

The slice adds no consumer Effect peer dependency and no new public API by default. Hot reload and invalidation remain M8.4; publication-policy reconciliation remains M8.5; Android/device acceptance and publishing remain parked. On successful qualification, update packages/css/COMPATIBILITY.md, retain the M8.3 receipt, and mark M8.3 complete in the roadmap with M8.4 recommended next.
