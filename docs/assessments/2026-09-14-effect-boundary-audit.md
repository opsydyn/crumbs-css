# Effect boundary and initialization audit — 2026-09-14

Approved M1.3 continuation under ADR D3/D6, based on `c6e5635`. This slice completes **M1.3a**: current compiler/runtime graphs and host initialization, plus an emitted internal contract candidate. **M1.3b remains deferred**: no public external-theme decoding entrypoint exists. The prototype artifact codec does not substitute for that future decoder. Android native acceptance remains last.

## Loading policy and compatibility defect

The selected `effect@4.0.0-rc.115` exposes ESM subpaths. External `require("effect/Schema")` fails with `ERR_REQUIRE_ESM` on the package's exact tooling floor, Node **22.0.0**. The same external candidate succeeds from floor ESM and current Node 24.15.0 ESM/CommonJS; newer Node synchronous ESM interoperability would otherwise hide the defect. [Retained negative control](../evidence/2026-09-14-effect-boundary-audit/external-floor-cjs.txt) and positive control receipts identify the exact artifacts and callers.

The production tooling JavaScript build now **bundles `effect` and exact `effect/*` subpaths**. Other existing externals and the single canonical declaration graph remain as before. This policy is shared with the private audit build, which emits the M1.2 internal contract source in both formats without adding a public export or connecting compiler/provider validation. Both bundled candidates load and decode/encode a small artifact on both Node versions and reject an unsupported artifact version. Their source maps each contain 53 Effect sources and their emitted graphs have no external dependencies.

Ordinary runtime uses its separate graph and externalizes Effect to expose accidental imports; externalization alone is not permission to load it. Expo application source-map checks now reject any Effect source, including Bun nested installation and Windows path forms. Current `/theme` graphs contain only React as an external. No production Crumbs entrypoint currently invokes these new Schema codecs. Keep compiler/decoder admission separate from render/recipe/cached lookup paths. Do not raise engines to mask upstream ESM compatibility.

Reproduce after a package build with an explicitly supplied exact floor executable; the audit neither downloads Node nor silently skips missing floor qualification:

```sh
bun run build
CRUMBS_AUDIT_NODE_FLOOR=/path/to/exact/node-v22.0.0 bun packages/css/bench/effect-boundary-audit.ts
```

## Host measurement protocol

[Raw audit](../evidence/2026-09-14-effect-boundary-audit/audit.json) retains **60 independent process samples**: three scenarios × two formats × two Node versions × five repetitions. It also retains three positive external interop control receipts, the floor-CJS negative control, source/emitted SHA-256 hashes, exact floor executable hash, direct dependency inventories for all five public entries in both formats, candidate source-map hashes and Effect source paths. Source revision is the pre-commit base; retained source hashes identify the tested working tree. Exact Node 22.0.0 was installed through the versioned npm Node wrapper into a temporary cache, without altering project dependencies.

Each sample starts a fresh Node child, imports harness built-ins, forces GC, measures module load/evaluation, then forces GC and records heapUsed/RSS deltas. Process startup is excluded. The recorded execution order is sequential; OS filesystem caches are uncontrolled and generally warm across repetitions. Memory deltas are not peak allocations, retained-memory workload qualification, or exclusively Effect-owned memory. `NODE_ENV` was unset; these are macOS arm64 Node host results, not release Hermes/device budgets. Min/median/max and all raw observations remain available; five observations cannot characterize tail latency.

Emitted bytes below sum reachable local JavaScript only, exclude source maps/declarations and external vendor dependencies, and are unminified. Compiler external dependencies contribute to its load measurements but not its emitted byte total. AST inventory follows literal relative imports/requires and reports nonliteral sites; it does not claim full vendor closure. CJS cache inventories do not represent all ESM modules. The transformer graph contains one nonliteral loading site. Compiler receipts verify entry availability, not transform execution; runtime receipts resolve one token; candidate receipts decode/encode one tiny prototype artifact. First-decode timings are retained separately and are not theme decoding or throughput measurements.

| Scenario | Format | Node | Local JS bytes | Median load ms | Median heap delta KiB | Median RSS delta MiB |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| Current `/transformer` | ESM | 22.0.0 | 41,287 | 71.37 | 7346.6 | 28.70 |
| Current `/transformer` | ESM | 24.15.0 | 41,287 | 65.22 | 7476.5 | 29.47 |
| Current `/transformer` | CJS | 22.0.0 | 44,005 | 69.13 | 7375.7 | 27.47 |
| Current `/transformer` | CJS | 24.15.0 | 44,005 | 65.01 | 7584.3 | 30.77 |
| Current `/theme` | ESM | 22.0.0 | 10,908 | 6.01 | 351.3 | 9.95 |
| Current `/theme` | ESM | 24.15.0 | 10,908 | 2.49 | 258.0 | 3.88 |
| Current `/theme` | CJS | 22.0.0 | 11,307 | 3.40 | 266.4 | 2.55 |
| Current `/theme` | CJS | 24.15.0 | 11,307 | 2.10 | 219.0 | 3.77 |
| Private contract candidate | ESM | 22.0.0 | 298,594 | 28.30 | 3192.2 | 14.02 |
| Private contract candidate | ESM | 24.15.0 | 298,594 | 28.69 | 3501.4 | 15.91 |
| Private contract candidate | CJS | 22.0.0 | 299,131 | 34.00 | 3494.2 | 14.95 |
| Private contract candidate | CJS | 24.15.0 | 299,131 | 35.29 | 3851.4 | 18.92 |

The approximately 299 KB candidate demonstrates a cost worth isolating and measuring at a future explicit decoder boundary. It is not an incremental production compiler overhead estimate: production currently has no Effect codec wiring, and this candidate includes all initial artifact schemas. No optimization or calibrated ceiling is inferred from this audit.

## Qualification and remaining gates

Regression coverage checks tooling dependency policy, actual dual-format candidate output/receipts, emitted graph traversal and missing-file failures, nonliteral reporting, sample summaries, and Effect denial in ordinary application maps. The candidate build uses the same Node-hosted tsdown API as production tooling: invoking the native build in-process from Bun stalled during qualification, while the Node-hosted build completes normally. Tooling execution uses the current Node host; the exact floor qualifies emitted artifacts, not the development bundler itself.

[Qualification evidence](../evidence/2026-09-14-effect-boundary-audit/qualification.json) records 260 passing package tests / 11,244 assertions across 38 files, build/typechecking, workspace and refreshed isolated tarball Expo consumers (all six ordinary maps deny Effect), Storybook typechecking and the 20-page docs build. Public declarations remain Effect-free. Native Android and physical-device/release performance are unqualified. No public API, external-theme decoder, provider migration, optic update API, engine/peer/version change, push or publication is included.

Before wiring actual ingress or publishing a dedicated decoder, repeat graph, floor/format and initialization qualification against those concrete artifacts. M1.3 remains partially open for that decoder. Next recommended bounded slice is **M1.4**, repair benchmark labels and equivalent raw/recipe workloads while retaining M1.3b as a dependency of decoder admission. Begin only after user approval.
