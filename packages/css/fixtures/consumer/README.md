# Required compiler consumer fixtures

This package-owned project replaces the removed `apps/native` test and benchmark dependency. Keep all four modules under `styles/`: tests and benchmarks reject missing files/projects and directory impostors before running.

- `shared.css.ts`: typed text/view styles, themed physical spacing, and variant-map output.
- `button.css.ts`: themed recipe base, defaults, explicit boolean states, compound selection, and a separate typed text label.
- `reference.css.ts`: project-local dependency imports without authoring internals.
- `theme.css.ts`: build-time contract/theme construction compiled into data.

Tests exercise native StyleSheet and web object emission, public compiled transformer subprocesses, and project-relative filenames. The benchmark measures this small warm button graph; it does not simulate a full application or establish cold/Metro/native-device performance. These fixtures are excluded from the package tarball.
