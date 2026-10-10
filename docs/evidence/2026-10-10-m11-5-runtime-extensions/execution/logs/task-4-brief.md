## Task 4: Deterministic imports, reconstruction and independent laws

**Files:** Compiler runtime-extension-emission.ts; code-emission/transformer integration; emission/property/oracle tests, plus old module/ordinary-export controls.

**Interfaces:** `createRuntimeExtensionEmissionPlan(exportMap: ReadonlyMap<string,unknown>, classStyles: ReadonlyMap<string,Record<string,unknown>>, localPlans: ReadonlyMap<string,unknown>, linkage: RuntimeExtensionLinkage): RuntimeExtensionEmissionPlan`. Its private plan has imports:string, declarations:string, and `expressionFor(id:number):string`; it consumes Task 2 IDs/lowered args and Task 3 verified endpoints. The transformer passes the Task 3 linkage into an optional internal emission option; the module emitter constructs this plan only when extensions exist. Every captured endpoint must match a verified linkage endpoint, including in direct emission tests; a missing proof fails before publishing source. No new public facade value/type is added for this compiler-private plumbing. Imports/declarations use a private alias allocator reserving authored exports and existing _s/_l/generated names; no global emitter cache.

- [ ] Write `aliases_reconstruct_once_with_exact_arity_and_this`, `separate_calls_return_separate_functions`, `factory_throw_propagates_once`, `invalid_factory_or_result_has_stable_code`, `argument_snapshot_does_not_freeze_shared_style_table`, `null_proto_undefined_and_signed_zero_survive_runtime` and `ordinary_modules_emit_identical_bytes`. Use actual generated modules importing an independently authored pure runtime package; do not strip factory imports or replace them with a fake factory in the definitive runtime test.

```ts
// Runtime control module records calls; exported make uses a normal function.
// Authoring fixture exports first, firstAlias=first, nested=[first],
// and second from a separate invocation with the same args.
expect(runtime.first).toBe(runtime.firstAlias);
expect(runtime.nested[0]).toBe(runtime.first);
expect(runtime.second).not.toBe(runtime.first);
expect(control.calls.map(call => call.argc)).toEqual([2,2]);
expect(control.calls.every(call => call.thisValue === undefined)).toBe(true);
```

- [ ] Run `bun test packages/css/test/runtime-extension-emission.test.ts packages/css/test/runtime-extension.property.test.ts packages/css/test/m2-6-native-module-emission.test.ts packages/css/test/ordinary-exports.test.ts`. Expected: new semantics RED; old controls GREEN.
- [ ] Implement plan/signatures, lexical endpoint sorting/deduplication and one declaration per unique captured ID after native style creation. Serialize admitted ordinary args with existing undefined/-0/null-prototype/safe-own-key meaning; copy/deep-freeze fresh lowered argument objects once without freezing _s members. Emit ordinary TypeError guards with own code/path, call factory with undefined this/exact args and propagate user exceptions unchanged. Only private conditional helpers/imports appear; ordinary module bytes stay identical.
- [ ] Add seeded independent laws, seed 20261009 and at least 200 cases/law: portable-value equivalence, deterministic emission under named-export insertion permutations, snapshot immutability, alias/distinct invocation identity and unrelated-input independence. The oracle never imports product capture/admission/serializer bodies; use structural/value comparisons that include own undefined, Object.is(-0) and null prototype instead of JSON-only round trips. Minimize failures and add named regressions.
- [ ] Run Task 4 command plus package typecheck and Task 2 metadata tests. Expected: GREEN; no source function body/authoring import/registry appears in emitted code, unsupported local placement fails, and runtime checks preserve current native token metadata without phantom paths.

**Checkpoint:** Real compiled callable exports reconstruct once with independent semantic evidence; user factories still own all render behaviour.

