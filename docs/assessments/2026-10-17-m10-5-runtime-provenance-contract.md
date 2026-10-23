# M10.5 ordinary-runtime provenance assessment

Date: 2026-10-17. Assessment base: `09de3fe`. **Assessment only.** No guard, build, runtime, dependency, performance policy or release disposition changes.

## Decision

Keep the pure-contract kernel parked as release remediation. Its stopped proof exposed a mismatch between emitted filename families and observed module provenance. Assessing that mismatch does not admit the rejected candidate or demonstrate a faster compiler.

Recommend a separately designed, artifact-bound provenance contract if packaging work resumes. Preserve the existing guard until a replacement is approved and qualified. Do not add a broad `rolldown-runtime-*` exception or rename emitted code to satisfy the current check. Neither action would establish the origin of arbitrary bundled code.

The approved feasibility plan has already executed and closed at its first failed gate in `09de3fe`; a subsequent approval of that same written plan does not require repeating its candidate. The [outcome](../evidence/2026-10-17-m10-5-pure-contract-kernel/README.md) remains authoritative for failed and unrun stages.

## What the current checks establish

The [Metro source-list contract](../../scripts/runtime-bundle-contract.ts) rejects named compiler/Effect dependencies and permits only specific Crumbs runtime entry/chunk filename families. It requires retained maps containing Crumbs code for iOS, Android and web; Storybook adds its package-presence checks. This is a deliberately conservative packaging contract. Its filename check is not source-module membership analysis.

The independent [packed import auditor](../../scripts/packed-runtime-graph.ts) follows emitted local dependency edges, classifies public entries, restricts external imports, rejects ordinary-runtime reachability into advanced/compiler entry targets and rejects unsupported loaders. It complements the source-list guard. Traversing JavaScript imports cannot establish that an import-free local file contains only runtime implementations: authoring code can be bundled inside that file.

Consequently, passing import graphs alone is insufficient to remove the provenance guard. Conversely, a new chunk filename alone does not demonstrate that a compiler dependency leaked. Keep these two conclusions separate.

## The retained failure

Direct inspection of the archived candidate confirms:

- `rolldown-runtime-9BSl_Epz.cjs` is 554 bytes of object-property/CJS interop glue with no imports. Its recorded build membership is the synthetic `\0rolldown/runtime.js` module. The token CJS closure newly reaches it, and the unchanged filename guard rejects it.
- The separate 79-byte ESM helper imports `createRequire` from `node:module`. The retained token ESM and three-file style ESM graphs do not reach it. A future provenance rule must distinguish these helpers and their actual reachability rather than approve a shared filename prefix.
- All 59 candidate import rows pass; the ordinary-runtime source-list check passes 29 of 30 rows. Both token formats have zero external specifiers. These facts show no observed token compiler/Effect import leak in this proof; they do not establish arbitrary helper purity or candidate runtime parity.

Do not call this a qualified kernel rejected only by an incidental test. Candidate identity, nominal declarations, behavior/maps, cache edit/restore, downstream packaging, SDK/native contexts and timing were not run. The full candidate still lacks all those proofs.

## Options

| Option | Benefit | Limitation and disposition |
| --- | --- | --- |
| Keep the present filename contract | Preserves the approved guard and existing shipping package; no new policy authority needed. | Rejects some apparently harmless future layouts. Retain now while the kernel is parked. |
| Add or disguise a helper filename | Small mechanical change. | A prefix or renamed file does not bind contents to origin, distinguish Node loader glue or prove isolation. Reject as the next slice. |
| Bind artifact bytes to reviewed source/module provenance, retaining independent import auditing | Makes runtime admission explicit across packaging changes and can distinguish known generated glue. | Requires build/pack/map integration and negative controls. Recommended design direction only; not a change approved by this assessment. |

## Requirements for a future provenance design

The following are design inputs, not an implemented schema or accepted architecture:

1. Bind the exact packed JavaScript path, format and byte digest to its complete recorded module membership, with a generation identity that prevents stale or cross-format evidence. Distinguish original source modules, bundled vendor code and generated helpers. A self-asserted manifest is not independent attestation; its trusted build boundary and reproducibility must be explicit.
2. Classify allowed original runtime implementations separately from compiler/authoring implementations and optional advanced runtime code. Review synthetic helper content and dependencies for the exact pinned toolchain. No general semantic-purity claim follows from a synthetic module name, empty import list or digest alone.
3. Keep AST dependency traversal, entry classification, existing peer restrictions and Node/compiler/Effect denial for ordinary runtime. A source-map receipt must resolve the actual installed artifact; it must not silently accept unknown sources or paths because metadata is missing. Define how packed provenance remains usable after Metro combines or removes modules.
4. Fail closed on unknown members/helpers, missing or stale receipts, modified bytes, package/path escapes, format substitution and incomplete platform evidence. A future negative suite must reject both inline compiler code hidden in an allowed-looking chunk and transitive compiler/Node dependencies; also cover the reviewed CJS helper versus the Node-dependent ESM helper.
5. Preserve existing public exports, canonical bindings, registry behavior, declarations, Node22.0.0 and SDK56/57/58. Qualify actual packed ESM/CJS and platform maps. Provenance admission remains separate from binding, behavior, cache and performance gates.

No fallback from failed provenance validation to legacy permissive acceptance should be introduced. A migration must keep the current shipping package checkable and make any additional packaged metadata explicit in the release artifact review.

## Performance and release decision

The kernel reduced style files from 8 to 3 ESM and 9 to 4 CJS, while increasing local bytes by 1,076 and 168. File consolidation may reduce resolution overhead, but fresh compilation still processes the implementation bodies. This proof supplies no measured effect size; it cannot justify another performance prototype solely because a revised provenance contract could admit its helper.

The retained [M1.10c host decision](../evidence/2026-10-17-m1-10c-expo58-release/final-release/README.md) still has cold, warm and relative incremental failures. From its warm result of 12.346250 ms, reaching the effective unchanged 6.513743750000014 ms ceiling requires approximately 47.24% less time. No evidence here closes that gap. No exception is approved by this assessment, and the immutable source release is unchanged. Registry/latest and hosted workflow state were not refreshed in this slice; publication remains blocked by the recorded gate and user decision to remediate.

**Next recommended M10.5 slice: design the artifact-bound runtime-provenance contract as a separate correctness improvement.** Do not combine it with kernel adoption or another benchmark. Any subsequent compiler experiment needs a credible mechanism for the required full-transform reduction and its own bounded approval; a more accurate provenance contract is not that mechanism. M1.10c release qualification remains open, and physical acceptance remains deferred.

## Fresh verification and limits

At this assessment base, the six existing runtime bundle contract tests pass with 40 assertions. The retained kernel verifier, run with `--repository`, confirms 252 control pairs, 488 derived markers, 59 export rows, the single candidate source-guard failure, 172 archived candidate artifacts and all 181 unchanged shipping artifacts. Direct archive inspection confirms the helper bytes described above. No scratch candidate was rebuilt or resumed, and no timing, native run, full library suite, public push or publication occurred. These checks verify the assessment's local basis; they are not a fresh release qualification.
