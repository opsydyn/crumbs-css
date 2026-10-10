# v1 packed design-system distribution follow-up

The7d93b26 Linux CI run passed all CSS/Storybook tests and package/consumer types,
then failed while building UI: current example package manifests still requested
the alpha Crumbs range, permitting npm to install an older nested registry copy.
Four current dependency/peer examples now declare^1.0.0. Product dependency/peer
ranges and historical lock snapshots remain unchanged.

The real local check then exposed dedicated M11 harness entrypoints being copied
into the generic consumer without their generated panels/extension package. Only
those five standalone entry/type harness files are excluded during generic staging;
the dedicated M11 qualifiers continue to stage them. App, public-prop, algebra,
container and motion type controls remain present, with byte-identical strict
`tsconfig.json`. No TypeScript errors or negative controls are suppressed.

The final real distribution check passes strict installed consumer types and Expo
iOS/web exports, retaining source-map provenance for Crumbs, tokens and UI packages.
Failed CI, incomplete restored-dependency attempt, typed harness RED and scoped GREEN
logs are separate. The new receipt is archived here; the overwritten historical M8.1
receipt was byte-restored from Git. Exact original dependency roots and unrelated
primary files are restored. All185 shipping Crumbs package files remain byte-identical
to the previously qualified v1 package. A fresh final exact-head CI run is required.
No numerical performance limit or npm release gate changes.
