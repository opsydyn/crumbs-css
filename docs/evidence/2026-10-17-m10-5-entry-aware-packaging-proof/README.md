# M10.5 entry-aware packaging proof — rejected at preflight

**One throwaway layout tested; no production change admitted.** Entry-aware grouping preserves the observed token dependency partition, but the resulting shared chunk names fail the unchanged runtime-source guard. The approved stop rule was reached before identity, declaration-consumer, behavioral parity or full-transform timing. There is no speed claim and no release qualification.

User approval covered the bounded question/probe in the [architecture reassessment](../../assessments/2026-10-17-m10-5-compiler-architecture-reassessment.md): one scratch layout, isolation/identity first, timing only after preflight passes, no guard or budget changes, then commit the outcome. Base: `758a10a`. [summary.json](summary.json) records the disposition.

## Exact experiment

Scratch copies were created with `git archive`: current base for the candidate, immutable v1.2.0 source `5a13f913b17ae957172968144ec83c391caee337` for control. The exact recovered [control tarball](../2026-10-17-m10-5-fresh-pipeline-remediation/control-v1.2.0.tgz), SHA-256 `4bd7897aa5beb6383b158f4e214436ba5d0d659b6b0fc005142c945a10dda02e`, supplied control dist without rebuilding it. All **185 control package files** match the tarball. Existing frozen dependencies were reused via explicit scratch symlinks; no install or dependency upgrade occurred. These are separately located source/artifact trees, not independently installed dependency environments.

Only scratch `packages/css/tsdown.config.ts` changed: one exact native-style group, recursive inclusion, `entriesAware: true`, merge threshold zero, and a build-only output membership observer. Other runtime build groups and the single declaration graph stayed configured as before. [Candidate config](candidate-config.ts), [patch](candidate-config.patch.gz) and [all 182 candidate artifacts](candidate-dist.tar.gz) are retained. Source, benchmark, test-support, example and fixture inventories are equal across control/candidate: **369 files**, including all 163 source modules. No archived IR/map/fingerprint optimization was reapplied.

The first build explicitly ran the tsdown CLI under Bun 1.4.2. Its Node shebang exposed a harness mismatch with the normal supported build host. That first run is retained, then the **same exact configuration** was rebuilt under Node 24.15.0, using installed tsdown 0.21.10 / Rolldown 1.0.0-rc.17. All 182 output files were byte-identical between hosts; the [complete initial inventory](initial-build-bun-artifacts.json) is retained and compared with the final archive by the verifier. This corrected build-host verification is not a second layout or tuning attempt. [Node build log](build-node.log.gz), [initial Bun log](first-build-bun.log.gz), initial audit and final raw membership are retained. Membership observation runs only during packaging; no transform timing was instrumented or run.

## Isolation result and why it stops

The unchanged real-package auditor passes **all 59 export rows** for control and candidate. Both token closures still contain six local files and **zero external specifiers**. This differs from the previous candidate's actual Vanilla Extract dependency leak.

The unchanged `assertRuntimeBundleSources` preflight accepts all **30 ordinary-runtime rows** for control and 28 for candidate. It rejects candidate `./tokens` in **both ESM and CJS** because shared pure chunks are named `crumbs-authoring~…`. This check is an explicit basename allowlist over the real emitted import closure. It is **not an actual Metro export or source-map run**. [isolation.json](isolation.json) retains every graph, source-list check and failure.

The tool-build membership receipts show the four token-reachable grouped chunks contain only: diagnostics + theme-token helpers; token identity; theme contract; token domain values. Their facade IDs are null. The token entry remains an independent facade. Thus the recorded failure is **runtime provenance/name incompatibility**, not evidence of an authoring dependency leak. The observer covers only the modified tool graph, not source membership of the separately configured runtime builds.

Four negative controls, in separate copied artifact trees, inject real Vanilla Extract imports directly into the token facade or transitively into its real shared helper, in both formats. All four are rejected by the unchanged import auditor. [negative-controls.json](negative-controls.json) and the [audit runner](audit.ts) preserve the checks. Negative fixtures do not modify the one candidate layout.

| Style closure observation | Exact control | Candidate |
| --- | ---: | ---: |
| ESM local files | 8 | 8 |
| CJS local files | 9 | 9 |
| ESM local bytes | 78,679 | 79,621 |
| CJS local bytes | 86,990 | 87,943 |

The layout produces **no file-count consolidation** in these closures and adds 942/953 local bytes. These are artifact observations, not timings or proof that either variant is faster. No rename, guard relaxation, second grouping variation or partial production admission followed.

## Work deliberately not run

Because isolation preflight failed, root/style binding identity, denied runtime loading under Node 22.0.0/current Node, provider/registry interoperability, nominal consumer declaration checks, control/control and behavioral edit/restore/map parity, and all five warm processes were **not run**. A completed declaration build is not a consumer-brand check. [Identity preparation](identity-not-run.md) contains no executable probe or passing result.

No new SDK/native export, full host replay, runner registration, push or publication occurred. The [original final-release evidence](../2026-10-17-m1-10c-expo58-release/final-release/README.md) remains authoritative: three blocking host failures and no v1.2.0 numerical exception. Last live registry check in the preceding reassessment was npm latest 1.1.1; it was not queried again during this proof.

## Preservation, verification and reproduction

Production source/configuration/exports/dependencies remain unchanged. All **181 shipping dist artifacts** match their before-proof hashes. The preserved untracked `.superpowers/` and `apps/storybook/ios/` were not touched. No fresh full-suite pass is claimed for this evidence-only slice; the earlier restored suite result belongs to its own source/result packet.

Run `python3 verify.py` here for packet/archive hashes, control-file identity, graph arithmetic, negative-control outcomes, source/membership correspondence and explicit skipped stages. Add `--repository <absolute-repo-root>` to verify the 181 actual shipping artifacts and the unchanged tracked product scope against the base. [Independent review](review.md) re-ran the import/source-list and negative-control checks, and identified two evidence-verifier issues fixed before commit. The standalone output distinguishes recorded shipping counts from an actual repository check. Receipts establish integrity and recorded observations, not independent execution attestation.

To reproduce, archive base `758a10a` and control `5a13f913` into separate owned scratch trees with `packages/css`, `scripts`, root manifest and lockfile. Reuse the pinned installation through explicit node_modules symlinks; extract the retained exact control dist; decompress and apply only `candidate-config.patch.gz` to candidate. Run the existing tsdown CLI with Node from candidate package cwd, preserving its log and membership JSON. Then run:

```sh
bun /absolute/path/to/audit.ts /absolute/owned/scratch/root /absolute/repository/root
```

The runner expects `control/packages/css` and `candidate/packages/css`, records the real import/source-list guards, and recreates four negative artifact copies. Preserve the failed source-list preflight. Do not run timing after it or treat this reproduction as production approval.

## Recommended next numbered slice

**M10.5 — design and decide an explicitly staged pure-contract kernel**, with authoring/tooling consuming those exact canonical artifacts. The observed runtime-shared helpers are the initial cut. The design must explain how it reduces repeated compilation work while preserving root/style bindings, existing cross-copy registries, the single declaration graph and runtime provenance, before another prototype is proposed. It must not simply duplicate token sources into a second build or rename these chunks and assume an end-to-end gain. There is no evidence yet that a kernel can meet the unchanged warm target.

Do not automatically repeat a retained-session experiment: [prior session requalification](../../assessments/2026-10-07-m10-5-compiler-session-requalification.md) was slower and exposed Metro lifecycle issues; [the compiler identity prerequisite](../../assessments/2026-10-08-m10-5-compiler-identity-prerequisite.md) retained an executable-restart counterexample. A service alternative requires a separate concrete lifetime/freshness mechanism and decision. No new numerical exception or breaking change follows from either option.
