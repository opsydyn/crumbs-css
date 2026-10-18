# M10.5 root-cause investigation — 2026-10-18

**Diagnostic outcome only. No production optimization or release pass.** The user reopened remediation for one precise final investigation. Base `b34f2ee`; shipping files, runtime imports, APIs, numerical policy and exact release pins remain unchanged.

See [assessment and proposed contract](../../assessments/2026-10-18-m10-5-root-cause.md).

## What is retained

- `raw.json.gz`: all scratch JSON observations, including failed setup, early exploratory runs, the corrected five-pair memo cohort, 20-process historical factorial, side-effect and stale-resolution controls. Preliminary and corrected cohorts remain separate.
- `build-inventory.json.gz`: reconstructed historical/current source and generated JavaScript hashes. These use current installed tooling, not restored historical dependencies or qualification builds. Declaration builds were excluded in both by a derived config.
- `repro/`: exact diagnostic workers and reconstruction scripts. They use the original worktree and an owned fixed temporary path; reruns require a new owned root and corresponding path substitutions. Never run preparation over an existing directory or point mutation workers at a real checkout. Context and text probes deliberately lack complete eligibility/lifetime/size/concurrency contracts and are not library code.
- `current-build-parity.json`: all 105 reconstructed current JavaScript artifacts match the original shipping files byte-for-byte. This does not qualify the historical artifact or any memo.
- Byte-preserving gzip build logs, unchanged fixture hashes, fresh-effect logs and `status.json` preserve the scope.
- `verify.py` rederives cohort selectors, stable output parity, memo hit/confirmation accounting, effect parity and the expected stale-resolution failure. Integrity replay cannot qualify timing on a different host or establish complete production correctness.

## Protocol

Historical factorial: 5 serial blocks × 4 source/authoring combinations, compiled CJS, profile observers from the earlier attribution worker. Even blocks reverse combination and fixture order. Each fixture gets two setup and six retained calls. Summaries use nearest-rank p50 per fixture/process, then p50 across five processes. Historical pipeline with current authoring and the reverse are diagnostic hybrids; they are not shipping candidates or proof of feature equivalence. Paths, source and emitted development metadata differ between historical/current copies.

Corrected text envelope: 5 serial alternating control/memo process pairs over the same current copied artifact and fixture paths. Two setup and six retained calls per fixture. Each process selector is its worse fixture p50; final selector is p50 across five processes. Full transform timing includes existing shipping resolution checks, fresh VM evaluation/capture/emission, and the diagnostic known-input byte/canonical-path check. It excludes a complete graph topology/config/compiler witness, cache resource/admission hardening and Metro outer-cache integration. Fresh compiler confirmations are required before memo readiness. No evaluated exports, native output, source maps or runtime module graph are cached.

Only a stopped owned esbuild service is cleaned up; no other project workloads were stopped. Three unrelated Node/Bun processes used roughly 3–4 CPU cores at an observed host snapshot. The user was asked to pause them but no confirmation had arrived at collection. These are contended local diagnostics; no performance acceptance or environment equivalence claim follows. Default sandbox and two unrestricted exploratory runs are retained separately. All final factorial and corrected-envelope rows used the default sandbox. No concurrent work was started by this task during these serial timings.

## Errors and corrections

1. The first source-boundary instrumenter measured async `compile` return scheduling, not settlement. `source-profile.json` is invalid for compile duration. `source-profile-corrected.json` awaits the existing returned promise solely to close the diagnostic span. Neither replaces uninstrumented timing.
2. A historical-transformer/current-helper hybrid was tried before complete historical source reconstruction. Its result is not the historical baseline and is excluded from the factorial.
3. The first reconstruction invocation named a not-yet-created cwd and failed before execution. Preparation then ran in the existing owned scratch root.
4. The first text collector accidentally returned its input assignment from esbuild onEnd. All five memo launches failed with the same invalid-onEnd result, retained in `text-setup-failures.json`; fixed callback returns void. These are not numerical results.
5. The initial text envelope allowed a hit during first-discovery confirmation. It was corrected to require two agreeing fresh compile results and unchanged observed bytes before readiness. Only `text-v2-*` is used for the final envelope. V1 remains visible and unqualified.
6. Root-level integration resolution initially failed because integration is installed under the CSS workspace. Subsequent reads resolve through that package. Read-only process inspection was sandbox-denied and repeated once with approval; it exposed no credentials.

7. The retained raw build logs contain a trailing space emitted by tsdown. The staging whitespace check reported it; both logs were gzip-compressed without changing their bytes, and the final check was rerun.

## Reproduction boundaries

Use `prepare-history.py` with an empty owned scratch root, then run the installed tsdown binary in each copy against `probe-build.config.ts`. This uses commits `92852615e8d37c31d6bea29bc388a39bda40b9d7` and `b34f2ee`, current installed dependencies and node_modules symlinks. `run-factorial.py` records the exact arguments. `text-v2-commands.json` within the raw archive records the corrected envelope/effect commands. The effect fixture appends its ambient value once per evaluation; mutation fixtures create/restore owned `probe-input.js` and `probe-input.ts`. Their exact authored sources are listed below; all are scratch-only:

```ts
// probe-effect.css.ts
import {style} from "@opsydyn/crumbs-css/style";
import {appendFileSync} from "node:fs";
appendFileSync(process.env.CRUMBS_PROBE_LOG!,process.env.CRUMBS_PROBE_VALUE+"\n");
export const box=style({width:Number(process.env.CRUMBS_PROBE_VALUE)});
// probe-import.css.ts
import {style} from "@opsydyn/crumbs-css/style";
import {width} from "./probe-input";
export const box=style({width});
// initial probe-input.js
export const width = 11;
```

Original exploratory observer is retained in `../2026-10-17-m10-5-repeated-package-cost/repro/measure.cjs`. Standalone script copies include local paths. This slice authorizes a local documentation commit, not a public evidence push.

Upstream context-cache semantics consulted: [esbuild rebuild API](https://esbuild.github.io/api/#rebuild). Installed integration8.0.10/esbuild0.27.7 source remains the implementation evidence; the current docs are explanatory, not a claim that an untested upgrade fixes anything.
