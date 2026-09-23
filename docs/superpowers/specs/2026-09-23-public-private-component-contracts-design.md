# Public component contracts and controlled extension design

**Status:** Proposed design for roadmap M7.3
**Governing decisions:** D5 (token identity), D6 (runtime plans and bounds),
D9 (component styling contracts), D10 (inspectable contracts), D11 (artifact
compatibility), and D12 (executable evidence) in the
[design-system ADR](../../decisions/adopt-native-design-system-compiler.md).

## Intent

M7.1 established primitive-aware component slots and shared variant selection.
M7.2 added exhaustive state constraints. Those recipes currently describe an
owner's full implementation, but do not say which token paths, slots, variant
axes, or values are compatibility promises to another package.

M7.3 adds explicit visibility and extension metadata. The owner remains the
source of the component recipe and its state rules. A consumer may extend only
the named surfaces and operations the owner permits. Serialized component and
extension data stays immutable plain data; the runtime compiles it into one
bounded resolution plan before selections are resolved.

Public and private describe compatibility and type-level access. They do not
provide secrecy or access control. A private token value, slot, or variant may
still be visible in a compiled artifact. Teams must not put secrets in style
contracts.

## Goals

- Mark selected token paths, component slots, variant axes, and variant values
  as public compatibility surfaces.
- Keep each component owner's full selection type separate from the narrowed
  type offered to consumers.
- Let owners opt into explicit, typed extension operations while keeping
  components sealed by default.
- Preserve one authoritative component recipe, one ordered extension chain,
  and the component owner's state constraints.
- Define exact selection defaults and style precedence for contract-bearing
  recipes.
- Reject malformed contracts, unauthorized extensions, stale identities, and
  unsupported versions at authoring or artifact admission.
- Compile descriptors to a small selection plan once; do not validate schemas,
  traverse extension metadata, or build style products during render.
- Preserve all v1 and v2 recipe behavior.

## Non-goals

- Product-team migration examples or proof that multiple packages extend one
  another without copying component code; that is M7.4.
- Accessibility behavior or ownership rules; that is M7.5.
- Change-impact reports, release comparison, policy files, or contract
  manifests; those are M9.
- Automatic token remapping, theme merging, arbitrary runtime closures, or
  extension diamonds.
- A mandatory component/widget framework.
- Consumer-facing Effect APIs or Effect values in render paths.
- Android or device performance acceptance.

## Chosen authoring contract

### Token visibility

Add an optional visibility block to the existing token contract options. The
legacy identity argument and the existing identity wrapper remain accepted.
Visibility requires a stable token contract identity. Paths are arrays of
segments, so keys containing punctuation are unambiguous.

~~~ts
createTokenContract(shape, {
  identity: {owner: "@acme/tokens", name: "Core", version: 2},
  visibility: {
    public: [
      ["color", "surface"],
      ["space", "control"],
    ],
  },
})
~~~

When visibility is present, the listed definition-token paths are public and
all other definition-token paths are private. Alias paths remain available as
token references under their existing IDs, but inherit the visibility of their
resolved definition token and cannot be supplied as external theme values.
Every listed path must resolve to a definition token in this contract. Public
token IDs continue to use the existing stable identity and path encoding;
visibility does not change an ID or its runtime lookup behavior.

For backward compatibility, an identity-bearing token contract with no
visibility block treats all of its existing definition-token paths as public.
A contract without an identity has no portable public token surface. Existing
theme payload validation and token values do not change. Public/private
metadata is compatibility information that tooling can inspect; it is not
redaction.

Visibility participates in token contract identity consistency checks. Two
loaded copies with the same identity and shape but conflicting visibility
metadata are incompatible. Changing the published path set is a contract
change, even though it does not change token IDs.

An extension may use only token references whose owning token contracts mark
them public. The component owner may continue to use private tokens in its own
recipe. This slice adds no token aliasing across contracts.

### Component visibility and permissions

Add an optional contract to componentRecipe. A recipe without this field keeps
emitting version 2. Supplying it opts the recipe into descriptor version 3.
The contract identity is a stable package/name/positive version triple; this
compatibility version is distinct from the serialized descriptor version.

~~~ts
const button = componentRecipe({
  contract: {
    identity: {owner: "@acme/ui", name: "Button", version: 1},
    public: {
      slots: ["root", "label"],
      variants: {
        tone: ["primary", "quiet"],
        size: ["small", "large"],
      },
    },
    extensionPoints: {
      defaults: ["tone"],
      variantValues: ["tone"],
      compoundVariants: true,
      slotStyles: ["root"],
    },
  },
  slots: {root: "view", label: "text", internalIcon: "image"},
  variants: {
    tone: {
      primary: {root: {backgroundColor: "navy"}},
      quiet: {root: {backgroundColor: "transparent"}},
      dangerInternal: {root: {backgroundColor: "maroon"}},
    },
    size: {
      small: {root: {minHeight: 32}},
      large: {root: {minHeight: 44}},
    },
    density: {
      compact: {internalIcon: {width: 12, height: 12}},
      roomy: {internalIcon: {width: 16, height: 16}},
    },
  },
  defaultVariants: {tone: "primary", size: "small", density: "compact"},
})
~~~

The contract lists only public slots, axes, and values. An omitted slot or axis,
or an omitted value under a listed axis, is private. The owner may author
private styles and use private values internally. Public state discriminators
must publish every state case and every axis/value required to express those
cases; a discriminator whose constraints depend on a private axis is private.
This keeps the consumer selection type an honest projection of the runtime
state rules.

Extension points are optional and sealed by default. Each permission is
independent:

- **defaults** names public axes whose default may be changed by an extension.
- **variantValues** names public axes to which extensions may add new values.
- **compoundVariants: true** permits additive compound branches.
- **slotStyles** names public slots which extension branches and final overrides
  may style.

Every slot written inside an added variant or compound must also be named in
slotStyles. Omitting extensionPoints, or omitting an operation from it, denies
that operation. Permissions cannot name private or unknown surfaces.
Declaring a surface public does not by itself grant permission to change it.

The owner-facing NativeComponentRecipeProps<T> continues to describe the
recipe's full internal selection. Add NativeComponentPublicProps<T> for the
public selection contract. It exposes only declared axes and values and
preserves the M7.2 state union when its public constraints are fully
expressible. The extension descriptor type carries the inherited public
selection plus its declared additions. The owner can keep selecting private
axes in its own implementation; consumers cannot select them through the
public resolver type.

componentRecipeFromRecipe may receive the same optional contract metadata.
Without it, the wrapper retains its existing v2 output; with it, the wrapper
emits v3 after validating the public slots, variants, and values against the
wrapped recipe.

### Separate extension descriptors

Extensions are created with a separate authoring function and produce a
versioned descriptor. They do not rewrite or copy the component recipe.

~~~ts
const brandedButton = extendComponentRecipe(button, {
  identity: {owner: "@acme/brand", name: "BrandedButton", version: 1},
  defaultVariants: {tone: "brand"},
  variants: {
    tone: {brand: {root: {backgroundColor: brandTokens.color.action}}},
  },
  compoundVariants: [
    {
      variants: {tone: "brand", size: "large"},
      styles: {root: {borderRadius: 12}},
    },
  ],
  slotOverrides: {root: {borderWidth: 1}},
})

const resolveButton = createComponentRecipeResolver(button, {
  extensions: [brandedButton],
})
~~~

The extension descriptor contains its own identity, the exact component
contract identity, and the identity of its immediate parent extension when
there is one. It contains only its default changes, newly added variant values,
new compounds, and permitted slot overrides. It contains no recipe pointer,
function, schema AST, or optic. A subsequent extension is authored from the
preceding extension descriptor and must name it as its parent.

Extensions form one linear base-to-leaf chain. Resolver construction receives
the owner recipe and an ordered chain, checks every parent identity, then
compiles the whole chain into one plan. The existing resolver with no
extensions retains its current call shape and behavior. Direct resolution and
theme-token resolution use the same compiled semantics when given an extension
chain.

The component recipe descriptor tag remains
crumbs.css.component-recipe; version 3 adds required contract metadata.
Extension descriptors use the tag crumbs.css.component-recipe-extension,
version 1. Both descriptors contain immutable plain data and style references
already supported by Crumbs' compiler. No closure is serialized.

## Extension rules

The authoring function and descriptor admission enforce the same rules:

- The base must be a version-3 recipe with a stable component identity.
- The extension identity must be valid and must not collide with its base or
  another extension identity in the chain.
- A default change may name only an axis listed in extensionPoints.defaults;
  later extensions may replace earlier extension defaults on that axis.
- An added variant value may name only an axis listed in
  extensionPoints.variantValues. Its value must not already exist in the base
  or preceding chain. It adds a public value and cannot replace an owner or
  earlier extension branch.
- New compounds require extensionPoints.compoundVariants. Their selectors
  may use only public axes and public values from the base or preceding chain.
  Every styled slot also requires extensionPoints.slotStyles permission.
- Slot overrides may name only slots listed in extensionPoints.slotStyles.
  They are patches applied after all matching compounds in chain order.
- An extension cannot add or remove slots or variant axes; replace owner or
  extension branches; change state cases, constraints, or the state
  discriminator; or write to a private surface.
- A default change must still produce a valid normalized state under the
  owner's unchanged M7.2 state constraints. Added values do not silently widen
  those constraints.
- Extension style token references must be public in their owning token
  contracts.

At runtime, an unknown selection key or a private/undeclared public selection
is rejected at the extension resolver boundary. An unknown or disallowed value
on a declared public axis is reported and skipped under the established
invalid-variant behavior; it cannot select a private branch. Owner-internal
resolution continues to accept the full owner selection type.

## Defaults and exact style precedence

For a v3 recipe, selection defaults are merged in this order:

1. Owner recipe defaults.
2. Each extension's defaults, from base to leaf.
3. The caller's explicit selection.

The caller's explicit selection therefore wins over every default. The
normalized selection is validated against the owner's unchanged state
constraints before adding any branch. If that state is invalid, resolution
returns the owner base slot styles only. It does not apply extension
contributions, variants, state styles, compounds, or overrides.

For a valid selection, v3 styles are appended in this exact order:

1. Owner recipe base slot styles.
2. Selected ordinary variant branches, using the owner's declared variant
   axis order. The selected state-discriminator branch is excluded here.
3. The selected state-discriminator branch, if the recipe declares
   stateVariants.
4. Matching compounds: owner compounds in declaration order, then each
   extension's compounds in base-to-leaf and declaration order.
5. Extension slot overrides in base-to-leaf order; later extensions append
   later style patches and therefore win under native composition semantics.

An extension's new value is selected through its existing public variant axis
and appears at that axis's position in the owner's variant order. V3 never
reorders axes based on extension declaration order. If no state discriminator
exists, step 3 is empty. Existing v1 and v2 descriptors retain their current
branch ordering exactly, including the current v2 behavior that applies all
selected variant branches in declared order before compounds.

## Compatibility and validation

New readers accept v1 legacy recipes, v2 state-capable recipes, v3
contract-bearing recipes, and extension v1 descriptors. They reject malformed
metadata, unsupported versions, mismatched component/parent identities,
unauthorized operations, invalid public state projections, and non-data
records before resolution. Older readers reject v3 and extension descriptors
as unsupported; they must never ignore contract or extension metadata.

Two base recipe artifacts claiming the same component identity but declaring
different public surfaces or extension permissions are incompatible. Changes
to private styles may retain the same public contract identity when their
public metadata and state contract remain unchanged.

The compatibility version inside a component or token identity is owned by
that publishing contract. M7.3 defines and validates the metadata but does
not compare releases, generate manifests, or infer semantic-version changes;
those belong to M9. Removing or changing a public surface requires the owner
to revise its compatibility identity according to its release policy.

Schema validation belongs at authoring, compiler capture, and external
artifact admission. The versioned schema/codec boundary uses the repository's
internal Effect 4 decision only where encoded and decoded data differ.
Ordinary consumers do not import Effect, and recipe resolution does not run
Effect schema traversal. The runtime plan performs finite structural checks
once at construction and stores only lookup data needed for selection.

## Runtime and performance contract

Plan construction compiles the owner recipe and linear extension chain once.
Resolution work grows with authored variant values, state constraints,
compounds, extension operations, and the selected axes. It never enumerates
the Cartesian product of variant values. Extension-chain and selection caches
remain explicitly bounded under the existing cache policy. Repeated
equivalent selections preserve the existing promised reference stability.

Extension data does not trigger per-render token visibility lookup, descriptor
walking, permission checks, schema decoding, optic construction, or branch-plan
rebuilding. The plan is compiled from immutable descriptor snapshots and their
identities; changing descriptor content requires creating a new plan.

## Acceptance evidence

- Type fixtures prove that owner selection still includes private axes, public
  props expose only declared axes/values, state unions remain valid, and
  extension types allow only declared operations and surfaces.
- Authoring tests cover public path validation, defaults, duplicate or
  conflicting extension identities, unauthorized operations, unknown/private
  slots and axes, attempted branch replacement, invalid added values, state
  constraints, and malformed descriptors.
- Runtime tests cover exact v3 ordering, base-to-leaf defaults and overrides,
  valid and invalid states, invalid public selections, and unchanged v1/v2
  output.
- A seeded fast-check property test compares composed output and default
  selection with an independent reference evaluator. The oracle must not reuse
  the implementation's normalized plan, matcher, or append helper.
- A size law proves plan entries grow with authored branches and extension
  operations rather than with the variant Cartesian product.
- Compiler capture/emission, token resolution, packed ESM/CommonJS consumer,
  older-runtime rejection, and Effect-free consumer/runtime isolation tests
  cover v3 and extension artifacts.
- Documentation explains public/private compatibility metadata, owner versus
  consumer types, extension permissions, precedence, identity/version
  behavior, and runtime plan cost.

M7.3 does not claim product-team migration success, M9 impact reporting,
visual acceptance, native device budgets, or Android qualification.

## Alternatives considered

| Option | Advantages | Costs and reason for outcome |
| --- | --- | --- |
| Explicit public metadata plus sealed-by-default extension operations | Makes compatibility promises inspectable; narrows consumer types; runtime can enforce additive extension rules without copying recipes | Adds versioned metadata and a separate descriptor; chosen to keep ownership and extension authority explicit. |
| Treat every existing slot and variant as public | Requires little metadata and eases initial migration | Makes implementation details accidental compatibility promises; rejected. |
| Let consumers replace the whole recipe | Maximizes flexibility | Loses the owner's state guarantees and makes branch precedence package-dependent; rejected. |
| Copy owner recipes into consumer packages | Simple runtime composition | Duplicates implementation and makes private fixes drift; rejected. |
| Arbitrary extension callbacks | Convenient for dynamic styling | Cannot be safely serialized, validated, linked, or bounded; rejected. |

## Delivery boundary

After approval, the implementation plan may update token contract visibility
metadata, component recipe types and construction, descriptor tags and version
handling, extension authoring and resolver plans, compiler/theme preservation,
package fixtures, type/property/runtime tests, and M7.3 documentation and
roadmap evidence. It must preserve v1/v2 semantics, keep Effect out of
consumer-facing types and render-time resolution, avoid M7.4/M9 claims, and
preserve the protected dirty files **.release-please-manifest.json**,
**bun.lock**, and **packages/css/package.json**.
