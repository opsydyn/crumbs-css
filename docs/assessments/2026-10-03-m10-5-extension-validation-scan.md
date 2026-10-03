# M10.5 extension descriptor validation scan reduction

- Date: 2026-10-03
- Roadmap: M10.5
- Base revision: `81b0865`
- Status: retained low-risk validation cleanup; no measurable runtime improvement claimed

## Change

The extension contract's `dataRecordEntries` and `dataArray` helpers checked
`Object.getOwnPropertySymbols` and then immediately enumerated all own keys with
`Reflect.ownKeys`. The latter already includes symbols, which the existing loops
reject. The redundant symbol-only pass is removed. Plain-record, dense-array,
symbol-key, accessor, and prototype checks remain; the array symbol diagnostic
is preserved.

The focused regression test observes proxy own-key traps and requires one scan
for the descriptor record and the two scans the array still needs (key
validation and property-descriptor capture). It also verifies decorated records
and arrays remain rejected and accessors are not invoked. The new scan-count
assertion failed before the implementation change: the descriptor record was
enumerated twice.

## Performance evidence

Paired direct calls to `validateNativeComponentRecipeExtensionDescriptor` were
measured on Bun 1.4.2 against the parent revision's validator. These are host
microbenchmarks of descriptor normalization, not render-loop, Hermes, Metro,
or device measurements.

| Workload | Samples | Parent median | Candidate median | Observed delta |
| --- | ---: | ---: | ---: | ---: |
| One extension with two variant values and two compounds | 15 × 30,000 validations | 7.186 µs | 7.261 µs | 1.0% slower |
| Eight axes × six values, plus eight compounds | 15 × 2,000 validations, after 20,000 warm-ups and forced GC between samples | 67.070 µs | 66.920 µs | 0.2% faster |

The timing results are within observed run-to-run spread and do not demonstrate
a reliable speed-up. The deterministic result is one fewer own-key reflection
pass per record/array validation. Keep the change as a small validation-path
cleanup; do not count it as an M10.5 performance pass or adjust any budget.

## Verification and limits

- Focused contract, authoring, extension, and theme tests: 31 passed.
- Package typecheck and build: passed.
- Full package suite with `--max-concurrency=4`: 1,349 passed; the migration
  export graph test hit its 5-second timeout under suite load. Running
  `test/migration-export.test.ts` alone passed all four tests in 3.89 seconds.
- The default-concurrency full-suite run was not clean. The reduced-concurrency
  run is the broader result retained here; no source changes were made to
  unrelated tests or their timeouts.

M10.5 remains open. This slice provides no device, React Native, Hermes, editor,
visual, accessibility, or release-performance evidence. Android remains last.

Next recommended roadmap slice: **M10.5 targeted resolver CPU attribution** —
profile component-recipe and extension validation separately with representative
descriptors, then select only a candidate whose impact is measurable.
