# M7.3 Public Component Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Deliver M7.3 public/private token and component contracts with a sealed-by-default, typed extension chain and deterministic native style resolution.

**Architecture:** Keep component contracts inside the existing versioned recipe descriptor and encode each consumer contribution as a separate plain-data extension descriptor. Add token visibility to identified token contracts, validate the ordered extension chain once when constructing a resolver plan, and leave v1/v2 recipe resolution and external runtime dependency graphs unchanged.

**Tech Stack:** TypeScript, React Native 0.85 style domains, vanilla-extract class capture, Effect 4 internally, Bun test, fast-check, tsdown ESM/CommonJS builds, Expo Storybook.

**Spec:** docs/superpowers/specs/2026-09-23-public-private-component-contracts-design.md

## Global Constraints

- Public and private describe compatibility and type-level access. They do not provide secrecy or access control.
- For backward compatibility, an identity-bearing token contract with no visibility block treats all of its existing definition-token paths as public.
- A recipe without contract metadata keeps emitting version 2. Supplying it opts the recipe into descriptor version 3.
- Extension points are optional and sealed by default.
- Extensions form one linear base-to-leaf chain.
- The caller's explicit selection therefore wins over every default.
- Existing v1 and v2 descriptors retain their current branch ordering exactly.
- Ordinary consumers do not import Effect, and recipe resolution does not run Effect schema traversal.
- Use the repository's internal Effect 4 Schema/Codec boundary only when the serialized DTO and decoded domain value differ; validate same-shape plain data with synchronous boundary checks.
- Runtime descriptor and chain validation depend only on runtime-safe metadata modules; the resolver never imports the style authoring builder or vanilla-extract capture code.
- Plan construction compiles the owner recipe and linear extension chain once.
- It never enumerates the Cartesian product of variant values.
- The compatibility version inside a component or token identity is owned by that publishing contract.
- M7.3 defines and validates metadata but does not compare releases, generate manifests, or infer semantic-version changes; those belong to M9.
- M7.3 does not claim product-team migration success, M9 impact reporting, visual acceptance, native device budgets, or Android qualification.
- Preserve v1/v2 semantics; keep Effect out of consumer-facing types and render-time resolution.
- Do not modify .release-please-manifest.json, bun.lock, or packages/css/package.json.
- Commit each task as its own slice, keep unrelated work unstaged, and do not mark M7.3 complete until all acceptance evidence passes.

## Review Focus

- A repeated or unknown public token path, including an alias path, must be rejected; aliases inherit the terminal definition token visibility and the same identity cannot register a different visibility set. Pin this in Task 1 token authoring and identity tests.
- A public state discriminator whose required axes or values are private must be rejected, while the owner selection type retains private axes. Pin this in Task 2's contract and type fixtures.
- A duplicate value introduced by an earlier non-immediate extension, a mismatched parent identity, or an operation outside its permission must fail before the resolver returns. Pin this in Task 3's multi-extension tests.
- An invalid state after extension defaults must return only the owner base styles, and every valid v3 result must follow the exact five-stage order while v1/v2 remain unchanged. Pin this in Task 3's plan and resolver tests.
- Theme resolution and compiled ESM/CommonJS consumers must preserve v3 metadata and extension class references without importing Effect or compiler modules at runtime. Pin this in Task 4's compiler, pack, and isolation tests.

## File Map

| File | Responsibility in M7.3 |
| --- | --- |
| packages/css/src/tokens/identity.ts | Canonical token identity and visibility-aware compatibility signature. |
| packages/css/src/theme-token.ts | Shared token-reference metadata, including public/private visibility for author-time checks. |
| packages/css/src/tokens/domains.ts | Token contract options, path validation, type-level visibility, and reference registration. |
| packages/css/src/tokens/index.ts | Export token contract visibility types and the existing token helpers. |
| packages/css/src/native-tags.ts | Version 3 component tag and version 1 extension tag. |
| packages/css/src/components/contracts.ts | Component identity, visibility/permission data types, and validation. |
| packages/css/src/components/extension-contract.ts | Runtime-safe extension DTOs, guards, and full-chain validation with no style authoring/compiler imports. |
| packages/css/src/components/index.ts | Recipe descriptor/config types, conditional versioned authoring, and public props. |
| packages/css/src/components/extensions.ts | Style-entry authoring builder that captures extension styles and delegates structural checks to extension-contract.ts. |
| packages/css/src/native-style.ts | Public style-entry exports for component contracts and extension authoring. |
| packages/css/src/runtime/component-recipe-resolution-plan.ts | One-time base/extension validation, defaults, state gate, and ordered lookup plan. |
| packages/css/src/theme-runtime.ts | Resolver options, selection boundaries, theme-token transformation, and runtime exports. |
| packages/css/src/theme-core.ts | Preserve the lean theme/core boundary; component resolver controls stay on the full theme entry. |
| packages/css/test/token-contract-identity.property.test.ts | Stable IDs, default visibility, and identity/visibility collision regressions. |
| packages/css/test/token-contract-identity-types.ts | Compile-time public/private token brand checks. |
| packages/css/test/component-recipe-types.ts | Owner/public selection and extension type fixtures. |
| packages/css/test/component-recipe-authoring.test.ts | Component contract validation and descriptor freezing. |
| packages/css/test/component-recipe-extension.test.ts | Extension authoring, permissions, identities, and chain validation. |
| packages/css/test/component-recipe-resolution-plan.test.ts | Plan shape, version admission, precedence, and invalid state behavior. |
| packages/css/test/component-recipe-runtime.test.ts | Public resolver behavior, cache behavior, and v1/v2 regressions. |
| packages/css/test/component-recipe-runtime.property.test.ts | Independent composition oracle and plan-size law. |
| packages/css/test/component-recipe-theme.test.ts | Theme-token transformation and identity/freeze preservation. |
| packages/css/test/component-recipe-compiler.test.ts | Compiled v2/v3 recipe and extension DTO output. |
| packages/css/test/pack-consumer-contract.test.ts | Packed ESM/CommonJS userland API and artifact behavior. |
| packages/css/test/runtime-isolation.test.ts | Runtime graph remains free of Effect, compiler, and authoring imports. |
| packages/css/test/public-api.test.ts | Exact public exports for style and theme subpaths. |
| apps/storybook/src/components/ShowcaseCard.css.ts | Dogfood one public multi-slot component contract. |
| apps/storybook/src/components/ShowcaseCard.tsx | Consume public selection types and resolve the component in the example UI. |
| docs/src/content/docs/reference/package-entrypoints-and-apis.mdx | Public API usage, extension permissions, and precedence documentation. |
| docs/assessments/2026-09-23-m7-3-public-private-component-contracts.md | Evidence, qualification results, and remaining limits. |
| docs/roadmap.md | M7.3 completion evidence and next roadmap item. |

The current generic compiler emitter already preserves version 2 component
metadata. Task 4 first pins that behavior for v3 and extension records; change
compiler source only if that focused test demonstrates a field is dropped.
Do not add an entrypoint or runtime dependency for this feature.

---

### Task 1: Add token visibility to identified token contracts

**Files:**
- Modify: packages/css/src/tokens/identity.ts
- Modify: packages/css/src/theme-token.ts
- Modify: packages/css/src/tokens/domains.ts
- Modify: packages/css/src/tokens/index.ts
- Modify: packages/css/test/token-contract-identity.property.test.ts
- Modify: packages/css/test/token-contract-identity-types.ts

**Interfaces:**
- Consumes: TokenContractIdentity, TokenContractIdentityInput, DomainThemeVar, tokenContractShapeSignature, registerThemeTokenReference, and createTokenContract.
- Produces: TokenContractVisibilityPath, TokenContractVisibility, additive TokenContractOptions.visibility.public, PublicDomainThemeVar and PrivateDomainThemeVar types, a public/private token-reference type marker, and an internal getThemeTokenVisibility(token) lookup for extension authoring.
- createTokenContract continues accepting a direct TokenContractIdentity and the existing {identity} form. The new visibility form is {identity, visibility: {public: readonly TokenContractVisibilityPath[]}}.
- An omitted visibility block on an identified contract means all definition-token paths are public. Visibility without an identity throws.

- [ ] **Step 1: Add failing visibility and identity tests**

In token-contract-identity.property.test.ts, add one identified contract with public color.accent, private color.internal, and semantic.foreground as an alias of color.accent. Assert that public IDs are unchanged, the alias inherits public visibility, the private definition and its aliases are private, an identity-bearing contract without visibility remains all-public, and a visibility block without identity throws. Add cases for an unknown definition path, a duplicate public path, and attempting to publish an alias path directly.

Add an identity-collision test: create an identity and shape with color.accent public, then recreate the same identity and shape with color.accent private. Expect the existing token identity collision diagnostic.

Add a fixed-seed fast-check property that permutes the public path list and proves the canonical visibility signature is order-independent while different public sets conflict for a reused identity. Use seed 20260923 and 50 runs.

In token-contract-identity-types.ts, add public and private token-reference assignments from the same contract. The public reference must assign to the public-token style type; the private reference must fail that assignment with @ts-expect-error.

~~~ts
import {createTokenContract, defineToken, type PublicDomainThemeVar} from "../src/tokens"

const visible = createTokenContract({
  color: {accent: defineToken("color"), internal: defineToken("color")},
}, {
  identity: {owner: "@acme/tokens", name: "visibility", version: 1},
  visibility: {public: [["color", "accent"]]},
})

const publicReference: PublicDomainThemeVar = visible.color.accent
// @ts-expect-error internal token is not part of the public surface
const privateReference: PublicDomainThemeVar = visible.color.internal
void [publicReference, privateReference]
~~~

- [ ] **Step 2: Run the red token tests and type fixture**

Run:

~~~sh
bun test packages/css/test/token-contract-identity.property.test.ts
bun run typecheck
~~~

Expected: visibility option/type imports are missing, token references do not
carry a visibility distinction, and visibility changes do not participate in
identity collision checks. Keep all negative type assertions active.

- [ ] **Step 3: Add canonical visibility types and identity signature input**

In tokens/identity.ts, define path canonicalization by length-prefixing each
segment, sort the encoded paths, and add the result to the existing contract
shape signature. Keep path order independent and preserve the existing token
ID and CSS variable functions byte-for-byte. An omitted visibility option
canonicalizes to the full definition-token path set, matching legacy
all-public behavior.

~~~ts
export type TokenContractVisibilityPath = ReadonlyArray<string>
export type TokenContractVisibility = {
  readonly public: ReadonlyArray<TokenContractVisibilityPath>
}

export type PublicDomainThemeVar<TDomain extends TokenDomain = TokenDomain> =
  DomainThemeVar<TDomain, "public">
export type PrivateDomainThemeVar<TDomain extends TokenDomain = TokenDomain> =
  DomainThemeVar<TDomain, "private">

export function tokenContractVisibilitySignature(
  paths: ReadonlyArray<TokenContractVisibilityPath>,
): string {
  return [...paths]
    .map(path => path.map(segment => segment.length + ":" + segment).join("/"))
    .sort()
    .join(";")
}
~~~

- [ ] **Step 4: Validate paths and register visibility on token references**

In tokens/domains.ts, normalize the identity/options input without changing
either legacy call form. Resolve aliases first; require each listed public path
to name a definition token; reject empty segments, duplicate paths, unknown
paths, alias paths, and visibility without identity. Treat every unlisted
definition path as private. Set an alias's effective visibility from its
terminal definition target.

In theme-token.ts, add visibility to ThemeTokenReferenceMetadata and to the
global collision check. Register the effective visibility with each token
reference, include the visibility signature in the existing identity
signature, and expose only an internal getter. Keep getTokenId and external
payload value handling unchanged. Thread the public/private generic through
TokenContractNode so the type fixture distinguishes references by path.

- [ ] **Step 5: Run the token tests and commit Task 1**

Run:

~~~sh
bun test packages/css/test/token-contract-identity.property.test.ts packages/css/test/token-theme-external.test.ts
bun run typecheck
~~~

Expected: all existing identity/alias/external-payload cases pass, the new
visibility membership and collision cases pass, and the public/private type
fixture compiles with its one expected error. Commit only Task 1 files with
message `feat: add token contract visibility`.

---

### Task 2: Add version 3 component contracts and public selection types

**Files:**
- Create: packages/css/src/components/contracts.ts
- Modify: packages/css/src/components/index.ts
- Modify: packages/css/src/native-tags.ts
- Modify: packages/css/src/native-style.ts
- Modify: packages/css/src/runtime/component-recipe-resolution-plan.ts
- Modify: packages/css/src/theme-runtime.ts
- Modify: packages/css/test/component-recipe-types.ts
- Modify: packages/css/test/component-recipe-authoring.test.ts
- Modify: packages/css/test/component-recipe-resolution-plan.test.ts
- Modify: packages/css/test/component-recipe-runtime.test.ts
- Modify: packages/css/test/component-recipe-theme.test.ts
- Modify: packages/css/test/component-recipe-compiler.test.ts
- Modify: packages/css/test/public-api.test.ts

**Interfaces:**
- Consumes: M7.2 NativeComponentRecipeConfig/Props/Descriptor, NativeComponentStateVariants, token visibility metadata, and the existing recipe resolution plan.
- Produces: NativeComponentContractIdentity, NativeComponentContract, NativeComponentRecipeContractVersion = 3, NativeComponentPublicProps<TRecipe>, and v3 recipe authoring when config.contract is present.
- No contract means output version 2. A contract means output version 3 with required identity/public metadata and optional extensionPoints.
- The base-only v3 resolver keeps the full owner selection type. The narrowed consumer type is NativeComponentPublicProps<TRecipe>.

- [ ] **Step 1: Add failing v3 descriptor and public-props fixtures**

Extend component-recipe-types.ts with a contract-bearing button whose private
slot is internalIcon, whose public tone values are primary and quiet, and whose
private tone value is dangerInternal. Assert NativeComponentRecipeProps still
accepts the owner's full density axis, while NativeComponentPublicProps accepts
tone: quiet and rejects density and tone: dangerInternal with
@ts-expect-error.

Add a public state discriminator whose every case constraint references
declared public axes and values. Add a negative contract whose public state
case requires a private axis. In component-recipe-authoring.test.ts, assert a
contract-bearing recipe emits version 3 and a recipe without contract still
emits version 2. Add a collision test that authors two recipes with the same
contract identity but different public surfaces and expects admission to fail.
Also assert an extension permission naming an undeclared or private axis/slot
is rejected.

~~~ts
const button = componentRecipe({
  contract: {
    identity: {owner: "@acme/ui", name: "Button", version: 1},
    public: {slots: ["root"], variants: {tone: ["primary", "quiet"]}},
  },
  slots: {root: "view", internalIcon: "image"},
  variants: {
    tone: {
      primary: {root: {opacity: 1}},
      quiet: {root: {opacity: 0.8}},
      dangerInternal: {root: {opacity: 0.4}},
    },
    density: {compact: {internalIcon: {width: 12}}},
  },
  defaultVariants: {tone: "primary", density: "compact"},
})

type InternalButtonSelection = NativeComponentRecipeProps<typeof button>
type PublicButtonSelection = NativeComponentPublicProps<typeof button>
const internalSelection: InternalButtonSelection = {density: "compact"}
const publicSelection: PublicButtonSelection = {tone: "quiet"}
// @ts-expect-error density is private
const hiddenAxis: PublicButtonSelection = {density: "compact"}
// @ts-expect-error this value is private
const hiddenValue: PublicButtonSelection = {tone: "dangerInternal"}
void [internalSelection, publicSelection, hiddenAxis, hiddenValue]
~~~

- [ ] **Step 2: Run the red component authoring and type gates**

Run:

~~~sh
bun test packages/css/test/component-recipe-authoring.test.ts packages/css/test/public-api.test.ts
bun run typecheck
~~~

Expected: contract config, v3 version, and NativeComponentPublicProps are
missing; the invalid private state projection is not rejected. Do not weaken
the negative fixture.

- [ ] **Step 3: Define component contract data and runtime validation**

Create components/contracts.ts with the identity and metadata types, a
canonical metadata signature, a duplicate-copy-safe identity registry, and a
pure-data validator. Validate the positive-safe-integer identity, exact public
slot membership, public variant axes and values, unique entries, and
extensionPoints against the actual recipe surfaces. Omitted axes, slots, and
values stay private. Reject public state discriminators that omit a case or
depend on an undeclared axis/value. Return a deeply frozen descriptor-ready
record; do not import React, Effect, or compiler modules in this file.

~~~ts
export type NativeComponentContractIdentity = {
  readonly owner: string
  readonly name: string
  readonly version: number
}

export type NativeComponentContract = {
  readonly identity: NativeComponentContractIdentity
  readonly public: {
    readonly slots: ReadonlyArray<string>
    readonly variants: Readonly<Record<string, ReadonlyArray<string>>>
  }
  readonly extensionPoints?: {
    readonly defaults?: ReadonlyArray<string>
    readonly variantValues?: ReadonlyArray<string>
    readonly compoundVariants?: true
    readonly slotStyles?: ReadonlyArray<string>
  }
}
~~~

- [ ] **Step 4: Make recipe authoring conditional on the contract**

In native-tags.ts, add the component contract version constant without
changing the existing legacy and v2 constants. In components/index.ts, add
optional config.contract, preserve existing v2 return inference when it is
omitted, and return the contract-bearing recipe type with version 3 when it is
present. Deep-freeze the validated metadata before returning. Add optional
contract metadata to componentRecipeFromRecipe; keep its existing two-argument
behavior and v2 output when omitted.

Add NativeComponentPublicProps<TRecipe> by projecting only public axes and
values from the recipe's inferred variants. Preserve the M7.2 discriminated
union only when all public state constraints remain expressible. Re-export the
new authoring types and version constant from native-style.ts.

- [ ] **Step 5: Admit and resolve base v3 recipes with exact local precedence**

In component-recipe-resolution-plan.ts, admit v1, v2, and v3. Validate the v3
contract against descriptor slots, variants, state constraints, and defaults.
For v3 only, skip the selected state-discriminator branch during ordinary
variant iteration and append it immediately after ordinary branches. Keep
v1/v2 iteration unchanged. Preserve contract metadata through
resolveComponentRecipeThemeTokens in theme-runtime.ts.

Add tests for the order base → ordinary variants → discriminator → compounds,
invalid state producing base-only slot arrays, malformed public surfaces
failing at plan construction, and both old recipe versions retaining exact
outputs.

- [ ] **Step 6: Run focused M7.3 v3 tests and commit Task 2**

Run:

~~~sh
bun test packages/css/test/component-recipe-authoring.test.ts packages/css/test/component-recipe-resolution-plan.test.ts packages/css/test/component-recipe-runtime.test.ts packages/css/test/component-recipe-theme.test.ts packages/css/test/public-api.test.ts
bun run typecheck
~~~

Update component-recipe-compiler.test.ts expectations only for the new
contract-bearing fixture; ordinary recipes must still compile as version 2.
Commit the v3 contract/types slice as feat: add public component recipe contracts.

---

### Task 3: Add sealed-by-default extension descriptors and ordered resolution

**Files:**
- Create: packages/css/src/components/extension-contract.ts
- Create: packages/css/src/components/extensions.ts
- Modify: packages/css/src/components/index.ts
- Modify: packages/css/src/native-tags.ts
- Modify: packages/css/src/native-style.ts
- Modify: packages/css/src/runtime/component-recipe-resolution-plan.ts
- Modify: packages/css/src/theme-runtime.ts
- Create: packages/css/test/component-recipe-extension.test.ts
- Modify: packages/css/test/component-recipe-types.ts
- Modify: packages/css/test/component-recipe-resolution-plan.test.ts
- Modify: packages/css/test/component-recipe-runtime.test.ts

**Interfaces:**
- Consumes: version 3 component metadata, token visibility lookup, and the base-only v3 resolution plan.
- Produces: runtime-safe NativeComponentRecipeExtensionType, NativeComponentRecipeExtensionVersion = 1, NativeComponentRecipeExtensionDescriptor with identity, componentIdentity, optional parentExtensionIdentity, defaultVariants, added-only variants, compoundVariants, and slotOverrides; pure chain guards/validation; the style-entry builder extendComponentRecipe(base, config, priorExtensions?); and resolver-plan options with an ordered extensions array.
- createComponentRecipeResolutionPlan(recipe, {extensions}) validates the whole chain once. createComponentRecipeResolver(recipe, {extensions}) returns the public selection type. resolveComponentRecipeStyles(recipe, selection, {extensions}) uses the same plan semantics.
- A resolver instance fixes its extension chain at creation; its existing bounded cache remains keyed by normalized selection.

- [ ] **Step 1: Add failing extension descriptor, type, and order tests**

Create component-recipe-extension.test.ts. Assert that a valid extension may
change an allowed tone default, add a new tone value, add one compound, and
override one permitted slot. Add negative cases for each sealed operation:
default change on an unpermitted axis, new value on an unpermitted axis,
compound without permission, private/undeclared slot style, replacement of an
existing branch, added axis, changed state constraint, private token use,
unsupported descriptor versions, and non-data records such as functions or
class instances in descriptor fields.

Add a two-extension chain and a collision where the leaf repeats a value added
by the non-immediate ancestor. Assert mismatched base identity and parent
identity fail at resolver-plan construction. Include the exact valid output
array order. In this fixture the owner axis order is size then tone; the
selected owner size branch contributes backgroundColor navy, the extension's
new tone brand contributes backgroundColor brand, the matching owner compound
contributes borderRadius 12, and the extension root override contributes
borderWidth 1. Also reject a default change that makes normalized state
invalid, an extension identity colliding with the base or an earlier
extension, unsupported descriptor versions, and non-data descriptor fields
such as functions or class instances:

~~~ts
expect(resolveButton({tone: "brand", size: "large"}).root).toEqual([
  {padding: 8},
  {backgroundColor: "navy"},
  {backgroundColor: "brand"},
  {borderRadius: 12},
  {borderWidth: 1},
])
~~~

- [ ] **Step 2: Run the red extension type and runtime gates**

Run:

~~~sh
bun test packages/css/test/component-recipe-extension.test.ts packages/css/test/component-recipe-resolution-plan.test.ts
bun run typecheck
~~~

Expected: extension tags, authoring API, resolver extension option, and
chain-specific output are missing. Keep the existing v1/v2 tests passing.

- [ ] **Step 3: Define runtime-safe extension DTOs and additive type inference**

In native-tags.ts, add the version 1 extension tag and version constants. In
components/extension-contract.ts, define the immutable plain-data descriptor
and its runtime guards with fields identity, componentIdentity,
parentExtensionIdentity when present, defaultVariants, added-only variants,
compoundVariants, and slotOverrides. This pure module may depend on
runtime-safe identity and record helpers only; do not import
components/extensions.ts, authorNativeStyle, vanilla-extract, compiler, Effect,
or theme authoring modules. Add public selection inference for the base plus
extension values in the exported component types. Do not place a recipe
object, class instance, callback, schema AST, or optic inside the descriptor.

In components/extensions.ts, implement extendComponentRecipe(base, config,
priorExtensions = []) as the style authoring builder. It calls the pure
extension-contract.ts validators, then uses authorNativeStyle only after all
structural permissions have passed. Re-export the builder and descriptor
types through native-style.ts. Use the builder so a later extension can be
validated against the full ordered ancestry. The array is ordered base-to-leaf.
Emit the immediate parent identity from its final entry. Keep the
two-argument first-extension call shown in the spec valid.

- [ ] **Step 4: Enforce all permissions before authoring styles**

Validate that the base is a contract-bearing v3 recipe; every prior extension
belongs to the same component and forms a linear chain; identities do not
repeat; operations match extensionPoints; added values are new across the
entire chain; selectors name public values available at that point; defaults
remain valid under the owner's unchanged state constraints; and every style
token reference belongs to a public token path. Check all structural
conditions before authorNativeStyle captures any extension branch.

Use the existing primitive-aware slot authoring path to turn branch styles
into class references. Freeze every descriptor record and array.

- [ ] **Step 5: Compile the full extension chain into one runtime plan**

Add ComponentRecipeResolutionPlanOptions with optional extensions to
component-recipe-resolution-plan.ts. Import only DTO guards and chain
validation from extension-contract.ts, never the authoring builder. Validate
the chain and precompute merged
defaults, public selection keys/values, added variant maps, compounds, and
slot overrides during plan creation. Keep the owner's variant axis order.

At resolution, merge owner defaults, extension defaults from base to leaf,
then caller selection. Reject unknown keys and private axes at the extension
resolver boundary. Validate state before adding any extension branch; invalid
state returns owner base styles only. For each ordinary axis, append exactly
the one selected branch (from the owner map or the extension added-value map)
at that axis's position in owner variant order; never append both an old owner
default branch and the selected extension-added value. Then append the
discriminator branch, compounds in owner/base-to-leaf declaration order, and
slot overrides base-to-leaf. Do not run contract or token registry lookups in
the selection loop.

- [ ] **Step 6: Add resolver overloads and focused extension regressions**

Add extensions to ComponentRecipeResolverOptions. With no extensions, preserve
the existing resolver function and cache behavior. With a non-empty extension
chain, type the resolver selection as NativeComponentPublicProps of the final
descriptor. Reject unknown keys and private axes at runtime; report and skip
an unknown value on a declared public axis under the existing invalid-variant
behavior. Add the same optional extension chain to direct style resolution
and pass it through to plan construction.

Test caller selection overriding extension defaults, later extension defaults
overriding earlier defaults, invalid state returning only owner base styles,
slot override ordering, empty slots remaining frozen arrays, and cache reuse
for identical normalized selections. Assert unknown keys and private axes are
rejected, while invalid public values report once and contribute no branch.

- [ ] **Step 7: Run M7.3 extension gates and commit Task 3**

Run:

~~~sh
bun test packages/css/test/component-recipe-extension.test.ts packages/css/test/component-recipe-resolution-plan.test.ts packages/css/test/component-recipe-runtime.test.ts
bun run typecheck
~~~

Commit the authoring/extension-plan slice as feat: add component recipe
extensions, only after all listed focused tests pass. Do not claim M7.4
product-team migration or M9 manifest support.

---

### Task 4: Preserve v3 and extension data through theme and package boundaries

**Files:**
- Modify: packages/css/src/theme-runtime.ts
- Modify: packages/css/test/component-recipe-theme.test.ts
- Modify: packages/css/test/component-recipe-compiler.test.ts
- Modify: packages/css/test/pack-consumer-contract.test.ts
- Modify: packages/css/test/runtime-isolation.test.ts
- Modify: packages/css/test/public-api.test.ts

**Interfaces:**
- Consumes: version 3 component and version 1 extension DTOs, extension resolver options, existing compiler capture/emitter, and the theme/core entrypoint split.
- Produces: theme-token transformation for both descriptor tags, exact style/theme export types, and packed ESM/CommonJS evidence for the public API.
- Do not create a new build entrypoint or runtime dependency. Compiler source changes are permitted only when a new failing capture test proves metadata is not preserved.

- [ ] **Step 1: Add failing theme-resolution preservation tests**

Extend component-recipe-theme.test.ts with v3 contract metadata and an
extension containing a token reference in each authored style field. Assert
resolveThemeTokens returns a frozen transformed descriptor, preserves
component/extension identities and parent linkage, resolves all slot tokens,
and returns the original reference when no token changes. Add malformed v3
metadata and unsupported-version cases.

- [ ] **Step 2: Add failing compiler capture/emission fixtures**

Extend component-recipe-compiler.test.ts to compile one uncontracted v2 recipe,
one v3 recipe, and one extension descriptor in a .css.ts fixture. Assert the
exact descriptor tags, versions, public/private metadata, parent identity,
all extension operations, and registered class references survive emission.
The v2 fixture must still produce version 2 with no new contract field.

- [ ] **Step 3: Run the red theme/compiler tests**

Run:

~~~sh
bun test packages/css/test/component-recipe-theme.test.ts packages/css/test/component-recipe-compiler.test.ts
~~~

Expected: theme runtime either rejects v3 or drops extension metadata, and the
compiler fixture identifies any field that is not preserved. If the compiler
test already passes, leave compiler source unchanged.

The existing emitter is the serialized DTO boundary. If capture or artifact
admission decodes into a shape different from the emitted plain descriptor,
add an Effect 4 Schema.Codec under the compiler/contracts boundary and test
encode/decode round-tripping there. If both sides use the same descriptor
shape, keep Effect Schema out of this path and use runtime-safe structural
guards; never decode it during theme resolution or selection.

- [ ] **Step 4: Extend theme transformation and typed export mapping**

Teach theme-runtime.ts to recognize the extension tag, transform its
slotOverrides, added variant styles, and compound styles, preserve descriptor
identity/permission metadata, deep-freeze changed results, and return the
original immutable descriptor when no token reference changes. Update
ResolvedNativeStyleInput and ResolvedThemeStyles so direct descriptors and
style maps retain their concrete recipe/extension types.

Keep cache identity scoped to theme plus descriptor object. Never cache
extension resolution globally by contract name or perform token visibility
checks during render.

- [ ] **Step 5: Add packed-consumer and runtime-isolation assertions**

Extend pack-consumer-contract.test.ts so the packed style entry authors a v3
recipe and an extension, and the packed theme entry resolves the tokens and
returns the exact ordered slot styles. Assert consumer TypeScript accepts a
public extension selection and rejects a private axis/value.

Extend runtime-isolation.test.ts for both ESM and CommonJS theme entries.
Assert the extension path runs while Effect, vanilla-extract, compiler,
native-capture, and Node built-ins are denied. Keep expected externals limited
to React. Assert unsupported future versions fail closed and existing v1/v2
fixtures still pass. Add a clearly labelled fixture-level M7.2 admission
check with its fixed version allow-list [1, 2] and assert that it rejects v3.
This proves the descriptor-version compatibility rule; it does not claim that
an older published package binary was executed.

- [ ] **Step 6: Build, test packed artifacts, and commit Task 4**

Run:

~~~sh
bun run build
bun test packages/css/test/component-recipe-theme.test.ts packages/css/test/component-recipe-compiler.test.ts packages/css/test/pack-consumer-contract.test.ts packages/css/test/runtime-isolation.test.ts packages/css/test/public-api.test.ts
bun run typecheck
~~~

Commit the package-boundary slice as feat: preserve and qualify extended
component descriptors after the packed consumer and isolated runtime checks
pass in both formats.

---

### Task 5: Add independent composition laws, dogfood, and M7.3 evidence

**Files:**
- Modify: packages/css/test/component-recipe-runtime.property.test.ts
- Modify: apps/storybook/src/components/ShowcaseCard.css.ts
- Modify: apps/storybook/src/components/ShowcaseCard.tsx
- Modify: docs/src/content/docs/reference/package-entrypoints-and-apis.mdx
- Create: docs/assessments/2026-09-23-m7-3-public-private-component-contracts.md
- Modify: docs/roadmap.md

**Interfaces:**
- Consumes: token visibility, public component selection, extension authoring, compiled theme resolution, and the final v3 resolver.
- Produces: independent semantic evidence, a plan-size law, one public-contract Storybook component, API docs, an evidence assessment, and the M7.3 roadmap ledger update.
- Storybook uses only the public component contract. No visual/native acceptance claim is added without a device run.

- [ ] **Step 1: Add an independent reference evaluator**

In component-recipe-runtime.property.test.ts, add a small authored fixture with
two axes, one discriminator, two extension layers, compounds, and slot
overrides. Write the reference evaluator directly from the documented order:
merge owner defaults, extension defaults base-to-leaf, then caller values;
check state constraints from a literal table; then append base, ordinary
variants in authored axis order, the discriminator branch, compounds, and
overrides. Do not call createComponentRecipeResolutionPlan,
resolveComponentRecipeResolutionPlan, canonicalRecipeSelectionKey, or the
production append helper from the oracle. Keep a separate literal branch table
and state rules so expected values are not derived from the plan or extension
descriptors under test:

~~~ts
type Selection = {readonly tone?: string; readonly size?: string; readonly pressed?: boolean}
const ownerDefaults = {tone: "neutral", size: "small", pressed: false} as const
const baseExtensionDefaults = {tone: "brand"} as const
const leafExtensionDefaults = {tone: "seasonal"} as const
const ownerBase = {root: {padding: 4}}
const authoredBranches: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
  tone: {
    neutral: {backgroundColor: "white"},
    brand: {backgroundColor: "navy"},
    seasonal: {backgroundColor: "plum"},
  },
  size: {small: {minHeight: 32}, large: {minHeight: 44}},
  pressed: {false: {opacity: 1}, true: {opacity: 0.8}},
}
const stateRules: Readonly<Record<string, {readonly size: ReadonlyArray<string>}>> = {
  false: {size: ["small", "large"]},
  true: {size: ["large"]},
}
const authoredCompounds = [
  {matches: (s: Readonly<Record<string, unknown>>) => s.tone === "neutral" && s.size === "large", style: {borderColor: "gray"}},
  {matches: (s: Readonly<Record<string, unknown>>) => s.tone === "brand" && s.size === "large", style: {borderWidth: 1}},
  {matches: (s: Readonly<Record<string, unknown>>) => s.tone === "seasonal" && s.pressed === true, style: {borderRadius: 12}},
]
const baseSlotOverride = {root: {borderColor: "navy"}}
const leafSlotOverride = {root: {borderColor: "plum"}}
const ownerRecipe = {
  $$type: "crumbs.css.component-recipe",
  version: 3,
  contract: {
    identity: {owner: "@acme/ui", name: "Button", version: 1},
    public: {slots: ["root"], variants: {tone: ["neutral"], size: ["small", "large"], pressed: ["false", "true"]}},
    extensionPoints: {defaults: ["tone"], variantValues: ["tone"], compoundVariants: true, slotStyles: ["root"]},
  },
  slots: {root: "view"},
  base: ownerBase,
  variants: {
    tone: {neutral: {root: {backgroundColor: "white"}}},
    size: {small: {root: {minHeight: 32}}, large: {root: {minHeight: 44}}},
    pressed: {false: {root: {opacity: 1}}, true: {root: {opacity: 0.8}}},
  },
  defaultVariants: ownerDefaults,
  stateVariants: {pressed: {false: {size: ["small", "large"]}, true: {size: ["large"]}}},
  compoundVariants: [{variants: {tone: "neutral", size: "large"}, styles: {root: {borderColor: "gray"}}}],
} as const
const baseExtension = {
  $$type: "crumbs.css.component-recipe-extension",
  version: 1,
  identity: {owner: "@acme/brand", name: "Button", version: 1},
  componentIdentity: ownerRecipe.contract.identity,
  defaultVariants: baseExtensionDefaults,
  variants: {tone: {brand: {root: {backgroundColor: "navy"}}}},
  compoundVariants: [{variants: {tone: "brand", size: "large"}, styles: {root: {borderWidth: 1}}}],
  slotOverrides: baseSlotOverride,
} as const
const leafExtension = {
  $$type: "crumbs.css.component-recipe-extension",
  version: 1,
  identity: {owner: "@acme/product", name: "SeasonalButton", version: 1},
  componentIdentity: ownerRecipe.contract.identity,
  parentExtensionIdentity: baseExtension.identity,
  defaultVariants: leafExtensionDefaults,
  variants: {tone: {seasonal: {root: {backgroundColor: "plum"}}}},
  compoundVariants: [{variants: {tone: "seasonal", pressed: true}, styles: {root: {borderRadius: 12}}}],
  slotOverrides: leafSlotOverride,
} as const

const referenceResolve = (input: Selection) => {
  const selected = {...ownerDefaults, ...baseExtensionDefaults, ...leafExtensionDefaults, ...input}
  const stateRule = stateRules[String(selected.pressed)]
  if (stateRule === undefined || !stateRule.size.includes(String(selected.size))) {
    return {root: Object.freeze([ownerBase.root])}
  }
  const root: Array<unknown> = [ownerBase.root]
  for (const axis of ["tone", "size"] as const) {
    const branch = authoredBranches[axis]?.[String(selected[axis])]
    if (branch !== undefined) root.push(branch)
  }
  root.push(authoredBranches.pressed[String(selected.pressed)])
  for (const compound of authoredCompounds) {
    if (compound.matches(selected)) root.push(compound.style)
  }
  for (const override of [baseSlotOverride, leafSlotOverride]) {
    root.push(override.root)
  }
  return {root: Object.freeze(root)}
}
~~~

Generate partial caller selections by making each optional field either absent
or a value from its literal public domain, then remove absent fields before
calling the resolver. Add the explicit invalid-state input {pressed: true,
size: "small"}. Use fixed seed 20260923 and 200 runs:

~~~ts
const partialSelection = fc.record({
  tone: fc.option(fc.constantFrom("neutral", "brand", "seasonal"), {nil: undefined}),
  size: fc.option(fc.constantFrom("small", "large"), {nil: undefined}),
  pressed: fc.option(fc.boolean(), {nil: undefined}),
}).map(fields => Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)))
const selection = fc.oneof(partialSelection, fc.constant({pressed: true, size: "small"}))
const resolver = createComponentRecipeResolver(ownerRecipe, {extensions: [baseExtension, leafExtension]})
expect(resolver.plan.defaultSelection).toEqual({
  ...ownerDefaults,
  ...baseExtensionDefaults,
  ...leafExtensionDefaults,
})
fc.assert(fc.property(selection, input => {
  expect(resolver(input as never)).toEqual(referenceResolve(input as Selection))
}), {seed: 20260923, numRuns: 200})
~~~

Retain any minimized failure as a named deterministic regression. The
property callback may call the production resolver, but referenceResolve must
not call production plan, normalization, matcher, or append code.

- [ ] **Step 2: Add the plan-size law**

Create recipes with fixed axis count and increasing finite value counts and
compound/extension declarations. Inspect plan records and assert that their
counts equal the authored branch/constraint counts. Assert no plan field has a
number of entries equal to the product of variant domain sizes. Use explicit
counts for 2 axes × 3 values and 4 axes × 5 values so the test would fail if
the implementation eagerly materialized combinations.

- [ ] **Step 3: Dogfood a public multi-slot contract in the Storybook card**

In ShowcaseCard.css.ts, replace only the existing
action/actionPressed/actionLabel style triplet with a contract-bearing
root/label component recipe. Declare
only the root and label slots and the public pressed state/value; keep the
rest of the existing card styles unchanged. In ShowcaseCard.tsx, type its
selection as NativeComponentPublicProps. Keep useThemedStyles imported from
theme/core and import the component resolver from the full theme entry. Create
one bounded resolver for the themed recipe descriptor in useMemo keyed by
that descriptor, then select pressed/idle styles from Pressable's callback:

~~~tsx
import {useMemo} from "react"
import {createComponentRecipeResolver} from "@opsydyn/crumbs-css/theme"
import type {NativeComponentPublicProps} from "@opsydyn/crumbs-css/style"

type ActionSelection = NativeComponentPublicProps<typeof s.action>
const idleActionSelection: ActionSelection = {pressed: false}
const resolveAction = useMemo(
  () => createComponentRecipeResolver(styles.action),
  [styles.action],
)
const idleActionStyles = useMemo(() => resolveAction(idleActionSelection), [resolveAction])
<Pressable style={({pressed}) => resolveAction({pressed}).root}>
  <Text style={idleActionStyles.label}>{actionLabel}</Text>
</Pressable>
~~~
The TypeScript fixture must not expose an internal axis or token.

- [ ] **Step 4: Document the API and precedence**

Update package-entrypoints-and-apis.mdx with the token visibility example, the
component public/private declaration, the extension permissions, the owner
versus public selection types, the defaults merge, the five v3 style stages,
the invalid-state base-only result, v1/v2 compatibility, and the bounded
plan-at-construction behavior. State explicitly that visibility is
compatibility metadata rather than secrecy and that M9 tooling is later.

- [ ] **Step 5: Record evidence and update the M7.3 roadmap ledger**

Create the M7.3 assessment with exact commit IDs, focused test commands and
results, full qualification results, artifact formats tested, public API
changes, independent-oracle/plan-size/cache evidence, and known limits. Do not
report a device budget, older binary execution, Android acceptance, visual acceptance, M7.4
migration, or M9 manifest unless that evidence exists.

Update only the M7.3 row and evidence link in docs/roadmap.md after every
acceptance item below is verified. Leave M7.4/M7.5, M8/M9, and the Android
backlog unchanged.

- [ ] **Step 6: Run final package, Storybook, and documentation qualification**

Run:

~~~sh
bun run check
bun run app:typecheck
bun run docs:build
~~~

Expected: package build, complete test suite, package typecheck, Storybook
typecheck, and docs build exit successfully. Review git diff and git status to
confirm only M7.3 files changed and the three protected package/release files
remain untouched. Record actual outcomes and any unavailable native/device
gate in the assessment.

- [ ] **Step 7: Commit Task 5 and hand off the next roadmap item**

Commit the evidence/docs/dogfood slice as feat: complete M7.3 component
contracts after the final qualification has finished. Recommend roadmap M7.4
next: demonstrate a product-team extension without copying the component, and
verify that a private owner implementation
change preserves the public contract while removal of a public surface is
detected. Do not start M7.4 in this plan.

---

## M7.3 Acceptance Checklist

- [ ] Token visibility is stable, validated, type-visible, and part of identity compatibility checks.
- [ ] Contract-bearing component recipes emit v3; uncontracted recipes remain v2.
- [ ] Owner types retain private selections while public types expose only published axes and values.
- [ ] Extension operations are sealed by default and validated against the complete linear chain.
- [ ] Defaults merge owner → extensions base-to-leaf → caller; valid v3 styles follow the exact five-stage precedence.
- [ ] Invalid v3 state selections return only owner base slot styles.
- [ ] v1/v2 output and selection behavior are unchanged.
- [ ] Compiler, theme transformation, packed ESM/CommonJS, and runtime isolation evidence passes.
- [ ] Independent property oracle and size law pass.
- [ ] Storybook consumes one public multi-slot recipe type; documentation and assessment match verified behavior.
- [ ] Roadmap M7.3 is checked only after every relevant item above is complete.
