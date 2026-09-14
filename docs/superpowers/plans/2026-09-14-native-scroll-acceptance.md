# Native scroll acceptance

Approved scope: investigate the unresolved native list gesture, establish a reproducible acceptance check, retain evidence and commit the slice. Preserve unrelated release-version edits.

1. Reuse the dedicated Crumbs simulator and reproduce the previous no-movement result.
2. Check gesture coordinate mapping and input delivery; add opt-in native list telemetry if needed to distinguish gesture delivery, viewport/content sizing and scroll offset.
3. Establish a repeatable native gesture whose actual offset and visible row range advance. Verify theme switching preserves that scroll position and a reverse gesture moves back.
4. Fix application code only if native evidence demonstrates an application defect. Keep test instrumentation off by default and avoid drawing performance conclusions from a development probe.
5. Retain exact package/revision identity, screenshots and remaining limits; run appropriate checks, commit and recommend the next slice.

This slice targets iOS simulator functional scroll acceptance. Android setup, physical-device frame-time/startup budgets, and broader compiler fixes remain separate work.

Diagnostic sub-slice: coordinate taps were calibrated. Native telemetry showed two touch starts/ends with zero move callbacks, native drag starts or offset changes; content height exceeded viewport height. No list layout/compiler change was justified. The development-only probe is opt-in and supplies stable test IDs. iOS production-mode observation with the flag still enabled confirmed the probe UI was hidden; native bundles retain its guarded strings, while web export strips the UI markers.

Native swipe acceptance is not complete. Execution pauses after committing this diagnostic sub-slice pending the user's explicit Maestro/XCTest choice required by the computer-use instructions. The acceptance contract for real swipes, theme position preservation and reverse movement is retained in the evidence report.

Verification: package build/typecheck and 127 tests / 5,255 assertions passed; playground typecheck and production iOS/Android/web exports passed; docs built 20 pages. Screenshot hashes and local evidence links verified. No package dependencies were added and unrelated release-version edits remain preserved.
