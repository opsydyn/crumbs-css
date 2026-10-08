# M10.5 expanded-runtime remediation — runtime candidate rejected

The candidate matched the control in the recorded built parity fixtures but failed its early runtime gate: **four graph caps and three unchanged startup cells fail**. The whole candidate is archived and removed. Shipping source identity is restored to `8fe7d6c28c26c9d4214549790d504c62f87c24f6886d7da40e031dd7e9fb4a76` (694 files); all 149 final emitted artifacts match the frozen shipping control. **M10.5 stays open; no new baseline/policy is active and publication remains blocked.**

## Candidate and authority

Alan P Currie approved the [complete inline plan](../superpowers/plans/2026-10-08-m10-5-expanded-runtime-remediation.md) at `82facc31d54bf1d6280baf4a9b17db63fa85fbbe`. Execution retained the [approved expanded-runtime scope](../superpowers/specs/2026-10-08-m10-5-expanded-runtime-budget-scope-design.md): four conditional caps, zero future baseline growth, seventeen unchanged host rows, and one complete production batch. See the [execution approval and evidence](../evidence/2026-10-08-m10-5-expanded-runtime-remediation/README.md).

The candidate enabled minification with retained function names for existing core/compatibility groups, then grouped the seven listed recipe/Sprinkles/component helper modules using the installed bundler's default dependency inclusion. Core stayed independent, public entries and the declaration graph unchanged. The full compatibility closure still has five local artifacts, including generated loader glue; reduced chunk count does not establish faster startup. Candidate source digest: `4744fd913a8dd1e98b12f9f5124b86c8c8b300d97413af1b1f4208e9209d1dc6` (699 files, including uncommitted private checks).

## Runtime gate

| Graph | Measured bytes | Approved initial cap | Result |
| --- | ---: | ---: | --- |
| Core ESM | 41,088 | 39,000 | Fail |
| Core CJS | 41,751 | 39,000 | Fail |
| Compatibility ESM | 102,689 | 96,000 | Fail |
| Compatibility CJS | 106,307 | 99,000 | Fail |

All values count the complete reachable local graph; five canonical scans agreed. React is the only runtime external, nonliteral loads zero. Unchanged token graphs are 29,906/33,656 B and pass their original limits. These are candidate eligibility results, not admitted baselines. The original limits, caps and seventeen other host contracts were not changed.

| Startup cell | Median ms | Unchanged ceiling ms | Result |
| --- | ---: | ---: | --- |
| Node 22 ESM | 7.540833 | 7.553 | Pass |
| Node 22 CJS | 4.200875 | 4.083 | Fail |
| Current Node ESM | 4.454917 | 3.067 | Fail |
| Current Node CJS | 3.389917 | 2.444 | Fail |

The existing comparator rederives these results with exact environment/measurement identities and original relative rules. Each cell retains one excluded warm-up plus 15 fresh-process samples. Genuine Node versions are 22.0.0 and 24.15.0. Timings exclude process startup and use the existing forced-GC/warm-OS-cache protocol. This one cohort supplies rejection evidence; do not claim whole-host qualification or a reproducible speed improvement from its single passing cell. Forty alternating control/candidate import-plus-first-use diagnostic samples and eight excluded warm-ups are retained separately and do not replace the startup gate.

## Verification and restoration

- Built control-versus-control, shipping-versus-control, minification and fused-candidate ESM/CJS receipts each cover 921 rows per Node/format cell, on both Node versions. Returned name/arity/constructibility/descriptors, focused bindings, context identity, behavioural errors/traps/aliases/freezing/lazy evaluation all match the independent control; zero mismatches. The source fixture adds 1,260 independently executed validation/property rows. These bounded receipts do not establish complete native acceptance.
- **Parity coverage limitations:** the archived worker imports compatibility first in one fixed order. Deliberately duplicated-binding and changed-registry-initialisation mutation controls, plus a dedicated chunk-cycle/evaluation-order probe, were not demonstrated. All 110 `conditions` rows per cell reject with `Unsupported native condition input: widthBucket`; these establish error parity, not successful condition normalisation. Task 1 therefore supplied bounded observations and did not complete all planned coverage. Preserve this candidate archive; add the missing controls and successful-condition fixtures before reusing the harness for a future admission.
- New harness checks were observed red then green. Independent TypeScript 6 consumer fixtures pass for control and candidate-equivalent declarations, with explicit generic recipe types. Unannotated structural recipe inference was broad in the original control too; this slice does not fix or claim stronger inference. Package typecheck passes. Packed export/runtime boundary and release-artifact checks: 62 pass.
- The initial shared install was broken: baseline CSS suite 660 pass, one skip, 196 fail and 134 errors from missing modules. Redirecting only the managed/control links to an existing complete pinned install produced 1,565 CSS passes, one skip, zero failures, and 23 Storybook passes. The intermediate new-helper suite had one publisher-source mirror failure because new authored files were untracked; intent-to-add resolved its inventory mismatch. Its targeted check passed afterward. All logs and original dependency link targets are retained.
- The candidate and its private helpers/tests are removed, with no intermediate implementation commit. The restored full suite passes (1,565 CSS, one skip; 23 Storybook), as do packed export/runtime checks and independent types. The canonical rebuild differs from the temporary control in one path breadcrumb, a derived declaration filename and its two declaration imports. Three declaration artifacts were restored from the immutable control; all 149 final hashes now match. This cross-directory declaration reproducibility limitation is recorded separately from runtime graph evidence.

Not run after the runtime rejection: compiled-text proof/memo, warm-transform candidate, policy/registry/report/manifest changes, three-build baseline admission, real Metro invalidation, packed iOS/Android/web application qualification, native journeys, complete 21-row host qualification and `release:check`. Hosted-runner registration remains a separate prerequisite; physical-device/spoken-reader work deferred. No push/publication.

## Next numbered roadmap item

**M10.5 — assess selective public-function/method name preservation before another full remediation attempt.** Blanket name retention keeps built API shape but exceeds every cap; helper fusion also leaves three startup failures. The next feasibility work should measure name-retention/glue costs, retain the public ABI, and test the unchanged startup gates before investing in compiler/policy work. Carry the missing parity controls and successful-condition fixtures into that assessment. Keep the approved caps and current enforcement intact; do not repeat this candidate or infer that smaller graphs alone solve startup.
