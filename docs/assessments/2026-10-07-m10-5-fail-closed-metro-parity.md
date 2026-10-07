# M10.5 fail-closed compiler-input identity and Metro restore parity

- Date: 2026-10-07
- Roadmap: M10.5
- Status: correctness slice passed; no performance candidate admitted
- Constraints: preserve public APIs and approved host limits; physical-device work remains deferred

## Decision

The private retained-session candidate now fails closed when any allowed source byte changes between successful compiles. It drains retained contexts, compiles fresh, and records `source-changed`. Source-inventory errors also bypass retention. This closes the restored-input hole in the candidate without changing shipping code, APIs, dependencies, budgets or baselines.

The actual Expo/Metro entry-edit, import-removal and restore control now passes exact entry, source, resolved-input, native-metadata and final-result parity against a fresh compiler reference. On restore, Metro serves the original exact transform from its own cache; trace selection identifies that earlier exact cache hit rather than incorrectly attributing the most recent transform trace.

## Evidence and scope

Real esbuild session tests cover stable reuse, changed source, import removal, restored bytes with unchanged length and timestamps, syntax repair, and cleanup. The Expo/Metro control covers the corresponding visible edit/removal/restore sequence using the exact Node 22.0.0 executable. It verifies the expected style value at each stage, hashes all five transform identities, restores every fixture file and symlink, and checks that the owned server has no surviving processes.

The run is a correctness gate only. It did not repeat the 105-process performance matrix or run the approved host-budget study. Prior retained-session medians remain materially slower than fresh compilation, so the candidate remains rejected for production.

The focused context-reuse suite passes 93 tests with one exact-Node-floor-only skip; package typecheck passes. The full CSS suite reports 1,501 passes, one skip and one unrelated failure in `benchmark-workloads.test.ts`: fresh-process and in-process transforms serialize different development package identities into style-explanation metadata. The mismatch reproduces in isolation; the production-mode control passes because it omits that development metadata. This separate issue remains open and is the next recommended qualification item.

See the [retained Metro control report, observations, restoration receipt and trace](../evidence/2026-10-07-m10-5-fail-closed-metro-parity/README.md). No Simulator, Android emulator or physical device was used.

## Next item

**M10.5 — align development metadata identity between fresh-process and in-process transforms, restore a green full package suite, then select a new warm-transform optimization from current evidence.** Do not repeat the rejected retained-context performance matrix without a materially different candidate.
