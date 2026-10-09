from pathlib import Path
import json,statistics
r=Path.cwd();e=r/'docs/evidence/2026-10-09-m11-4-token-algebra';s=r/'.superpowers/sdd/2026-10-09-m11-4-token-algebra'
h=json.loads((e/'host/qualification.json').read_text());n=json.loads((e/'native/qualification.json').read_text());b=json.loads((e/'host-budgets/comparison.json').read_text());assert h['host']=='passed' and n['acceptance']=='passed'
c=[json.loads((e/'costs'/f'run-{i}.json').read_text()) for i in [1,2]]
fail=[f for f in b['metrics'] if f['id'] in b['blocking']['failIds']]
rows='\n'.join(f"| {a['name']} | {a['count']:,} | {a['elapsedMs']:.3f} | {c[1]['workloads'][i]['elapsedMs']:.3f} |" for i,a in enumerate(c[0]['workloads']))
failed='; '.join(f"{a['id']}={a['current']['median']:.6f}{a['unit']}" for a in fail)
assessment=f'''# M11.4 — Pure colour and typography token algebra

Status: functional qualification passed; whole-slice review and final implementation commit remain pending. This accepts a development artifact, without release-policy or publication qualification.

## Delivered API

The additive optional `@opsydyn/crumbs-css/tokens/algebra` entry exports ten functions for colour construction, explicit encoded/linear sRGB premultiplied interpolation, alpha replacement/attenuation, native colour emission and immutable named typography scales. Descriptors are frozen ordinary versioned data. Admission rejects unsupported fields/accessors/decorated tuples before reading values; native numeric metrics remain unscaled. Existing semantic palettes, scalar/token brands, compiler/expression behaviour and all 28 old value surfaces are preserved.

The new entry has zero runtime externals and is isolated in both directions from old graphs. It costs 8,969 raw/2,645 gzip bytes for ESM and 9,291 raw/2,723 gzip for CommonJS. No product dependency, version, peer range, lock or numerical policy changed.

## Qualification

Final source types, Storybook/playground types and 1,768 CSS/29 Storybook tests pass (one existing optional exact-floor skip). Independent reference vectors and seed20261009 property checks cover premultiplied colour laws, bounded descriptor admission, float32 representability, native units, signed spacing and direct-from-base finite scales. Installed declarations pass Bundler and Node16 checks.

The exact retained tarball `{h['artifact']['sha256']}` passes frozen physical installation, exact inventories, true ESM-first/CJS-first traces, four genuine Node22.0.0/24.15.0 format probes consuming two physical copies without runtime peers, integration controls and iOS/Android/web Expo exports. Packed peers are React/RTR19.2.3, React Native0.85.3, Expo56.0.4, Metro0.87.1 and TypeScript6.0.3.

Fresh Expo Go/Hermes native qualification passes 12 finite phases on each platform, including rendered independent colour/alpha controls, named steps/ratios, unrelated-state independence and actual native font preference changes/restoration. iOS uses its owned iPhone17/iOS26.5 Simulator; Android uses its owned Android36 ARM64 emulator. Both generated/control Text samples agree within one native layout unit, and pixel controls within2/255. Base16/24/-.25 remains unchanged. Real preferences/scale and native geometry are observed, rather than injected.

Two Text samples remount when the real native scale changes because this Expo/RN cohort retained previous mounted measurements. Font comparisons start from the initial blue/sRGB/ratio1.25 scenario so Android activity recreation cannot substitute a design-ratio change for font scaling. This does not qualify universal live Text invalidation or design-state persistence across activity recreation.

The worktree docs build repeats the known Astro metadata failure with external dependency symlinks. A byte-identical audited source/config builds all32 pages in the owned frozen installation; the authored inputs remain unchanged afterwards.

## Cost evidence

These consumed host workloads introduce no numeric thresholds or native FPS claim. Fresh process timings are diagnostics, without attributing differences to causal improvements.

| Workload | Count per process | Run1 ms | Run2 ms |
| --- | ---: | ---: | ---: |
{rows}

## M10.5 remains separate

The unchanged collector uses the matching Expo56.0.4/Metro0.84.4/React19.2.5 baseline through an owned temporary read-only dependency overlay. Its selected dependency bytes, original app link, source/artifact and policy are verified and restored. All21 rows retain current environment and measurement identities. Blocking pass IDs: {', '.join(b['blocking']['passIds'])}. Blocking failures: {failed or 'none'}. Incomplete blocking rows: {len(b['blocking']['incompleteIds'])}. Release policy qualified: `{str(b['releasePolicyQualified']).lower()}`. Existing warm-transform and historical incremental dispositions remain under M10.5; no numerical waiver or release claim is inferred.

## Evidence and limits

See [evidence index](../evidence/2026-10-09-m11-4-token-algebra/README.md). Superseded source cohorts and failed native attempts remain distinct; a passed platform prefix in a failed receipt establishes no acceptance. Exact consumed exports, generated inputs, served bundle/maps, images, raw commands, seeded checks and execution records are retained with hashes.

Physical devices, spoken readers, interactive browser behaviour, live authored HMR, release Hermes/FPS, arbitrary Proxy safety and unrecorded peers/platforms remain unqualified. M11.5 — constrained serialization and extension protocol — is the next feature slice; its implementation and publication await separate authority.
'''
(r/'docs/assessments/2026-10-09-m11-4-token-algebra.md').write_text(assessment)
(e/'README.md').write_text('''# M11.4 token algebra evidence

Current functional qualification passes on one exact development artifact. Fresh whole-slice review and final commit are pending. M10.5 release acceptance remains separate.

- `host/qualification.json`: source/tarball/frozen install, 28 old surfaces, strict installed declarations, true load traces, four genuine Node/version/format probes and three Expo exports.
- `host/retained-inputs.json` and `host/retained-exports.json`: lossless gzip archives of consumed/generated files and real Expo exports. Hash decompressed bytes against recorded originals; the path index retains original execution locations.
- `native/qualification.json`: accepted 12-iOS/12-Android captures, actual native font preference/scale/layout events, installed Hermes bundle/map bindings and complete cleanup/restoration.
- `visual-inspection.json`: directly inspected current image hashes. Hierarchy/telemetry alone is insufficient.
- `costs/run-1.json`, `costs/run-2.json`: consumed helper work, raw/gzip entry hashes and genuine pure cold imports; no new performance threshold.
- `host-budgets`: unchanged matched21-row M10.5 comparison with stable source/artifact/policy identities; failed numerical rows remain failures.
- `budget-environment.json`: selected baseline package/tool identities and automatic temporary app-link restoration. Budget Metro0.84.4/React19.2.5 differs from recorded packed-native Metro0.87.1/React19.2.3.
- `final-integrity.json`, `dependency-restoration.json`: final consumed-byte and original five-root/link checks.
- `execution`: plan ledger/rulings, fresh whole-slice review, RED/GREEN/full-suite/build/type/docs logs, ownership and execution helpers. Raw records retain actual execution paths.
- `superseded-host-01`: native Text path guard corrected before any native attempt; full host passed but cannot qualify later source bytes.
- `superseded-host-02`, `failed-native-02`: real iOS scale changed but fixed-height/stretched-width fixture concealed outer layout change; cleanup passed.
- `superseded-host-03`, `failed-native-03`: intrinsic width still retained prior mounted native measurements; lifecycle regression reproduced and repaired. Original generated/native inputs and exports remain losslessly retained; consumer03's component was subsequently changed solely for the diagnostic GREEN probe, and is not accepted.
- `superseded-host-04`, `failed-native-04`: iOS font checks passed; Android configuration recreation reset design controls, invalidating the font comparison. Both platforms are marked failed and cleanup passed.

See the [assessment](../../assessments/2026-10-09-m11-4-token-algebra.md) for source/artifact identities, native measurement limits and release boundary. Physical, spoken-reader, interactive browser, live authored HMR and release-FPS work remains unqualified.
''')
print('Draft assessment/index written from actual accepted receipts; review/commit remain pending')
