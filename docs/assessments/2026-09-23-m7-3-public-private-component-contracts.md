# M7.3 assessment: public and private component contracts

Date: 2026-09-26
Status: M7.3 implementation, qualification, and final review complete. No device or visual acceptance claimed.

M7.3 now has stable token visibility metadata, v3 component contracts, owner-only selection types, sealed extension points, ordered extension descriptors, and theme-aware resolution. The contract and extension DTOs survive compiler emission and packed ESM/CommonJS use. The Storybook showcase consumes a public multi-slot recipe.

## Implementation commits

- `7911b74079846d7af2b9a5128e7418993d13cf0d` — declare public token paths and bind them to token contract identity.
- `aca9f3d9a84659d87c90b7f440f753ebaec87470` — add v3 public component contracts and narrow public selection types.
- `e9c15808e366917ffdafdcf45b12bda7d7edc2f8` — add sealed extension descriptors and ordered chain resolution.
- `60a8b0e250250d797e539d2cc1fd3cb907e7bcbb` — preserve extension metadata through theme resolution and packed package boundaries.
- `d56221bb3bf5a36dddfe48d1c10d9fa1be429a9c` — add the independent composition/size laws, Storybook dogfood, and API guidance.
- `f77b0b94c3d7ffb8f77ce2d61e76fe5c153b243f` — reserve all owner variant values, reject private owner values from explicit extension selections, and carry extension defaults into public selection types.
- `a584a2a926c67e87fd417746052e5a782bf0f5fa` — pin default replacement through a two-extension type chain.
- `65ffaf6ec8a396653b060e29c265768ea0f296a9` — enforce exact extension authoring permissions for literal and union configs, including identity and compound shapes.

## Verified behavior

Token visibility defaults to public for identified contracts unless a public path set is supplied. Explicit paths must identify unique definition tokens; aliases inherit the terminal definition's visibility. The path set participates in stable contract identity, so changing the published set under the same identity fails. Visibility is compatibility metadata, not secrecy or an authorization boundary.

Contract-bearing component recipes emit v3; uncontracted authored recipes remain v2, and v1 remains readable with its prior unconstrained behavior. Owner selection types retain private axes and values. `NativeComponentPublicProps` restricts consumers to the published selection surface and adds values from authorized extensions. Extension operations are opt-in for defaults, variant values, compounds, and styled slots; descriptors validate component identity and immediate parent linkage across a linear base-to-leaf chain.

Extension authoring types mirror those permissions for inferred configurations: only declared default and variant axes and style slots are admitted, compounds require explicit permission, compound records and extension identities reject extra keys, and a union config is rejected if any branch exceeds the contract. Runtime exact-key validation remains in place for JavaScript and widened inputs.

Defaults merge owner first, then extensions base-to-leaf, then caller input. For valid v3 selections the style stages are owner base, ordinary variants in authored axis order, the state-discriminator branch, owner and extension compounds in order, then permitted extension slot overrides base-to-leaf. A prohibited state selection resolves to owner base styles only.

Theme resolution handles v3 and extension tags, resolves token references in variant, compound, and override styles, preserves identity and parent data, and returns the original descriptor when no token changes. Changed style/token branches are frozen. One remaining Minor is that changed compiled v3 output retains the incoming contract object without deeply freezing it; this is recorded as deferred below. Extension cache entries are scoped to the theme and descriptor object. Compiler capture already emitted the required plain DTO shape, so this work made no compiler-source change and added no Effect codec or runtime dependency.

The final review follow-up reserves every owner variant value name against extension replacement, while keeping only public plus authorized extension values selectable. Extension resolvers reject explicit private owner values before cache lookup and retain warn-and-skip behavior for unknown values. Extension default maps now flow through the public prop type, including leaf-over-parent precedence. Regression coverage pins a non-immediate ancestor duplicate, untyped private-value selection, complete public state projections with hidden required values, accumulated defaults across two extensions, and exact config permissions for mixed and union defaults, compounds, and identities.

## Evidence

Task 4's focused boundary suite passed: `bun test packages/css/test/component-recipe-theme.test.ts packages/css/test/component-recipe-compiler.test.ts packages/css/test/pack-consumer-contract.test.ts packages/css/test/runtime-isolation.test.ts packages/css/test/public-api.test.ts` — 30 tests across five files, 133 assertions.

Task 5's focused oracle suite passed: `bun test packages/css/test/component-recipe-runtime.property.test.ts` — 5 tests, 9,785 assertions. The new independent oracle used seed `20260923` for 200 partial selections across two extension layers. It checked default precedence, ordinary-variant and state ordering, compounds, overrides, and base-only output for the prohibited state. The plan-size law checked two axes with three values and four axes with five values, including compounds and two extension layers; planned branch and constraint counts matched authored records without materialized product collections. Existing resolver tests also retain canonical result identity and exercise bounded cache hits, evictions, zero capacity, and invalid bounds.

After the final type fixes, `bun run check` passed package build, package typecheck, and 839 tests across 136 files with 39,922 assertions. The packed tarball consumer passed in ESM and CommonJS, with both Node16 and Bundler TypeScript resolution. Theme and theme/core runtime graphs passed ESM/CommonJS isolation checks; only React was allowed as an external, while Effect, vanilla-extract, compiler/native-capture modules, and Node built-ins were denied on the guarded extension paths.

`bun run app:typecheck` passed for Storybook. `bun run docs:build` passed with 20 documentation pages. The style API now exposes `extendComponentRecipe` and the extension descriptor/version tags; the theme type mapping preserves concrete extension types for direct and style-map resolution. `ShowcaseCard` now uses a two-slot public contract and chooses memoized idle/pressed outputs through the `Pressable` state.

The M7.2 admission rule is represented by a clearly labelled fixture allow-list `[1, 2]` that rejects v3. This is not execution of an older published binary.

## Limits and decisions

No device run, visual acceptance, Android acceptance, or device budget was performed; Android remains parked for the final native step. The packed consumer and Storybook checks qualify package/runtime/type boundaries, not on-device behavior. M7.4 product-team migration evidence and M9 manifest/policy tooling remain future work.

Two implementation rulings are recorded in the SDD ledger. The plan-size scan excludes only fixed extension descriptor root-key counts because the second required nine-field DTO coincides with the `2 × 3` product; nested collections and authored record counts remain checked. The Storybook copies three readonly resolver arrays—idle root, pressed root, and label—once per themed recipe because React Native's `StyleProp` rejects readonly arrays; this avoids unsafe casts and render-time array copying. Cost if that trade-off is wrong: three small arrays per card remain allocated while the themed recipe identity is stable.

The initial independent review found three Important contract gaps. Commits `f77b0b9` and `a584a2a` close them and add the requested regression cases. A follow-up review found extension authoring types could still admit forbidden compound operations and mixed default axes; `65ffaf6` closes those gaps and rejects extra compound and identity keys, including across union configs. The final independent review found no Critical or Important defects. One Minor remains deferred: changed themed output from an unfrozen compiled-shaped descriptor retains mutable contract metadata. Cost if wrong: consumers can mutate compatibility metadata on an otherwise frozen themed descriptor after token resolution.

Next recommended roadmap item: **M7.4** — demonstrate product-team extension without copying component implementation and verify private implementation changes preserve the public contract while removed public surface is detectable. Begin only after approval.
