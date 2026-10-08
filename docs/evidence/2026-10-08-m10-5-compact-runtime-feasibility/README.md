# M10.5 rejected compact-runtime spike packet

This is **throwaway diagnostic evidence**, not production tooling or release qualification. The measured interpreter fails all four graph ceilings.

Verify archive integrity and arithmetic without Node, dependencies or network:

```sh
python3 docs/evidence/2026-10-08-m10-5-compact-runtime-feasibility/verify.py
```

Keep the adjacent consolidated-rejection and runtime-attribution packets. The verifier binds the frozen source/configuration, all 20 rebuilt control artifacts, original registry and comparison arithmetic to those inputs. It checks prototype scope, graph artifact hashes/sums, focused receipt coverage, successful generated/lazy evaluation, and the recorded proxy-order negative control. The intact packet was accepted; rehashed incorrect graph gaps and unsuccessful generated-evaluation receipts were rejected.

- `control-package.tar.gz` and `candidate-package.tar.gz` retain complete source/configuration/manifests plus clean emitted core/theme runtime groups: 20 control artifacts and 22 prototype artifacts, including the new shared interpreter chunks. All original group entries remain. They exclude installed dependencies and contain no shipping edits.
- `graphs.json` retains the canonical scanner's eight graph inventories and actual comparisons against the unchanged registry. Python rederives totals/hashes/arithmetic from the retained graph inventories; it does not independently parse JavaScript graph reachability. Rerun `code/measure.ts` to recollect closures.
- `parity.json.gz` and `parity-node.json.gz` retain the 1,454 focused control-parity receipts from each host, including 1,200 successful seeded expression evaluations and 16 successful lazy/order cases. Admission helper fixtures are extracted from each source cohort; expression tests exercise the actual emitted ESM/CJS modules. The archived receipts are losslessly compressed; rerunning the harness writes ordinary JSON.
- `negative-control.json` records rejection of an intentionally wrong extension-array enumeration policy. `typecheck.log` and packet metadata record strict checking of the private interpreter only.
- `code/` retains the exact throwaway setup/build/rewrite/helper-extraction/measurement/parity scripts and interpreter. Rewriting the frozen source reproduces all six final changed/added source files byte-for-byte. Scripts contain measured-host paths; adapt them and use an unused owned scratch directory with matching tool versions when reproducing elsewhere.
- `packet.json` hashes the raw files and scripts and identifies the exact collection revision and shipping source identity. Hashes establish integrity and provenance bindings, not authenticity of a historical execution.

The Node build host is 24.15.0, tsdown 0.21.10, TypeScript 6.0.3, with the unchanged `node22` output target. Neither that target nor these Node/Bun focused checks establishes Node 22 floor, performance, public type-consumer, Metro, Hermes, device or release acceptance. All those broader gates remain unrun for this rejected prototype.

See the [assessment](../../assessments/2026-10-08-m10-5-compact-runtime-feasibility.md) for the measured rejection and proposed next M10.5 experiment.
