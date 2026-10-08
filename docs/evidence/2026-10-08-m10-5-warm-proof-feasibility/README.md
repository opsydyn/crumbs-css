# M10.5 compiled-text witness feasibility

Disposition: **diagnostic only; no production admission**. This packet does not qualify a memo, Metro cache, host budget, native platform or release.

Five fresh processes per variant, six timed full transforms per fixture after two setup calls. `control` and `replay` were interleaved; subsequent partial-witness cohorts ran serially. The compiled CJS entry differs from the official source-import benchmark. No repetitions were discarded. Raw `medianMs` fields use the arithmetic middle pair; `summary.json` independently uses the official nearest-rank arithmetic on samples, then the worst fixture per process and the median of five processes. Applying the same arithmetic does not make this an official measurement identity.

| Diagnostic | Worst-fixture cohort median |
| --- | ---: |
| Fresh compiled control | 9.420250 ms |
| Unverified compiled-text replay | 3.728541 ms |
| Partial witness, compiler files scanned twice | 10.129084 ms |
| Partial data witness, compiler-file checks omitted | 6.347167 ms |
| Grouped partial data witness, compiler-file checks omitted | 5.800000 ms |

All 300 retained outputs match the corresponding control fixture hash. This proves unchanged-input output parity for these probes only. Replay is intentionally unsafe for edits; it has no capacity limits, confirmation transaction, complete resolver eligibility proof, environment identity, evaluation fence or Metro receipt. The two witness snapshots occur inside the intercepted compile call, before authoring evaluation. They do not implement the required before/after-consumption fence.

`floor-profile.json` attributes a partial snapshot to 2.5020415 ms file work / 0.530375 ms directory work (median spans). The snapshot covers 166 file candidates, 11 directories and 1,357,771 bytes in this diagnostic. It scans whole selected compiler implementation directories, including unselected files; it is **not a mathematical lower bound on every valid proof implementation**. Its name `floor` is a probe identifier only. Native canonical-path substitution also misses the reference ceiling in its one diagnostic process; it is not a five-process qualified cohort.

The grouped variant uses directory entry membership to avoid failed reads of absent file candidates. It omits compiler-file validation just like `data-only`; its timing cannot justify silently dropping those checks. Complete negative package/configuration resolution and symlink witnesses are still absent. The grammar inspector finds nine bundled inputs per fixture (69,055 / 68,724 bytes), with no computed-require, dynamic-import or parser rejection in that limited syntax traversal. It does not certify the entire supported resolver grammar.

## Verification and reproduction

Run `python3 verify.py` in this directory for file integrity, artifact/fixture receipts, sample/count/output parity and summary rederivation. `file-inventory.json` hashes every retained file except itself; it is an integrity receipt, not an external signature. No source or environment values are fabricated as current qualification.

Use frozen source revision from `context.json`, its exact installed tool versions and source digest. Rebuild the package, verify all 149 dist hashes against `artifact-before.json`, then run `bun probe.cjs <absolute-package-root> control` or `replay`, or `bun proof-floor.cjs <absolute-package-root> <owned-output-root>`. The other witness probes share those arguments. Each process sets package-root cwd. Their installed dependency resolution follows the supplied package manifest. Do not preload or install these probes into shipping code. `artifacts.tar.gz` retains every measured emitted file; the four fixture copies and full bundled input hashes are retained separately.

The source identity was captured after probes and matches the previously committed shipping digest. All tracked production source remained clean, initial/final dist inventories match, and budget validation reports no baseline issues. The full site build failed under both Bun and genuine Node 24.15.0 with an Astro external-dependency virtual CSS metadata mismatch; logs are retained. This documentation-only handoff does not claim a passing site build. The primary checkout and its dependency installation were preserved. Original managed links are restored at handoff. No full host or Metro run followed these incomplete probes; the previous complete report remains authoritative.

Next: review the [compiler identity design](../../superpowers/specs/2026-10-08-m10-5-compiled-text-identity-design.md), then one complete implementation/qualification slice if its proof is established. Physical-device/spoken-reader work stays deferred; no publication or runner provisioning.
