## Task 1: Immutable definitions, exact public types and policy admission

**Interfaces:**

- `NativeMotionChannel` is the six spec strings; `NativeMotionEasing` is the four spec strings. `NativeMotionTarget = Readonly<Partial<Record<NativeMotionChannel, number>>>`; `MotionStateTable = Readonly<Record<string, NativeMotionTarget>>` is private.
- `NativeMotionDefinitionInput<S extends MotionStateTable = MotionStateTable>` has states:S and transition:{duration:number;easing:NativeMotionEasing}. `NativeMotionDefinition<S extends MotionStateTable = MotionStateTable>` has the exact tag/version, readonly copied S, readonly transition and a covariant type-only unique-symbol S marker. `NativeMotionState<D>` is Extract<keyof D['states'],string>.
- `defineMotion<const I extends NativeMotionDefinitionInput>(input: I & ExactMotionInput<I>): NativeMotionDefinition<I['states']>`. Private ExactMotionInput enforces no root/transition extras, nonempty inferred state/channel sets, no unsupported channel keys, and the union of inferred channels required in every state. Do not make the input constraint require all six channels before inference; use the captured literal I to refine the actual subset.
- `admitMotionDefinition(input: unknown): NativeMotionDefinition` validates the complete frozen descriptor; `admitMotionTarget<D>(definition:D,input:unknown):NativeMotionState<D>` checks a known name; `admitMotionOptions<D>(definition:D,input:unknown):AdmittedMotionOptions<D>` returns frozen initial/motion/effective-duration data. `validateMotionChannel(channel:NativeMotionChannel,input:unknown):number` and `validateMotionDuration(input:unknown):number` enforce the spec bounds. `motionChannels(definition):readonly NativeMotionChannel[]` returns the canonical owned set. Keep these private to source modules, outside both public value surfaces.

- [ ] Write named definition tests: `copies_without_freezing_input`, `all_states_have_one_exact_channel_set`, `rejects_accessors_without_execution`, `canonical_transform_order`, `native_numeric_and_duration_bounds`, `admits_frozen_foreign_v1_only`. Assertions pin resting `{opacity:.8,translateY:0}` / selected `{opacity:1,translateY:-4}`, 1/16 accepted versus 0/17 states rejected, six versus zero channels, -0 normalisation, opacity -0.01/1.01 rejected, NaN/Infinity/float32 overflow rejected, duration0/0.5/60000 accepted versus -1/60000.1 rejected, and four exact easings. Unknown/hidden/symbol/array/extra/prototype/getter data fails with zero getter calls.
- [ ] Write motion-types.ts with literal resting|selected inference and @ts-expect-error cases for unknown name, extra width/rotate, missing sibling channel, predeclared invalid state maps and mismatched channel sets. Positive fixtures include all six channels, negative scale, zero duration and NativeMotionDefinitionInput inference. Expected: no widened string/key escape and readonly output.
Representative RED assertion (the other named cases stay in the same test file):

```ts
test('copies_without_freezing_input', () => {
  const input = { states: { resting: { opacity: .8, translateY: 0 }, selected: { opacity: 1, translateY: -4 } }, transition: { duration: 180, easing: 'ease-out' as const } };
  const definition = defineMotion(input);
  input.states.resting.opacity = .4;
  expect(definition.states.resting.opacity).toBe(.8);
  expect(Object.isFrozen(input)).toBe(false);
  expect(Object.isFrozen(definition.states.resting)).toBe(true);
});
```

- [ ] Run `bun test packages/css/test/motion-definition.test.ts` and `bun run --cwd packages/css typecheck`. Expected: RED from missing new functions/types before bodies are written; retain the actual failures.
- [ ] Implement model/definition/policy and pure entry signatures above. Add exactly the seven approved motion diagnostic codes. Complete descriptor admission before reads/copy/freeze; validate foreign immutable outputs without package-local authenticity state. No new compiler or token-domain code.
- [ ] Add record-order/copy-preservation/getter-safety/domain property laws, seed20261009/300runs. Run `bun test packages/css/test/motion-definition.test.ts packages/css/test/motion-definition.property.test.ts packages/css/test/conditions.test.ts` and package typecheck. Expected: GREEN, original condition semantics intact.

**Checkpoint:** Pure bounded data contract and independently checked type/ingress rules; no native effects or task commit.

