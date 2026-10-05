# M10.5 consolidated host remediation and software acceptance

One approved implementation and evidence slice from `0c7c6d2`, with one final commit. Physical-device work remains deferred. The source digest is `1f88a93d9dfbeffc911303eb1e531492cc005d83ba52a885513526d448362673`.

## Selected implementation

Resolution receipts first check absent candidates with `existsSync`, avoiding exception-driven reads and canonicalisation. Missing paths remain explicit null receipts; every capture and final change guard samples again. No cross-call negative cache is introduced. The red regression attempted one missing read; the green avoids it and detects a subsequently created tsconfig. The bounded non-atomic consistency contract remains unchanged. Receipt-only factor probes preserve exact parity and show smaller capture cost; they do not establish complete transform performance improvement.

The default native Storybook browser now uses supported `@storybook/react-native-ui-lite` 10.4.4 with Metro `liteMode`. Its exact Legend dependency is direct in the app because strict hierarchical lookup is disabled. These are developer harness dependencies; Crumbs package APIs and dependencies remain unchanged. Reference-only preview retains its existing path. Removing the duplicated Babel plugin and disabling Metro lazy bundling did not repair the animated FullUI failure and are not retained. Worklets import alone succeeded, while Reanimated's flush path encountered missing `queueMicrotask` in a separate runtime context. This is bounded diagnosis, not a proven upstream fix. LiteUI removes that UI dependency path; animated FullUI remains unqualified. A nonfatal Legend pooling warning and Expo Tools overlay remain visible harness limitations.

The retained Maestro flow passed on both platforms: Controls edit and restoration, action-event visibility, Dark/Light/Disabled visits and return to Dark. This establishes the recorded labels and event-name visibility; it does not prove fresh event attribution in reused sessions, disabled-press suppression or exhaustive screenshots.

## Evidence and boundaries

Package regression: 1,485 passed; Storybook: 23 passed; production build and both typechecks passed. Shipping cache-enabled watched Metro records sixteen source/fresh-reference matches and the expected syntax-error control. Independently installed packed consumers passed types, host journeys and iOS/Android/web exports. Independent source/artifact identities bind each serial collection window.

Direct iOS 26.4 Simulator and Android API 36 emulator reference/action checks passed. Font scale, contrast, reduced/full motion and LTR/RTL previews were observed, with preferences restored. Authored CSS Fast Refresh changed and restored the probe on both platforms; both unchanged-frame pairs are byte-identical. Owned Metro descendants stopped without survivors, the owned emulator stopped and the temporary Simulator was deleted. Native context and UI coverage remain bounded. Spoken VoiceOver/TalkBack, exhaustive variant review and physical-device acceptance were not performed.

## Theme/runtime disposition

Current `theme/core` re-exports the generic shared resolver. `resolveThemeTokens` dispatches component and extension descriptors through their validators; compatibility `theme` also carries recipe, sprinkles, conditions and expressions. This preserves existing API semantics and cross-entry function identity, while retaining these static graph contributors. [Historical attribution](2026-10-02-m10-5-budget-failure-triage.md) and [rejected layout trials](2026-10-03-m10-5-identity-preserving-chunk-layout-ab.md) locate contributors and show why earlier regrouping/minification candidates were not admitted. Those historical measurements are not promoted to current evidence.

No further bounded theme change was demonstrated in this slice. Removing descriptor support or duplicating entry functions would violate the approved compatibility requirement. Source separation alone does not remove the statically reachable generic dispatch. A redesigned runtime boundary needs its own parity/identity evidence before admission. The current host comparison below retains failed or incompatible gates without relaxing ceilings or rewriting baselines. No production retained-context cache is enabled.

## Current host result

The full serial comparison reports **12 pass, eight fail, one environment mismatch**; all five legacy smoke repetitions pass. Performance qualification remains false. Failed cells are Node 22 CJS startup (4.494 ms), Node 24 ESM/CJS startup (4.118/3.267 ms), warm full-transform latency (9.163 ms), and theme/core ESM/CJS graphs (64,549/65,408 bytes) plus compatibility theme ESM/CJS graphs (164,215/171,842 bytes). Token graphs remain within their approved limits. Metro's measured 135.940 ms has an Expo 56.0.4 versus 56.0.23 mismatch; no threshold qualification is assigned. Node 22 ESM startup passes at 7.468 ms in this run. Theme source/graphs are unchanged, so that timing change is not evidence of a theme remedy. The earlier 10.678 ms warm median and this 9.163 ms median are separate runs, not a paired causal A/B.

The engineering slice is complete with the stated gates unresolved. **M10.5 remains open.** Next recommendation: **M10.5 — compatibility-preserving runtime-boundary design**, with theme graphs/startup handled together and transform latency/Metro comparability retained as admission gates. Spoken-reader and exhaustive native acceptance remain separate unperformed checks. No physical work is advanced.
