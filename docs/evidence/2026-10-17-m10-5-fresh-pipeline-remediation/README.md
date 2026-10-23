# M10.5 complete fresh-pipeline candidate: rejected and restored

**No production changes admitted.** The approved complete candidate fails token-runtime isolation. All four optimizations were restored together; the existing v1.2.0 source/tag and failed host report remain authoritative. npm publication is still blocked. No new performance measurement, numerical exception or compatibility qualification is claimed.

The [approved spec](../../superpowers/specs/2026-10-17-m10-5-fresh-pipeline-remediation-design.md) and [execution plan](../../superpowers/plans/2026-10-17-m10-5-fresh-pipeline-remediation.md) required one complete candidate, with rejection rather than partial shipping on a behavioral failure. Execution base: `af4b490e714221f4a2175d0ffccb4edc7b338ba6`. The machine-readable outcome is [disposition.json](disposition.json).

## What the candidate established

- Recovered the **exact** v1.2.0 tarball from npm's content-addressed cache. SHA-256: `4bd7897aa5beb6383b158f4e214436ba5d0d659b6b0fc005142c945a10dda02e`. All 185 archive files were verified. GitHub's retained failed-job artifact contains host reports, not this tarball; the release has no attached package asset. The recovered [control archive](control-v1.2.0.tgz) is retained so this prerequisite no longer depends on temporary storage.
- Created an isolated immutable control checkout at `5a13f913b17ae957172968144ec83c391caee337`, installed its frozen dependencies, and copied the recovered dist without rebuilding the control. Actual Bun 1.4.2 matches the retained final host report; genuine Node 22.0.0 and current Node 24.15.0 were observed.
- Implemented canonical authoring grouping, request-owned admitted IR lowering, a complete deterministic input fingerprint and one lazy source-map plan per upstream result. Generic IR validation remained covered by focused/hostile/property tests. The map regression changed six parser calls to two for three maps, with no cross-result reuse.
- Observed **eight to two library input files**, and 78,679 to 78,176 scanned library bytes in the selected fixture. These graph observations are not timing results or acceptance of a smaller runtime graph. Emitted graphs are in [build-before.json](build-before.json) and [build-after.json](build-after.json); source-module membership was not separately instrumented.
- Recorded two independent control runs, then control/candidate runs for 17 cases each: README/consumer fixtures across iOS/web and dev settings; owned entry/dependency edits and exact restore; syntax and authoring error/repair. Full raw receipt JSON and worker logs are retained as lossless gzip files. `qualification/original-inventory.json` retains the CLI inventory of their uncompressed bytes; the standalone verifier checks those decompressed hashes as well as the final packet inventory. Recorded observations, metadata, maps and native module statements agree under the declared path/marker correspondence. The standalone verifier independently derives all 60 successful cache markers and checks all 34 paired cases. This bounded harness is not SDK/native or full-distribution proof.

## Why it was rejected

The complete candidate suite reports **1,896 pass, 22 fail, one existing optional skip**. The authoring group co-locates dependencies shared by the ordinary `tokens` entry with authoring code. As a result, `tokens.mjs`/`tokens.cjs` reach `@vanilla-extract/css`, `/adapter` and `/fileScope`. Real packed lean consumers fail to load without authoring dependencies; the runtime graph validator rejects the unauthorized imports. Leaving the ordinary runtime build configurations alone did not preserve the token entry's reachable graph.

Focused grouping tests checked actual root/style bindings and generic graph-auditor behavior but missed this real-package token reachability. The complete suite caught it. No externalization or guard change was made to conceal the leak. [candidate-failures.json](candidate-failures.json) lists **all 22 failed tests**, including the older source-seam experiment tests invalidated by the transformer refactor. They are retained as failures, not waived or all described as one production bug.

The exact [candidate suite log](logs/candidate-suite.log.gz), candidate source/added-file [archive](candidate-files.tar.gz), [tracked patch](candidate-tracked.patch.gz), [file hashes](candidate-files.json) and [emitted artifacts](candidate-dist.tar.gz) preserve the attempted batch. The warm feasibility cohort did not run, nor did SDK/native replay, a full host remeasurement, a new runner registration or publication. There is no measured speed improvement to report.

## Restoration and verification

Before restoration the complete candidate archive was compared byte-for-byte with the working files. Restoration used only the recorded source manifest and exact prior dist snapshot. All eight newly added candidate modules/harnesses were removed. Existing `.superpowers/`, `apps/storybook/ios/`, sibling workspaces and the primary checkout were preserved.

The original **15,759 tracked files** and **181 emitted artifacts** match their initial hashes before the explicit documentation updates. The full restored suite reports **1,907 pass, zero fail, one skip**: the existing optional explicit Node 22.0.0 full-transform probe. The separately executed Node 22.0.0 identity probes are recorded in the focused logs; they do not erase that full-suite skip. See [restoration.json](restoration.json) and the [restored suite log](logs/restored-suite.log.gz).

Run:

```sh
python3 docs/evidence/2026-10-17-m10-5-fresh-pipeline-remediation/verify.py
python3 docs/evidence/2026-10-17-m10-5-fresh-pipeline-remediation/verify.py --repository "$PWD"
```

[Independent review](review.md) found and corrected Git-ignored evidence logs. The complete packet is also verified from an index-only checkout, so local untracked logs cannot substitute for committed evidence. [Negative controls](verifier-negative-controls.json) reject a forged marker and altered authored hash even with their inventories rehashed.

The verifier checks archive/file hashes, reconstruction of the tracked patch, exact control/previous artifacts, independent marker derivation, recorded pair agreement/restoration, all failure names and restored suite outcome. Its repository mode checks the restored tracked tree with only the three explicit documentation updates exempted, plus absence of candidate additions. Hash receipts prove integrity and recorded arithmetic, not independent execution attestation.

The archived candidate contains `scripts/qualify-fresh-pipeline.ts` and its test-support worker. Reproduction requires an isolated copy at the execution base, decompressing/applying the patch plus archived added files and candidate dist, a separately frozen control checkout with the recovered exact dist, and updating the absolute roots in `inputs.json`. Use the archived CLI's `preflight`, `control` and `parity` stages. Do not apply the rejected layout to a shipping checkout or mistake the optional `warm` command for a completed measurement. Retain raw failures and use a fresh owned scratch directory.

## Rulings and evidence limits

- SDK 56 would use the already released exact-tarball helper rather than duplicate staging code; this later stage was not reached. A wrong equivalence would invalidate SDK 56 proof.
- An initial binding test incorrectly assumed `componentRecipe` was a root export. Immutable source confirms it is not. Tests were limited to existing shared exports; adding an export to satisfy the probe would have changed the API.
- Cache-marker domains are selected by independent hash derivation, not a source-text identifier. An incorrect oracle would invalidate marker parity; the standalone verifier rederives both domains and compiler keys from retained source bytes.
- Path correspondence includes each checkout's immediate parent. All positive/negative witness fields remain in raw metadata; comparison sorts the mapped witness sets without changing the production fingerprint's arrays. An overbroad map could hide an ancestor-config difference, so hashes, presence and other fields remain compared.
- The synthetic upstream map tokenizes the private cache hash comment. Only generated columns inside the independently verified 64-character hash span with the existing file-start fallback are aligned. Real generated coordinates/authored anchors remain checked; negative controls reject changes outside that span or with another authored anchor. Overbroad alignment would hide a mapping regression.

The initial eight-case control run omitted the planned owned traces. This coverage gap was corrected to 17 cases on the independent immutable control before integration; it does not retroactively expand that earlier run. Initial oracle projection failures and the config-import/typecheck failure are retained as logs; final raw receipts supersede earlier projections. Serialization of the raw cache-metadata object does not preserve a bare symbol value; value/descriptor observations use the explicit tagged snapshot. Do not interpret this rejected candidate's differential harness as exhaustive public-metadata or hostile-input qualification.

**Next numbered decision: M10.5 compiler architecture reassessment with the pure token/runtime boundary established before selecting another layout.** The bounded attempt is closed. The three original host failures and M1.10c npm release blocker are unchanged; no subset of this candidate ships.
