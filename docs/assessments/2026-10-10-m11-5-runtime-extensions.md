# M11.5 typed runtime extensions

Status: implementation and the single whole-slice review/Important repair pass are
complete. Final repaired-source host/types/cost/docs and12 iOS/12 Android phases
pass. Exact dependency restoration is independently verified. The new cold-transform
failure is retained under M10.5 by the direct user request to commit, push and
prepare v1, with no release waiver. M11.5 is complete in the single implementation
commit containing this record, subject to independent commit verification.

The additive `/extensions` entry exports `defineExtension` and `ExtensionError`
and four public types. A type-only namespace selects one explicit named,
synchronous factory returning a callable result. Compiler capture validates the
versioned marker and portable arguments, expands genuine native styles, verifies
static endpoints and emits one reconstruction per invocation. Aliases share that
result; equal distinct calls remain distinct. No closure/native peer executes
during authoring or endpoint verification. Existing public values and payload
versions remain unchanged.

The shared Storybook/playground reference directly imports generated components,
compares literal and existing-provider themed wrappers with independent View
controls, forwards native props/children, and exercises style overrides and a
real child Pressable. Its runtime source is byte-identical to the separate packed
extension fixture. Adapter paths deliberately differ: the workspace self-reference
is `@crumbs/storybook/runtime-extensions`; installed endpoints are
`@acme/crumbs-extensions/runtime` and `/authoring`.

## Current evidence

[Evidence packet](../evidence/2026-10-10-m11-5-runtime-extensions/README.md).
The full host receipt binds both tarballs, two physical Crumbs installations,
actual selected runtime files, installed package/config/source identities and
Expo iOS/Android/web maps. Source digests before/after match. Genuine Node22.0.0
and24.15.0 execute ESM/CommonJS peerless public-entry probes, and both real load
orders are recorded. Installed Bundler checking covers the native app; Node16
checking covers the explicit ESM contract fixture with canonical declarations.
It does not promise CommonJS TypeScript authoring through those ESM declarations.

Stock Metro exported an actual runtime factory-body edit and exact restoration;
its runtime, map and bundle hashes changed on edit and returned on restoration.
This is dependency proof, not interactive HMR acceptance.

The full regression run passed 1,828 CSS tests and 33 Storybook tests, with one
existing optional Node-floor context-reuse skip and zero failures. Strict package,
app and qualifier checks passed. Property laws use independent observable-shape
oracles and real generated modules. Negative type fixtures test malformed module
witnesses, union/excess configs, factory kinds and component props.

The working-tree docs build hit the known external-symlink Astro metadata failure.
Byte-identical source/config built33 pages in the frozen owned installation, whose
original sources were byte-verified restored. A subsequent empty-directory cleanup
error is retained and was independently repaired after verifying the directory was
empty; it did not alter product sources.

## Costs and product boundary

Two fresh processes consumed every callable for1/32/128 distinct results with
one endpoint and up to32 endpoint pairs. Output grows with copied frozen literals:
about1.1/14.3/55.7 kB raw for the one-endpoint cases; the128-result/32-endpoint case
is58.8 kB raw and about4.1 kB gzipped. Exact timing, byte counts, tool/source/artifact
identities, authoring snapshot cost, factory body time, cold imports, first use and
handwritten controls are retained in the cost receipts. These are diagnostic host
measurements with no new numeric gate or native FPS claim.

The100-factory/1,000-call monomorphic type fixture completed successfully with
extended diagnostics. This is one bounded workload, not editor responsiveness or
enterprise adoption evidence. The guide records the concrete setup change from
per-component wrappers to a reusable explicit runtime factory, without a claimed
time-saving study.

## Review and remaining acceptance

The single fresh reviewer found three Important gaps: the advertised32-container
depth boundary, missing names through mixed ESM-to-CJS graphs, and integration
resolution selecting a different runtime factory from stock Expo/Node. All were
reproduced RED and repaired in one pass;30 focused checks and the complete final
suite pass. Direct32-depth reconstruction remains admitted;33 containers remain
refused. Linkage follows stock conditions/main fields/extension order, binds absent
platform/native shadow candidates and rejects ambiguous suffix graphs, mixed
static ESM-to-CJS edges, and Node package maps with module-sync/node-addons.
These conservative limits are documented; no parser/resolver dependency is added.
One Minor is deferred: later lowering/linkage failures lose compatibility diagnostic
classification and stylesheet/export location, while still failing compilation with
the specific inner reason. There is no second review or performance optimisation
loop. See the retained review/repair/RED/GREEN logs in the evidence packet.

The current final repaired-source cohort passes12 iOS/12 Android phases: literal
foundations, light/dark themes, consumer override, unrelated state, both native
actions, stable factory/component lifetime, and real increased/restored font
preferences. All18 representative captures were directly inspected. The final
source/artifact/install/map/image/cost/budget audit verifies2,171 bindings; an
independent audit confirms owned device shutdown, ports/socket absence and original
font preferences. Earlier native proof is retained under pre-review-repair for its
older source and is not substituted for this cohort.

Storage attempts04/05 failed before Android boot and retain their failed receipts
and successful cleanup checks. User-approved removal of five superseded M11.4
dependency installs preserved all root files/ownership markers. Two superseded
executor-owned M11.5 consumer dependency installs were removed after source/tarball
verification; their other files, current consumer05 and all evidence remain.
Separate explicit approvals cleared only the Bun package cache and deleted only
the shut-down Crumbs Acceptance and M11.1 Local Vars Simulators. Reclamation settled
at9.3GiB free; the current owned target booted successfully without a replacement
AVD. All other Simulators were preserved.

Five original workspace dependency roots were restored with exact inodes and
inventories, along with two temporary owned link targets. Independent post-restoration
checks verify128 dependency inventory bindings, the unchanged lock and all2,171
accepted cohort bindings. These restored original roots are not represented as the
owned frozen installation used for qualification.

The final unchanged matched21-row budget report has stable source/artifact/policy
bindings and exact environment/measurement identities on every row. Nine blocking
rows pass. Cold transform fails at median85.069209ms against baseline66.404584ms
(+28.1%); warm fails at10.767208ms against5.664125ms (+90.1%). Current incremental
passes at135.038333ms against its136.34555ms cap; its historical M10.5 disposition
remains. Eight advisory rows fail; two token graph rows pass. The approved plan
requires explicit disposition for the new cold blocker. The concrete proposal is
to retain it under M10.5 release closure without changing limits or waiving the
release gate. The direct user then instructed documentation, commit, push and v1
release preparation after that handoff; the functional slice is closed while
release-policy qualification remains false. No unchanged-input budget retry occurred.
The temporary app dependency link and baseline inputs were restored exactly.

M10.5 release closure remains separate. No limits, dependency versions, release
policy decisions or lock files changed for M11.5. Physical devices, spoken readers,
browser interaction, live authored HMR and release FPS remain deferred. M11.6
stays parked; push/tag/GitHub v1 release are authorised by the subsequent direct user request.
Npm publication still requires its unchanged qualification workflow.
