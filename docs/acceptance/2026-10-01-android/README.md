# M0.9 Android native journey acceptance

Two fresh-state Maestro runs passed on the dedicated Android 16 / API 36 `medium_phone` emulator. Each run verified the initial list, a native forward drag, stable scroll position through a theme change, and reverse movement to row 1. The Android negative control completed setup and initial measurements, then failed only at its deliberately unsatisfied no-scroll assertion.

The workspace ran Expo Go 56.0.4 (SDK 56.0.0) against Expo 56.0.23, React Native 0.85.3, React 19.2.3, and `@expo/metro-runtime` 56.0.21. Maestro 2.11.0 ran on Java 17.0.20.1, Node 24.15.0, and Bun 1.4.2. The AVD is the Google Play arm64-v8a API 36 image at 1080×2400 / 420 dpi. Run measurements, the negative-control disposition, and a Metro bundle single-React-root digest are in [result.json](result.json).

The platform-specific Android launcher clears and starts Expo Go before opening `exp://10.0.2.2:8091`; the app ID remains `host.exp.exponent`. The workspace Metro resolver maps linked-worktree React paths to one physical package. The bundle guard is repeatable with `node apps/playground/e2e/check-react-singleton.mjs` while Metro is running.

The six screenshots retain each run's forward light, forward dark, and reverse dark state. This acceptance covers the Expo Go development consumer on an emulator. It does not cover release Hermes performance, M1.6 budgets, M10.5.3 Android Storybook visual/accessibility acceptance, a physical Android device, automated screenshot diffs, or screen-reader behavior.

The probe's `ends` counter remained zero in both positive runs even though touch starts/moves, native drag starts, scroll offsets, and visible rows advanced. This qualifies actual native scrolling and drag-start delivery; it does not qualify touch-end callback telemetry.

The host required `ADB_LOCAL_TRANSPORT_MAX_PORT=5555` when starting ADB because an unrelated IPv4 listener on port 5563 was misidentified as an offline emulator. This was scoped to the temporary ADB server; no other service or system networking setting was changed.
