# M6.1 native condition assessment

## Decision

Close M6.1 as the finite condition and lifecycle contract. Conditions are
represented by immutable snapshots with bounded axes, while raw native readings
are accepted only as transient inputs for bucket derivation. The runtime store
follows the existing external-store model and owns source subscription lifetime
so render consumers cannot accidentally retain native listeners.

## Snapshot model

`normalizeNativeConditionInput` accepts platform, width, height, RTL, font
scale, reduced-motion and contrast readings. It emits only these finite values:

- platform: `android`, `ios`, `macos`, `visionos`, `web`, `windows`, or
  `unknown`;
- width: `compact` below 600, `medium` from 600 through 839, and `expanded`
  from 840;
- height: `short` below 600, `regular` from 600 through 899, and `tall` from
  900;
- orientation: landscape only when width is greater than height, otherwise
  portrait;
- direction: `ltr` or `rtl`;
- font scale: `normal` below 1.15, `large` from 1.15 through 1.299…, and
  `extraLarge` from 1.3;
- motion: `full` or `reduced`;
- contrast: `normal`, `more`, or `less`.

`nativeConditionSnapshotKey` serialises those finite fields in a fixed order.
Continuous dimensions never appear in the key, so a resize within one bucket
preserves the snapshot reference and cannot grow a cache without bound.
Malformed or unknown fields fail closed before a snapshot is published.

## Precedence and lifecycle

`createNativeConditionResolver` evaluates typed branch matchers by specificity.
The branch that matches the most snapshot axes wins. Equal-specificity branches
use later declaration order, making overlap resolution explicit and reviewable.
An empty matcher is the default branch; the resolver's fallback is used when no
branch matches.

`createNativeConditionStore` accepts source adapters with `read` and
`subscribe` functions. It reads an initial patch, attaches all source listeners
when the first consumer subscribes, detaches them after the last consumer
unsubscribes, and re-reads sources on reactivation. Disposal is idempotent and
cleans up every source. Updates that change only raw dimensions within the same
finite buckets return `false`, preserve snapshot identity and do not notify.

The model is deliberately adapter-based: React Native integration supplies
platform, dimensions and accessibility sources without forcing a React Native
module import into the condition core. The React hook uses
`useSyncExternalStore` against the same bounded store.

## Qualification limits

The focused suite covers bucket boundaries, identity, resolver precedence,
malformed input, source activation/deactivation, reactivation and disposal.
Package build and typechecking remain required before commit. This slice does
not add responsive value normalisation, expression programs, container
measurement, continuous motion or native device/frame evidence; those remain
M6.2–M6.5 and M11 work. Android is still the final device-enabled move.
