# Native expression v1

M6.3 defines a small inspectable expression language for Crumbs. It is a
versioned data model, not an evaluator. A compiler can validate, serialise and
collect dependencies from an expression without importing React, Effect,
native modules or user closures. Evaluation, constant folding and selective
invalidation remain M6.4 and M6.5 work.

## Domains and values

Every node carries one immutable domain. The domain is part of type checking
and runtime validation; values are never coerced between domains.

| Domain | Unit or format | Values | Supported scalar operators |
| --- | --- | --- | --- |
| `number` | `unitless` | finite numbers | add, subtract, scale, clamp |
| `length` | `px`, with an `allowNegative` flag | finite numbers, subject to the flag | add, subtract, scale, clamp |
| `duration` | `ms` | finite numbers | add, subtract, scale, clamp |
| `opacity` | `fraction` | numbers from 0 to 1 | scale, clamp |
| `color` | `native` | non-empty native colour strings | no scalar arithmetic |
| `enum` | a non-empty finite set of strings | one member of the set | no scalar arithmetic |

Enum members are unique and sorted when the domain is canonicalised. Length,
duration and number operations require the same complete domain, including the
length negative-value policy. Opacity arithmetic is deliberately restricted
because addition and subtraction could silently leave the valid range. Scale
factors and clamp bounds are finite; opacity clamp bounds must remain in the
fraction range.

## Nodes

The public `@opsydyn/crumbs-css/style` and package-root exports construct these
nodes:

- `literal` contains a validated value.
- `token-reference` identifies a token by name and declares a token
  dependency.
- `condition-reference` identifies one finite M6.1 condition axis. Its domain
  is the canonical enum for that axis and it declares a condition dependency.
- `alias` gives a nested expression a non-empty local name. It does not hide or
  add dependencies.
- `fallback` evaluates the primary branch first and reserves the fallback for
  a missing input. Domain or validation errors are not converted into missing
  inputs.
- `compose` keeps a non-empty, same-domain list in authored left-to-right
  order. It is intentionally order-sensitive; later evaluation defines how
  the ordered values combine.
- `add`, `subtract`, `scale` and `clamp` are the typed scalar operators in the
  table above.
- `match` selects by a finite condition axis. Cases are unique and stored in
  the axis's canonical order. A match with no fallback must cover every value;
  a partial case set therefore requires an explicit fallback.

`createNativeExpressionProgram` wraps a root node and repeats its canonical
dependency set. All nodes and programs are frozen. `isNativeExpression` and
`isNativeExpressionProgram` are structural guards for trusted version-1 data;
there is no executable field in the representation.

## Dependencies and missing inputs

Dependencies are the finite set of `{kind: "token", name}` and
`{kind: "condition", key}` records reachable from a node. They are
deduplicated and sorted by their stable `kind:key` identity. Composition order
does not affect the dependency set, while the node's ordered children remain
visible for later evaluation. A token reference is the only M6.3 node that can
be absent at resolution time; this is the only absence that `fallback` may
handle. Conditions are total over the finite M6.1 snapshot space.

The representation intentionally excludes arbitrary callbacks, promises,
Effect environments and opaque serialised code. Any future extension must add
a versioned node, a domain rule, dependency behaviour, validation errors and
property laws before it becomes portable.

## Evaluation and folding

M6.4 supplies a pure evaluator over an immutable input state containing a
finite condition snapshot and a token-value record. Literals and references
are validated against their declared domains. Composition evaluates every
entry from left to right and returns the last value, preserving the same
ordered composition rule used by native style merging. Arithmetic validates
its result before returning it. A missing token is a distinct evaluation
error; `fallback` catches that error only. Invalid token values, condition
values and domain results remain errors.

`foldNativeExpression` recursively folds child nodes and turns any
dependency-free result into one validated literal. Dynamic references and
their dependency sets remain data. Folding is therefore observationally
equivalent to evaluating the original expression with the same state.

`createNativeExpressionRuntime` evaluates a version-1 program once, then
accepts immutable input snapshots. It compares only the program's declared
token names and condition axes. An update to an unrelated token or condition
axis publishes the new input snapshot without evaluating the program; a
declared change evaluates and publishes the new value atomically. Runtime
statistics expose evaluation and skip counts for diagnostics. Disposed
runtimes reject further updates.

## M6.5 laws and native boundaries

Folding is a canonical pass: applying it twice produces the same graph as one
pass. The pass recursively replaces dependency-free descendants with validated
literals, including static branches below a dynamic token or condition
reference. It never removes or invents a declared token or condition
dependency.

The supported scalar laws are addition commutativity and associativity, scale
identity, clamp idempotence, and ordered composition association under the
last-winner rule. Evaluation is independent of object insertion order. Runtime
invalidation compares the declared dependency set only; unrelated token and
condition changes update the current input snapshot without re-evaluating.

Native consumers feed the runtime from `normalizeNativeConditionInput`. Width,
font-scale, orientation and RTL changes are observed through the finite
`NativeConditionSnapshot` axes, so continuous dimensions do not become cache
keys and changes within one bucket are skipped.
