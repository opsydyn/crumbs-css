# M10.5 pure-contract kernel — rejected at initial structure

**One complete scratch layout built; no production change admitted.** The kernel achieves the planned 3 ESM / 4 CJS style closure, but the unchanged runtime-source guard rejects a newly reachable CJS interop helper from `./tokens`. Execution stopped at that first failed qualification gate. Candidate binding, consumer declarations, behavioral parity, cache edit/restore and warm timing remain **not run**; there is no speed or release-admission claim.

The user approved the [design](../../superpowers/specs/2026-10-17-m10-5-pure-contract-kernel-design.md) after `d10e504` and the [single-candidate plan](../../superpowers/plans/2026-10-17-m10-5-pure-contract-kernel.md) after `f8d7fdf`. This proof uses base `f8d7fdfc1c563e16c9cc8982e83afb2c41d5c918`, with native/inline execution and one outcome commit. [summary.json](summary.json) separates completed, failed and unrun work.

## What was tested

An owned scratch tree held separately located immutable v1.2.0 source `5a13f913b17ae957172968144ec83c391caee337`, the exact [control tarball](../2026-10-17-m10-5-fresh-pipeline-remediation/control-v1.2.0.tgz) (SHA-256 `4bd7897aa5beb6383b158f4e214436ba5d0d659b6b0fc005142c945a10dda02e`) and the one candidate. All 185 control package files were verified. Frozen installed dependencies were reused by explicit symlinks; no independent dependency install or upgrade is claimed. All 369 original source/benchmark/test-support/example/fixture inputs remain equal. The candidate adds the private facade and build/qualification machinery; it changes only the planned build configuration and scripts among existing product files.

The untimed oracle ran the actual **compiled** control transformer in fresh Node 22.0.0/current 24.15.0 processes, both ESM/CJS. Two runs of 63 cases per runtime/format agree: **252 receipt pairs**, including 488 successful independently derived current cache markers and 16 authored failures. Cases cover README/consumer fixtures, strict/dev/platform and tuple/encoded map contracts, entry/dependency/ambient edit/restore, fresh evaluation and failure recovery, tokens, primitives and an explicit runtime-factory fixture. Tagged snapshots retain values, symbols, descriptors and freezing. This is **control/control validation**, not candidate parity or live Babel/Rust execution. The real integration compile is observed only in untimed workers; no benchmark process ran.

The Node-hosted build driver then built the kernel first with public tsdown `build`, hashed actual emitted bytes, and linked only the existing combined tool JavaScript family to the selected same-format files. Both kernels contain exactly five implementation sources plus the export-only facade, all 40 runtime exports, no runtime imports/externals and no vendor modules. The tool graph has no duplicate kernel implementation. All 21 later format/config bundles retain no cleanup, independent runtime families and one source-based declaration graph. A completed declaration build is not a consumer nominal-type check.

The exact 13 candidate source/config/harness files and all **172 emitted artifacts** are in [candidate-files.tar.gz](candidate-files.tar.gz), with [source hashes](candidate-source-files.json), [artifact hashes](candidate-artifacts.json) and [patch](candidate.patch.gz). The [raw evidence archive](raw-evidence.tar.gz) contains original worker JSON/stdout/stderr/requests, failed harness attempts, build/membership receipts, graph/guard inventories, input/environment pins and test logs. Logs are compressed to avoid committing their 187 MB uncompressed duplication.

## Structural result and stopped gate

| Style closure | Exact control | Candidate | Change |
| --- | ---: | ---: | ---: |
| ESM local files | 8 | 3 | −5 |
| CJS local files | 9 | 4 | −5 |
| ESM local bytes | 78,679 | 79,755 | +1,076 |
| CJS local bytes | 86,990 | 87,158 | +168 |

Both H1 file-count bounds pass. Consolidation does not remove the function bodies and adds local bytes; it supplies no timing result.

The unchanged import auditor passes all **59 export rows** for each tree. Token runtime externals remain empty in both formats. Control passes all 30 ordinary-runtime source-list rows; candidate passes 29 and fails only `./tokens` CJS:

```text
tokens.cjs → rolldown-runtime-9BSl_Epz.cjs
Non-runtime Crumbs module in runtime bundle: …/dist/rolldown-runtime-9BSl_Epz.cjs
```

The 554-byte helper's build membership is the synthetic `\0rolldown/runtime.js` module, with no imports; its content is JavaScript object/interop glue. This is an existing provenance/basename-policy rejection, with **no observed compiler or Effect dependency leak** in token imports. The source-list guard's family allowlist does not admit `rolldown-runtime-*`. Its related ESM helper can import `node:module`, but neither the token ESM closure nor the 3-file ESM style closure reaches that helper. Per the approved stop rule, no renaming, guard relaxation, second layout or timing-after-failure followed.

Subsequent real clean/skip-clean rebuilds, prepack verification and artifact-level contamination negatives were not run. Unit controls for staged membership/externals, stale manifests, exact-format/copy resolution, cleanup and symlink escapes did run. Fifteen focused harness/build tests pass with 100 assertions. These results do not substitute for the stopped integration stages or a full library suite.

## Ruling and harness corrections

The planned kernel-only edit `--crumbs- → --crumby-` would violate the existing token-name prefix validator. The recorded correction was to change the unique `const varName` join delimiter `- → _`, preserving valid token syntax, equal source length and registry keys. **Neither edit ran**, because cache qualification was never reached; a wrong correction would invalidate that future probe rather than qualify it.

Harness regressions were corrected before candidate construction: generated side-effect tracking imports must not reexecute authored TypeScript during native-output inspection; CJS evaluation must observe reassigned `module.exports`; and the extension fixture must use an explicit package path returning a callable. Red/green logs and failed attempts are retained. No production implementation or rejected layout was changed to obtain a passing qualification gate.

## Verification, preservation and reproduction

Run from this folder:

```sh
python3 verify.py --repository /absolute/path/to/crumbs-css
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s . -p test_verify.py
```

The [fresh review](review.md) independently reran the graph/source checks and accepted the stopped outcome. The standalone verifier rechecks packet/archive/control/source/artifact hashes, original compiled-key owners, all successful marker derivations, control-pair observations, kernel membership/export/format ownership, graph arithmetic, the one failed guard and explicit unrun stages. Five verifier tests accept original and relocated packets, and reject an archive mutation, a forged marker after updating the archive digest, and an omitted control case after updating that digest. Integrity and recorded consistency are **not independent execution attestation**. `--repository` additionally verifies all recorded shipping product/policy hashes and the actual 181 shipping artifacts; without it, no live repository preservation is claimed.

To reproduce, create new owned directories by archiving control `5a13f913` and candidate base `f8d7fdf`; reuse the pinned dependency links described in raw `environment.json`, including `apps/playground/node_modules`, and extract exact control dist without rebuilding it. Overlay only the source/config/harness entries from `candidate-files.tar.gz`, excluding its dist when performing a fresh build. Prepare an inputs manifest using the archived `input-identity.json` paths/schema and recapture source/control inventories for those owned paths. Run candidate CLI `preflight`, then `control`; run `bun run --cwd packages/css build` under the pinned Node host, preserving its `CRUMBS_KERNEL_BUILD` receipt as `build-initial.json`; run CLI `structure`. Preserve the failed CJS guard and stop. Existing raw requests and worker entrypoints document the exact case matrix. Do not copy recorded input paths, rebuild the control, or treat this reproduction as approval to continue qualification.

Shipping source, exports, dependencies, lockfile, benchmark/policy/baseline data and all 181 shipping artifacts are unchanged. Only evidence/status documentation is committed. Unrelated `.superpowers/`, Storybook iOS files, the primary checkout and devices are preserved. No new SDK/native journey, runner, public push or publication occurred. M1.10c remains blocked by the original three host failures; physical items remain deferred.

## Recommended next numbered decision

**M10.5 — park this kernel as release remediation and review the ordinary-runtime provenance contract and release decision.** The proof establishes safe observed dependency partition and real consolidation, but gives no end-to-end effect size and no candidate identity/cache/behavior proof. Review whether genuinely pure bundler interop should be represented by a provenance contract before funding more compiler work. This is a separate assessment, not permission to change an allowlist, rename artifacts, retry this layout, adopt it for architecture alone or waive any host gate. Another compiler prototype is premature without a credible path to the unchanged full-transform target.
