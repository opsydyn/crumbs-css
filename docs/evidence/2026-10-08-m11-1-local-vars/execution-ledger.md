# SDD ledger — plan: docs/superpowers/plans/2026-10-08-m11-1-local-vars.md

Base: de8d758. User approved plan on 2026-10-08; native/inline execution, single implementation slice.

Tasks: 0 environment; 1 admission/authoring; 2 compiler; 3 resolver; 4 React/package; 5 qualification/docs/commit.

Pre-flight interfaces:
- 1 → 2/3: versioned admitted operands + normalized domains match capture and resolver; no conflict.
- 2 → 3: ordered winning declarations + dependency metadata match resolver; no conflict.
- 3 → 4: bounded selector consumes optional existing theme; no conflict.
- 4 → 5: new ordinary-runtime subpath and shared nominal graph match packed/native consumer; no conflict.
- Ruling: Continue in already-isolated reviewed main checkout — plan names this checkout and user approved it; no new worktree or merge is needed; cost if wrong is branch relocation.

Task 0: Owned frozen-lockfile install succeeded (1094 packages); lock SHA256 61543a5d560ebdcb4ca5ce565ef650c76589c8ad38d972034812b3cab72b87bd. Original dependency symlinks saved to original-links.json; temporary links point into /private/tmp/crumbs-m11-1-install. Node 22.0.0 / 24.15.0 and Bun 1.4.2 verified.

Task 1: RED observed missing modules (task1-red.log). Initial GREEN exposed a fixture using token() instead of existing token.color(), and enum tuple order unsoundness after canonical sorting. Ruling: represent local enum members as a finite union array — preserves membership without promising authored tuple order; cost if wrong is a declaration correction. Fixture corrected to the existing token API.

Task 1: Ruling: infer the fallback terminal tuple and check branded terminals separately — TypeScript accepted incompatible primitive intersections through the literal/reference union despite rejecting each branch independently. Same public call forms and requirements; cost if wrong is inference friction for broadly typed argument arrays.

Task 0: baseline build/typecheck plus 1580 CSS and 23 Storybook tests passed before implementation. CJS floor/current control captures preserve export/alias relationships; ESM control capture and native identities remain to record.
Task 1: complete (commits de8d758..de8d758, tests: bun test packages/css/test/local-vars-contract.test.ts packages/css/test/local-vars-admission.test.ts packages/css/test/local-vars-contract.property.test.ts packages/css/test/token-domains.property.test.ts packages/css/test/token-contract-identity.property.test.ts packages/css/test/token-contract-aliases.property.test.ts → Ran 36 tests across 6 files. [229.00ms])

Task 2: RED confirmed CRUMBS_IR_INVALID_VALUE for real local operands after correcting fixture transform signature/dependency link. Ruling: copy the CSS evaluator realm at the compiler boundary before same-realm runtime admission — evaluator plain objects have foreign Object/Array prototypes; accept native evaluator prototypes only, descriptor-read and freeze the copy; cost if wrong is evaluator portability or admission complexity. Runtime external admission remains unchanged.
Task 2: complete (commits de8d758..de8d758, tests: bun test packages/css/test/local-vars-compiler.test.ts packages/css/test/local-vars-compiler.property.test.ts packages/css/test/local-vars-metadata.test.ts packages/css/test/native-ir-opacity.test.ts packages/css/test/native-ir-logical-padding.test.ts packages/css/test/primitive-references.test.ts packages/css/test/transformer.test.ts packages/css/test/manifest-compiler-sidecar.test.ts → Ran 69 tests across 8 files. [4.91s])

Task 3: RED observed missing resolver/selector modules (task3-red.log). Ruling: infer the public resolver theme contract as an additional generic — NativeTheme<Record<string, unknown>> computes an unusable never-valued legacy table and rejects ordinary typed token themes; callers keep the specified call form without casts, existing APIs unchanged; cost if wrong is declaration complexity. Internal snapshots retain unknown values only behind admission.
Task 3: complete (commits de8d758..de8d758, tests: bun test packages/css/test/local-vars-resolver.test.ts packages/css/test/local-vars-resolver.property.test.ts packages/css/test/local-vars-cache.test.ts → Ran 15 tests across 3 files. [209.00ms])

Task 5: Ruling: Refresh only the explicitly synthetic release unit-test fixture graph/hash fields from the package under test. The fixture already replaces measurements with synthetic passing values; copying old graph identities made every later feature build fail setup. Retained reports, policy, baselines and production verifier are unchanged. Cost if wrong is test-fixture coupling.

Task 5: Ruling: Follow the packed fixture's precompiled-style convention. Its inventory deliberately rejects .css.ts source-map entries, including generated native data mapped to an authored filename. Compile through the installed public transformer, consume .styles.native.js/.web.js, retain hashes/companion metadata, and leave the inventory denial unchanged. Workspace compiler freshness remains separately exercised. Cost if wrong is build-sequence parity.
Task 4: complete (commits de8d758..de8d758, tests: bun test packages/css/test/local-vars-package.test.ts packages/css/test/theme-runtime-boundaries.test.ts packages/css/test/pack-consumer-contract.test.ts packages/css/test/packed-runtime-graph.test.ts → Ran 57 tests across 4 files. [8.11s])

Task 0: ESM/CJS controls now pass for genuine Node 22.0.0 and 24.15.0. Owned native identities recorded: iOS 848D36A4-3B2A-41D1-A790-927B0A6A9C98; Android emulator-5568 / crumbs_m111.
Task 4: Installed React import orders, provider sharing/replacement/unmount cleanup and genuine Node first-use controls passed before review; reviewed packed replay remains the final artifact check.
Review: One fresh whole-slice reviewer found no Critical issues, five Important defects and one Minor diagnostic context issue. Three Important findings were independently verified repaired during review; the remaining two plus the Minor have failing/passing regression evidence. No finding is deferred. Native, M10.5, physical, rendering and proxy boundaries remain separately judged by the coordinator.

Task 5: Final reviewed packed consumer host qualification passed all 17 commands; tarball SHA256 60abb3e61bda5333eebb7932b8eb63c00ae124f0d530d153748ce77f5cd87b50. iOS and Android six-phase native replay and visual review passed. Installed files rechecked against tarball. Owned Metro, reverse mapping and native devices stopped. Host collector attempt 1 failed on the old playground dependency directory; original app directories were preserved and temporarily linked to the verified frozen install. Retry is pending; no collector, policy or baseline changes.

Task 5: Matching full host collector completed with unchanged policy and exact source/artifact/policy before/after identity: 10 blocking pass, warm-transform fail at 8.938250 ms; 2 advisory pass and 8 fail; no incomplete rows. Metro passes at 134.215208 ms under approved Expo 56.0.4 / Metro 0.84.4. No new blocking failure and no release waiver.
Final: Re-grade the reviewer diagnostic Minor as Important: without variable/export/phase context callers cannot locate invalid native assignments. It entered the same fix pass and its percentage border-width regression passed RED to GREEN.

Final: fixed null-prototype export freezing — null-prototype local export map RED→GREEN, suite 1631 CSS + 24 Storybook passing (one existing skip).
Final: fixed generic local text/image typing — generic style/styleVariants type probe RED→GREEN, package typecheck and suite passing.
Final: fixed structured primitive intersection — generic structured-property compiler regression RED→GREEN, suite passing.
Final: fixed custom compiler prototype spoofing — compiler ingress regression RED→GREEN, suite passing.
Final: fixed nested cached local-plan bypass — mutable arrays/nested maps regression RED→GREEN, suite passing.
Final: fixed actionable property diagnostic context — resolution.cardBorder.borderTopWidth / Card.border regression RED→GREEN, suite passing.
Final: Ruling: Native acceptance and artifact freshness are coordinator-owned — the final tarball, installed hashes and both native replays pass — cost if wrong is stale artifact acceptance.
Final: Ruling: M10.5 closure and publication remain separate — the unchanged matched host run retains its warm blocker; no release is authorised — cost if wrong is an invalid release claim.
Final: Ruling: Physical performance and screen-reader acceptance remain deferred — the user excluded those contexts; emulator evidence does not cover them — cost if wrong is an unsupported accessibility or device claim.
Final: Ruling: Retain existing colour and finite-number boundaries — native evidence covers sample transitions, not arbitrary rendering or contrast — cost if wrong is renderer-specific behaviour outside the tested sample.
Final: Ruling: Proxy traps and deliberate registry corruption remain outside the contract — ordinary admitted data is validated, hostile JavaScript isolation is not promised — cost if wrong is insufficient protection against hostile callers.
Task 5: complete (commits de8d758..de8d758, tests: python3 /private/tmp/crumbs-m111-final-audit.py → M11.1 feature acceptance passed; M10.5 remains open with the warm-transform failure.)

Task 0: complete — frozen install, pre-feature controls, current Node matrix and owned native harnesses recorded.
Task 5: Temporary root/package links and both original app dependency directories restored; no unrelated native project or primary dependencies modified. Final artefact audit remains independent of restored dependencies.
