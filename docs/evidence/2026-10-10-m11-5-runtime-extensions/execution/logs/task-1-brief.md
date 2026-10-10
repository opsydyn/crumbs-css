## Task 1: Pure typed factories and descriptor-safe argument snapshots

**Files:** Authoring modules plus authoring/admission/type/property tests from the map; independent oracle admission/value comparisons. Enable the isolated package entry here because public-path compilation is part of the authoring deliverable.

**Interfaces:** `ExtensionConfig` exactly readonly importPath/importName; `ExtensionErrorCode` the eight Global Constraint codes. `ExtensionError` constructor is `(code: ExtensionErrorCode, path: string, reason: string)`; diagnostic text includes the stable code and safe path, and invalid JavaScript fields use constant fallback text instead of arbitrary coercion. `ExtensionFactory<F>` preserves supported factory Parameters/ReturnType. `ExtensionModule<TModule>` has only `.factory<const C extends ExtensionConfig>(config: C & CheckedFactoryConfig<TModule,NoInfer<C>>)`; its result uses the selected TModule[C['importName']]. Private checked types reject bad module witnesses at `defineExtension<TModule>(...proof: ModuleProof<TModule>): ExtensionModule<TModule>`; valid witnesses have a zero-length proof tuple, invalid ones require an impossible argument. `factory.ts` implements defineExtension and immutable builders/placeholders. `admission.ts` produces `copyExtensionArguments(args: readonly unknown[], path: string): readonly unknown[]`, shared descriptor/config checks and quota accounting; no runtime framework imports.

- [ ] Write `factory_never_loads_or_calls_runtime`, `placeholder_call_is_build_only`, `argument_snapshot_preserves_undefined_negative_zero_and_null_proto`, `later_input_mutation_does_not_change_snapshot`, `invalid_late_accessor_has_zero_calls` and exact-boundary/one-over tests for all limits. Inspect the own protocol descriptor, deep immutability and caller objects; assert no hidden registry. A synchronous pure sample factory `(label: string, count?: number) => (suffix: string) => string` supplies the type witness only.

```ts
const create = defineExtension<{make: (label: string, count?: number) => (suffix: string) => string}>()
  .factory({importPath:'@acme/extensions/pure',importName:'make'});
const item = create('card', undefined);
expect(() => item('!')).toThrow('extension.build-only-call');
const descriptor = Object.getOwnPropertyDescriptor(item, Symbol.for('crumbs.css.runtime-extension'))!;
expect([descriptor.enumerable, descriptor.writable, descriptor.configurable]).toEqual([false,false,false]);
expect(descriptor.value.args).toEqual(['card', undefined]);
```

- [ ] Run `bun test packages/css/test/runtime-extension-authoring.test.ts packages/css/test/runtime-extension-admission.test.ts` and `bun run --cwd packages/css typecheck`. Expected: RED on missing API/actual invariants; do not treat an unrelated missing dependency as the intended failure.
- [ ] Implement Task 1 signatures with descriptor-first copying, safe own-property creation, active-cycle detection and occurrence quotas. Use arrow placeholders so only name/length plus the protocol property are intrinsic own fields. Copy config before retaining it; reject extra config keys and JS invalid values. Build the exact ExtensionError and bounded paths without arbitrary value formatting.
- [ ] Add `/extensions` ESM/CJS export mappings, a standalone tsdown JS group and canonical declarations/CJS stubs. Add source type assertions for valid props/optional args and @ts-expect-error for extra keys through union/predeclared configs, any/unknown/index-signature modules, broad/union/default/absent names, class constructors, wrong args/results/props and async factories. Generic/overloaded contracts are not silently claimed to retain their original signature.
- [ ] Run `bun run build`, Task 1 tests and package typecheck. Expected: GREEN, exactly two new values/four public types, unchanged old inventories, no externals/old-entry imports for `/extensions`. Exercise all getter/symbol/hidden/prototype/tuple/cycle/finite/string/key/count/depth/aggregate boundaries, source immutability and forged versions.

**Checkpoint:** The public authoring entry makes safe typed placeholders and never calls the runtime factory; compiler support is still absent.

