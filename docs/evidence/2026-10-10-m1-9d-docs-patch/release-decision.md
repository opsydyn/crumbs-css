# M1.9d — approved 1.1.1 documentation patch

The user approved M1.9d after review of the completed M1.9c and its recommended docs-only npm follow-up. This approval authorises the 1.1.1 source/GitHub/npm release, provided that only packaged README, COMPATIBILITY and the exact metadata version change.

The immutable base is public npm 1.1.0: source `f08a58d022f9237cf3f4aae8bc9bd77d5c75f204`, SHA-256 `51b36b137a97364a30e401dc97f017890b6d3e09ad14d2319ad5cd03925baeda`. All 185 package files must remain present; all 105 JavaScript files, 76 declaration files, LICENSE, exports, dependency and peer fields must match the base. The candidate docs and metadata must match its immutable checked-out 1.1.1 tag. Source/build configuration must also match the base.

Qualification is inherited through byte identity, using the same bounded documentation-patch model as 1.0.1. The original 1.1.0 warm-transform failure (9.269750 ms against 6.513744 ms) and its version-specific decision remain recorded. This is not a new measured performance pass, a new numerical exception, or an extension of that exception to changed product bytes. Generic future-release gates and the old pinned publishers remain unchanged. Any failed invariant blocks this publication.

A dedicated manually dispatched workflow prepares and seals the patch, then a separate hosted job re-downloads the verified base and independently checks the source, docs, metadata and receipt before publishing with provenance. Post-publication verification must check npm/latest, integrity, exact packaged/displayed README, inherited file bytes and cryptographic provenance. Consumer checks and docs build validate usage separately. Physical-device, spoken-reader and release-FPS acceptance remain deferred; M11.6 is parked.
