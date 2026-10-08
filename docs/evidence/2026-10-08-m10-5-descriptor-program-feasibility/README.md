# M10.5 rejected complete-body program packet

This packet is **throwaway diagnostic evidence**. All four actual graph gates fail and a public-method parity counterexample fails in ESM/CJS. It cannot admit an architecture or release.

Verify integrity, source/program bindings and arithmetic without Node, dependencies or network:

```sh
python3 docs/evidence/2026-10-08-m10-5-descriptor-program-feasibility/verify.py
```

Keep the adjacent consolidated-rejection and runtime-attribution packets available. The verifier binds original source/configuration and all 20 rebuilt minified control artifacts to them. It rederives graph sums/growth/gaps, checks 98 source-bound program declarations and receipt coverage, and requires the recorded public-method counterexample to remain a failure. The intact packet was accepted; rehashed incorrect growth, altered instructions and a concealed constructibility mismatch were rejected.

- Package archives retain complete source/configuration/manifests and 20 clean emitted runtime artifacts per cohort, excluding installed dependencies. Only four source files change and one private evaluator is added in scratch.
- `graphs.json` retains the canonical scanner's eight graph closures/hashes and the unchanged registry. Python independently checks inventories, hashes and arithmetic; it does not reparse JavaScript reachability. Rerun `code/measure.ts` to recollect closures.
- `inventory.json.gz`, `lowering.json.gz` and `coverage.json.gz` retain the original selected-function/syntax inventory, all lowered instructions, and complete-body/signature receipts. Python binds each instruction body to its archived source declaration; TypeScript AST parsing belongs to the archived Node collector.
- `smoke.json` records eight basic resolution-path receipts and observed export names. `known-parity-gap.json` records the observable resolver method name/arity/constructibility differences; it refutes parity rather than qualifying it.
- `typecheck.txt` and packet metadata record strict checking of the private evaluator only. Dynamic `any` types remain; this is not a production type-safety proof.
- `code/` retains exact throwaway setup, lowering, evaluator, coverage, build, graph, smoke and counterexample scripts. Paths identify the measured host. Use matching versions, adapt paths and choose an unused owned scratch directory for reproduction. Lowering reproduces all five final changed/added source files byte-for-byte. Retained JSON receipts are losslessly compressed where indicated.
- `packet.json` hashes raw files/scripts and records the collection revision and unchanged shipping source identity. Hashes establish integrity, not authenticity of a historical execution.

Build host: Node 24.15.0, tsdown 0.21.10, TypeScript 6.0.3, original `node22` target and build groups. Neither that target nor basic Node smoke checks establishes Node 22 floor, full API/type parity, host/Metro/Hermes/native performance or release acceptance. Those broader gates were not run after static rejection. Physical-device and spoken-reader work remains deferred.

See the [assessment](../../assessments/2026-10-08-m10-5-descriptor-program-feasibility.md) for scope, rejection and the next numbered M10.5 review.
