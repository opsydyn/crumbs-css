# Native playground acceptance

Approved next slice: exercise the Expo playground on available iOS/Android native targets, retain evidence, and commit after the slice. Recommend the next bounded slice after committing; wait for approval before starting it.

- [x] Discover available native tooling and create a separate simulator where another project is active.
- [x] Launch the workspace consumer with its recorded package/version/revision identity.
- [x] Attempt list scrolling and exercise theme switching, form text/switch updates, parent/nested scopes, and explicitly bridged portal opening/closing. Scrolling did not move visible rows and remains unverified.
- [x] Retain screenshots, observed behavior and concrete blockers. Simulator checks are not physical-device or release performance qualification.
- [x] Update the roadmap and consumer guide; retain this evidence as a separately committed slice after checks.

Preserve the pending release-version edits. Do not claim Android acceptance when an Android target is unavailable. Fix an acceptance-blocking playground defect only if necessary to complete these journeys; wider compiler/API work remains a separate slice.

Outcome: partial iOS simulator acceptance. Seven screenshots and a result with hashes are retained in [the acceptance report](../../acceptance/2026-09-14-ios/README.md). Android tooling is unavailable; gesture scrolling, physical devices, performance budgets and accessibility navigation remain open. The dedicated simulator is retained but shut down; the workspace supervisor and its children were stopped. No app/compiler code was changed to manufacture a passing gesture check.

Verification: `bun run check` passed build/typechecking and 127 tests / 5,255 assertions. Docs built 20 pages; all seven screenshot hashes and local evidence links verified; `git diff --check` passed. Process inspection confirmed both Metro/build children were absent and only the pre-existing simulator remained booted.
