# M1.10a whole-slice review disposition

A fresh reviewer inspected ea38b6c..4012a95 read-only. No Critical findings. Two Important findings were accepted and fixed in one pass:

1. Source mapping rejected syntax already accepted by esbuild. Four regression cases failed before repair (decorators, legacy import assertions, TSX and JSX); six syntax cases now pass, including import attributes and TS angle assertions. The transform passes its actual filename into the parser. Both old tuple and SDK58 encoded maps remain covered.
2. The old environment probe changed its entry import as well as the environment. The corrected fixture primes each qualified backend, changes env-alpha to env-beta, then restores env-alpha without touching source/configuration. Hash comparisons fail closed on source/configuration drift. Development and all-platform production runs pass. Fresh Rust execution acceptance remains strict for the separate eligible app/dependency cohort; cache-only runs report their actual events.

One Minor remains deferred: destructured export bindings receive file-start provenance instead of declaration anchors. The compiler still accepts this syntax.

No additional reviewer was dispatched. Relevant regressions ran RED then GREEN; the complete post-fix gate is retained in checks/review-check.log.gz.

## Decisions carried through execution

- Ruling: reuse the existing linked worktree on a fresh codex/m1-10a-expo58 branch rather than creating another checkout — existing untracked native data and the primary dirty branch remain untouched.
- Ruling: add explicit --keep to retain only this harness's owned temporary install for subsequent actual-worker probes — existing finally cleanup would otherwise remove the prerequisite between SDK checks; default cleanup remains unchanged.
- Ruling: pin React/DOM/renderer19.3.1 after verifying all public manifests — compatible patch within the official19.3 line, as already allowed by assertOfficialSdkTemplate; no peer override or changed SDK/RN line.
- Ruling: adapt app/shared probe types required to compile the installed SDK58 library consumer (optional ViewToken.index, public FlatListProps-derived callback and nullable flatten result) within M1.10a — no app SDK promotion; leaving them for M1.10b would prevent the prerequisite consumer qualification.
- Ruling: add explicit official SDK57 optional-peer cohort pins to its installed qualification profile only (CLI57.0.28, Router57.0.26, RSDW19.2.8, Reanimated4.5.1, Worklets0.10.1) — current npm auto-selects Router58/React19.3 or Worklets0.13 for broad optional peers; the matched cohort resolves strictly without overrides and preserves all existing SDK57 direct native/React pins. Workspace app manifest remains unchanged.
- Ruling: SDK56 retention requires the same explicit optional-peer treatment plus @expo/ui56.0.10 and React/DOM/renderer19.2.8 — React stays within the supported19.2 patch line, Expo56.0.4/RN0.85.3 remain unchanged; no force/legacy peers. Exact same artifact passes all SDK56 checks. Watched SDK56 staging regression RED before installing the proven overlay profile.
- Ruling: source-map repair is required by the approved acceptance criterion; after allowing time for optional deferral feedback, proceed with that default. Added compiler-only @babel/parser (already installed transitively) to parse authored and generated modules, anchor each emitted export/style-table value to its authored export, imports to authored imports and synthetic helpers to file start. This is explicitly export-level provenance, not property-level precision. Ordinary mappings stay byte-for-byte unchanged. Source-map regression RED (generated line10 vs authored4) then GREEN; compiler external-boundary regression RED before exact compiler-only admission. Ordinary runtime still rejects the parser.
- Final: Ruling: actual simulator/emulator resize/RTL/motion interactions remain M1.10b — library worker/host evidence does not establish native acceptance — cost if wrong: native integration defects discovered in next slice.
- Final: Ruling: native renderer execution and physical dispatcher behavior remain later native/physical acceptance — identical physical React resolution is only package identity evidence — cost if wrong: host-only checks miss device behavior.
- Final: Ruling: performance thresholds and the historical consumer 2.5x claim remain measured M10.5/M1.10c work — routing evidence cannot establish speed — cost if wrong: consumer regression remains unresolved until measurement.
- Final: Ruling: hosted CI, publication and released-byte identity remain M1.10c/separate publication — no current authorization to publish — cost if wrong: release readiness still needs independent proof.
- Final: Ruling: property-level map precision remains outside the approved export/import anchor repair — evaluated/composed properties lack reliable original positions — cost if wrong: debugging is less granular.
- Final: Ruling: retain exactly three independently reproduced RN88 declaration errors as upstream-blocked — never hide them or claim full strict upstream success — cost if wrong: full strict consumers still encounter upstream failures.

- Final: Ruling: retain the partial plan workspace because M1.10b/c are unstarted — deleting its ledger would discard the approved plan's resumable state. Only M1.10a was authorized; no push/merge/publication. Keep the existing branch/worktree, as the user's commit-and-recommend-next workflow requires — cost if wrong: integration and later slices remain to be explicitly chosen.
