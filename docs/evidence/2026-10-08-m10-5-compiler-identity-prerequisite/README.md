# M10.5 compiler-identity prerequisite packet

Disposition: **premise not established; no memo integration**. This packet is an owned correctness counterexample, not a performance result, native acceptance or release qualification.

One fresh process per runtime (genuine Node 22.0.0, Node 24.15.0 and Bun 1.4.2) compiles a copied fixture using copied integration 8.0.10/esbuild 0.27.7 packages. Other dependencies are read through links to the retained healthy installation. Only the owned native executable is replaced. The process compiles once, replaces its executable with a failing shell script, then confirms compilation through the still-running original service. It captures current bindings/environment/entry/executable hashes, calls public `esbuild.stop()`, and observes fresh compilation fail with all seven recorded predicates unchanged. Finally it restores the executable, recompiles to the original source/input result and stops its service. `unsafeReplayOutcome.executed` is false: there is no implemented production memo here.

The counterexample refutes shallow namespace/function identity plus a post-load disk snapshot as sufficient proof of service origin and lifetime. A pre-start origin guard might reject this particular case; no complete origin/lifetime/restart guard has been established. This is not a proof that all complete designs are impossible. Source inspection stopped at this failed prerequisite; the full Babel/parser/resolver inventory and production eligibility tests were not implemented.

`source-excerpts.json` records exact owned SDK source hashes and inspected line ranges: integration calls `esbuild.build`; esbuild dynamically selects an executable, retains private service state and resets that state through `stop()`. Node's private active-handle API observes a child during one request; the Bun probe returns an empty list. Neither observation supplies a complete portable service identity, and no private handle API was added to Crumbs.

Before/after receipts compare all 696 shipping files and 149 artifacts to the prior full receipts in `../2026-10-08-m10-5-warm-proof-feasibility/`, verify registry/policy hashes, hash all 18 files in the three shared compiler-package trees, and preserve managed dependency link targets and the primary checkout's existing dirty files/status. They match exactly. `context.json` records the final owned executable hash. No shared executable or JavaScript was modified. Environment contents are not retained; the probe stores only their hash.

## Offline verification

Run from this directory:

```sh
python3 verify.py --self-test
```

The verifier checks exact packet membership/content hashes, runtime identities, all seven predicates, independently failed fresh results, restoration parity, hypothetical replay boundaries and preservation receipts. Six deliberately changed semantic records are rejected independently of file-integrity checks. File inventory is an integrity receipt, not an external signature or independent attestation of execution. Receipts and source excerpts are evidence, not new executed-code provenance.

## Reproduction

This packet retains the exact preparation script used on this host. It expects the unchanged healthy installation at `/private/tmp/crumbs-css-m105-clean/node_modules/.bun` with integration 8.0.10, esbuild 0.27.7 and its darwin-arm64 optional package, plus integration's locked dependencies. The disposable output is `/private/tmp/crumbs-m105-compiler-identity/owned-install`; do not redirect it to a shared installation. Use a clean owned output directory for a new preparation. The hardcoded paths are intentional local reproduction context, not a portable release environment.

```sh
python3 prepare.py
/Users/alancurrie/.local/share/fnm/node-versions/v22.0.0/installation/bin/node service-premise.cjs /private/tmp/crumbs-m105-compiler-identity/owned-install /private/tmp/crumbs-m105-compiler-identity/reproduced-node22.json
/Users/alancurrie/.local/share/fnm/node-versions/v24.15.0/installation/bin/node service-premise.cjs /private/tmp/crumbs-m105-compiler-identity/owned-install /private/tmp/crumbs-m105-compiler-identity/reproduced-node24.json
/Users/alancurrie/.bun/bin/bun service-premise.cjs /private/tmp/crumbs-m105-compiler-identity/owned-install /private/tmp/crumbs-m105-compiler-identity/reproduced-bun.json
```

Run these processes serially because they share an owned binary. The preparation and probe sources are retained verbatim. Capture scripts read only the managed repository and shared/primary checkouts, and write only their supplied receipt path. Run `capture.py <owned-receipt.json>` before and after reproduction for live preservation checks. Historical packet verification does not rerun compilation or assert live host qualification. Abrupt process termination may interrupt restoration; discard/reprepare only the owned installation before retrying.

No timed workload, complete host suite, package/site build, native export/device or release check ran in this slice. The previous complete report still has a 10.1715 ms warm failure against the unchanged 6.514 ms / 15% limits. Keep fresh compilation. **Next: M10.5 — profile fresh-compilation cost in the fixed integration before selecting an upstream remediation.**
