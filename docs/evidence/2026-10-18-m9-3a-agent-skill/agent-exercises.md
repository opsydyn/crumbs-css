# Bounded portable-reference exercise

## Scenario and baseline

An Expo SDK58 app has Crumbs 1.3.0 installed. Add an inspector for the example Card
recipe within a nested theme, preserving onPress and excluding inspector dependencies
from production. Explain concrete boundaries, inputs, clipboard and partial/stale
diagnosis; also handle an installed 1.2.0 variant.

Before edits, a fresh agent read only the old skill and its local references, without
following external links or opening repository implementation. It reported:

> The portable skill cannot supply a concrete inspector implementation for either installed version.

It correctly preserved ordinary recipe/theme/native interaction guidance, but could
not retrieve inspector imports, provider/probe contracts, clipboard API, production
boundary, freshness/coverage handling or version admission. It declined to invent
APIs. This is a reference-coverage failure, not an unsafe fabricated implementation.

## Forward application and repair

A different fresh agent received the same scenario and the updated skill. It wrote
foundation, authored styles, ActionCard, App and two inspector modules in a temporary
folder. Its application used the documented development-only boundary, a deferred
original-namespace snapshot, a same-scope theme read and typed selection. It preserved
`onPress={onActionPress}` and supplied an asynchronous host-owned clipboard callback.
It distinguished recipe-only evidence from final native appearance, described
partial/stale reports, and excluded the widget on 1.2.0.

The agent identified one gap: local references named `TokenThemeScopeProvider` but
did not show its props. With the scenario's explicit fallback permission it checked
installed public declarations for `contract`, `context="mode"` and sparse `values`.
The reference was then extended with a complete scoped App example. A follow-up
review found the same application could now be built from the portable reference
alone; no substantive API/application errors remained.

The parent independently read the generated code and reran its strict typecheck
against the exact published package. The final reference examples separately passed
actual compilation/report assertions and production graph checks for all three
platforms. File hashes and outcomes are in [qualification.json](qualification.json).
The agent-generated host-callback variation was typechecked and inspected; it was
not separately run on a native device. The final reference's Expo Clipboard variant
was the one used for the production exports.

This is one bounded retrieval/application exercise. The repaired nested-scope
wording received follow-up review from the same forward agent, not another blind
sample. No quantitative claim about agent effectiveness is made.
