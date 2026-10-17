# SDD ledger — plan: docs/superpowers/plans/2026-10-17-m10-5-runtime-provenance.md

Execution base: 178f11fb0b507b29e19a2566fa510e86dec2cdb9
Owned scratch: /private/tmp/crumbs-m105-provenance-20261017-db1zm49a
Task 1: in progress — one complete correctness slice.
Pre-flight: single task; contract/capture/finalizer/installed/map/release interfaces reviewed against the approved spec.
Ruling: full builds use Node24.15.0 because installed Rolldown excludes Node22.0.0; emitted-library floor compatibility remains required — approved plan distinction — cost if wrong: unsupported build-host or lost floor proof, neither is inferred.
Step1: worktree/branch/source identity verified; 948 tracked non-doc files and all181 dist artifacts snapshotted; unrelated untracked paths recorded.
Step1: two original current-Node builds completed; baseline agreement {"status": "pass", "builds": 2, "artifactCount": 181, "changedPaths": []}
Step1: contract tests observed RED 0/7 then GREEN7/7 (38 assertions); two baseline builds agree on all181 artifacts.
Step2: build lifecycle tests observed RED 0/7 due absent build API.
Ruling: add private observeOnly input to runPackageBuild for the approved policy-bootstrap observation — it must never finalize a sidecar — cost if wrong: an observation could masquerade as admission; dedicated negative test prevents that.
Step2: lifecycle tests GREEN7/7 (25 assertions), including real AST audit subprocess on the synthetic package. Root causes fixed before real capture: Rolldown resolves from tsdown dependency owner; macOS temporary roots must canonicalize before session identity.
Step2: registered capture only on existing ten JS configurations; no entry/grouping/minification/shim/cleanup/DTS change. Empty bootstrap policy is not admission and observation cannot emit a sidecar.
Step2: source-identity regression observed RED: newly authored build helpers were excluded by authoredRoots. Added exact build source roots.
Ruling: unignore only packages/css/build source directory because existing global build/ rule otherwise hides the planned implementation — generated sessions stay outside — cost if wrong: unintended files in that one source directory could enter review; staged-path inspection remains mandatory.
Step2 observation: all20 JS owners,105 JS/76 DTS outputs, exact baseline bytes,59 import rows/30 ordinary rows. Reviewed62 original runtime sources against erased runtime imports/roles; no ordinary vendor or generated helper. Helper allowlist stays empty.
Step2: first finalization exposed repeated Rolldown dependency metadata (metro-plugin.cjs), not membership/byte drift. Regression duplicate-edge RED; graph-metadata tampering RED. Raw edge multiset is now retained, normalized receipt edges are sets, and captured reachability/externals must agree with actual independent AST audit.
Ruling: classify repeated dependency edges as a capture/schema harness defect, not an unsupported source/byte result — imports are set-like in the approved receipt — cost if wrong: genuine dependency evidence could be lost; raw multiplicity is preserved and independent graph equality is required.
Gate1: FAILED at captured-versus-actual dependency agreement;7 tooling rows omit known actual externals (url and/or metro-transform-worker). All30 ordinary graphs agree; no byte/source partition drift or new compiler runtime leak observed. Stop rule applied; no third finalization, installed/platform/release/floor qualification or benchmark.
Ruling: do not scope equality to ordinary graphs or synthesize missing tooling edges after real failure — complete capture is the approved prerequisite — cost if wrong: a useful capture approach is parked, but no partially qualified policy ships.
Evidence limitation: the failing finalizer cleanup removed its per-owner temporary files; retained20-owner bootstrap receipts independently reproduce the same external-edge omissions against byte-identical artifacts. Finalization logs and exact candidate sources are retained; no claim of an archived final failed-run owner set.
Final review: fresh gpt-6-astra read-only review accepts evidence-only outcome;0 Critical/0 Important/1 Minor. Independent packet5/5 and live948/181 preservation checks pass.
Final: minor (deferred): original planning-status paragraphs in spec127/129 need historical labelling; top/appended stopped status and outcome are accurate.
Final: Ruling: archived candidate production readiness is not admitted — entire implementation restored — cost if wrong: none of its unqualified functionality may be assumed shipping.
Final: Ruling: final-run owner identity remains unproven beyond logs — bootstrap20-owner reproduction is explicitly separate — cost if wrong: evidence cannot support adoption, only this stopped outcome.
Final: Ruling: all unrun installed/platform/release/floor/full-suite/performance gates remain unqualified — exact notRun set enforced — cost if wrong: they cannot be counted toward release acceptance.
Final: Ruling: native/device/publication/future-design claims remain outside this outcome — original release blockers and physical deferrals retained — cost if wrong: no live or adoption claim is justified.
Task1: closed at the approved stop rule; evidence/restoration complete, product qualification rejected. One outcome commit pending.

Cleanup: verified archived scratch bytes and session ownership; removed only the owned scratch, six logged observation sessions, and this plan ledger directory. Unrelated worktree files remain untouched.
