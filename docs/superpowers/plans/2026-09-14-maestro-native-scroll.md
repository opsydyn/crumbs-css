# Maestro native scroll acceptance

The user explicitly selected Maestro. Install its official CLI and Java prerequisite, pin the tested versions, target only the dedicated Crumbs simulator, and commit the completed slice. Preserve the pending release-version edits.

- [x] Install and identify Maestro/Java; inspect current official flow command syntax.
- [x] Add a reusable iOS Expo Go flow with actual native gesture and scroll-probe assertions.
- [x] Run a negative no-swipe check, then upward swipe / visible-row advance, exact theme position preservation, and reverse movement checks.
- [x] Repeat the passing flow from a fresh consumer launch; retain reports, measurements and screenshots.
- [x] Document commands and limitations, verify package/playground/docs checks, clean up test processes and commit.

This is native functional acceptance in Expo Go, not standalone release, Android, physical-device or performance qualification. The probe is enabled only for the acceptance flow. No programmatic scroll command may substitute for a native swipe. Invalid or missing probe measurements must fail acceptance.
