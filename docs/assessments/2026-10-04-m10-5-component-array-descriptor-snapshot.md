# M10.5 component-contract array descriptor-snapshot fast path

- Date: 2026-10-04
- Roadmap: M10.5
- Baseline revision: `5c88b2edf394e75c1f12d6281600aaaea1aa9fa1`
- Status: implemented; bounded host benchmark improves the measured validator workload

## Change and compatibility decision

`readArray` validated an own-key list and then called
`Object.getOwnPropertyDescriptors`, which enumerated the array again. The
validator now saves the validated keys and reads each corresponding descriptor
from that snapshot. It retains the `length` descriptor read and the existing
symbol-first diagnostic precedence. The public types, emitted contract shape,
array validation rules, and accessor rejection are unchanged.

Proxy traps make enumeration counts observable. The baseline invokes a Proxy
array's `ownKeys` trap three times; this implementation invokes it twice: once
for the existing symbol check and once to obtain the key snapshot used for
validation and descriptor reads. Exact trap counts and ordering are not part of
the validator API contract. Stable proxy arrays in the regression case retain
the same normalized value and descriptor reads. Deliberately side-effectful or
stateful traps can observe the removed enumeration and are outside the
compatibility guarantee. Consumers must not rely on validation trap counts or
use trap side effects as part of component-contract semantics.

The faster per-index alternative was not selected because it skips the `length`
descriptor read and accepts a Proxy whose `length` descriptor trap throws; the
baseline rejects that input. The selected path continues to reject it.

## Performance evidence

The baseline source at the recorded revision and the candidate production source
were each built as unminified, source-mapped Node 22-targeted ESM. Thirteen
fresh Node v24.15.0 processes per variant performed 12,000 warm-up calls,
explicit GC, and 700 measured calls in a rotating order on macOS 26.6.2 arm64.

| Variant | Median per validation | Observed range |
| --- | ---: | ---: |
| Baseline | 21.024 µs | 20.663–21.954 µs |
| Production candidate | 18.343 µs | 17.951–18.816 µs |

The candidate median is 12.75% lower; the observed ranges do not overlap.
Source and bundle hashes, all samples, workload identity, and behavior receipts
are retained in the [machine-readable qualification](../evidence/2026-10-04-m10-5-array-descriptor-snapshot/qualification.json).
This microbenchmark measures a repeated component-contract validation workload
on Node. It is not React Native, Hermes, Metro, device, render-loop, or release
budget evidence.

## Verification

- The regression test failed against the baseline and passes with the snapshot implementation.
- Focused array-validation tests: 4 passed.
- Full CSS package suite, run unchanged with filesystem access: 1,357 passed, 0 failed, 48,010 assertions across 211 files.
- CSS package build and typecheck: passed.
- Documentation build: passed; 28 pages.
- `git diff --check`: passed before commit.

M10.5 remains open. The exact Node v22.0.0 host-budget qualification is still the
next recommended M10.5 gate; approved performance limits remain unchanged.
Native/device evidence is separate, and Android remains last.
