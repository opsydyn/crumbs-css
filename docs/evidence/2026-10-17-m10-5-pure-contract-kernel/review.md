# Fresh outcome review and executor disposition

One fresh-context reviewer inspected the completed evidence-only outcome against the approved plan/spec and archived candidate. No second layout, build, candidate downstream gate or timing run was requested or performed by review.

## Independent checks

The reviewer reran the unchanged AST/package/source auditors: 59 export rows for each tree, control ordinary guards 30/30, candidate 29/30, exactly `./tokens` CJS reaching `rolldown-runtime-9BSl_Epz.cjs`. The reviewer independently confirmed styles 8→3 ESM / 9→4 CJS and bytes 78,679→79,755 / 86,990→87,158, both token formats with zero externals, and the helper's pure object/interop body. Packet verification with live shipping preservation and the then-four tamper tests passed. Source review confirmed the staged build failure controls, stop boundary and valid-token fixture ruling.

**Reviewer verdict:** ready to commit the evidence-only rejection after planned scratch cleanup/ledger closure. No Critical or Important issue was identified for the recorded outcome. Two minor observations were returned; executor grading and disposition follow.

## Findings and one fix pass

1. **Relocated tamper-test setup — executor regraded Important and fixed.** The tests cloned only the kernel packet, so their verifier found the control tarball through the originating checkout's absolute recorded path. This breaks the documented test command on a moved/fresh checkout. A new regression sets that recorded path to `/unavailable/originating-checkout/control-v1.2.0.tgz`; it failed with `FileNotFoundError`. The test setup now recreates the committed sibling-control-archive layout inside each owned temporary directory. All five verifier tests pass, including relocation and all existing integrity/forgery/truncation negatives. [Red log](verifier-portability-red.log.gz), [green log](verifier-portability-green.log.gz). This changes evidence-test setup only; verifier logic, candidate layout and candidate gates are unchanged. No second review was dispatched.
2. **Unrun-stage verifier breadth — Minor, deferred.** `verify.py` checks timing in `notRun` and that the cache edit was not executed; it does not assert the complete eleven-item unrun set. The actual README/summary correctly enumerate all unrun stages. A future verifier enhancement could check the exact set or narrow the wording. This does not change the recorded stop or admit any unrun result.

## Boundaries considered and executor rulings

| Boundary set aside by review | Executor ruling | Cost if wrong |
| --- | --- | --- |
| Candidate packed bindings/import orders/registries, nominal consumer types, behavior/cache/edit-restore, rebuild/prepack/artifact negatives, warm, SDK/native and full acceptance | Retain all as explicitly unrun under the approved first-failure stop. No candidate acceptance follows. | Unknown regressions remain until a separately authorized qualification; no production code is admitted here. |
| Production hardening of rejected driver/linker, including hostile-filesystem or independently forged-generation defenses | Broader guarantees remain unestablished. Named unit controls and one build bound this record. | A later production proposal must evaluate those cases; this proof cannot certify that adoption. |
| Actual Babel/Rust map fidelity | Tuple/encoded oracle fixtures remain map-contract tests, not live backend evidence. | Actual integration fidelity remains unknown until later software-context qualification. |
| Exhaustive symbol identity/accessor semantics of a future differential oracle | Tagged snapshots support recorded control/control agreement only. They do not establish exhaustive future candidate semantic detection. | A future candidate oracle might miss an untested semantic difference; it needs its own qualification. |
| Independent execution attestation | Archive hashes/receipt consistency do not attest execution. Reviewer reruns only the checks explicitly named above. | Consumers must not read the packet verifier as independent execution proof. |
| Release adoption, changed provenance policy and public disclosure | Keep all outside this local outcome commit. Original host gates/publication blocker remain. No public push is authorized. | No unreviewed policy change, release or disclosure follows from this packet. |

The earlier cache-probe ruling remains: preserve the required `--crumbs-` prefix and use an equal-length `- → _` join-delimiter edit if a later approved cache probe is reached. Neither edit executed here; an invalid future probe would have to fail rather than qualify the candidate.
