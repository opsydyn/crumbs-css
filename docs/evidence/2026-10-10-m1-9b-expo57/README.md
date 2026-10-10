# M1.9b — Expo 57 compatibility

The approved slice adds SDK 57 / RN 0.86 and retains SDK 56 / RN 0.85. Agent-skill authoring is deferred until this compatibility release is available. Physical-device and performance acceptance remain separate.

The retained working-tree receipts are diagnostic, with explicit dirty-source identity. Clean CI and the generic exact-release-tarball workflow establish separate qualification/publication identities. No v1 performance exception is inherited.

- [SDK 56 packed diagnostic](sdk56-diagnostic.json): Crumbs1.1.0, Expo56.0.23, React19.2.3, RN0.85.3; all185 installed files match the exact tarball, consumer types and iOS/Android/web exports pass. [Raw log](sdk56-packed.log).
- [SDK 57 packed diagnostic](sdk57-diagnostic.json) and [raw command logs](sdk-57-logs/): all185 installed files match; strict resolution, consumer types, motion contracts and iOS/Android/web exports pass on genuine Node24.15.0 and Bun1.4.3. SDK 57 pins Expo57.0.27, React/DOM/renderer19.2.8, RN0.86.3 and TS6.0.3. The current CLI/router optional peer graph requires the compatible React patch above the blank template's19.2.3; strict npm peers install without overrides.
- Consumer typechecking uses `strict:true` with the official Expo base (`skipLibCheck:true`); it checks user code and motion type fixtures against the installed declarations, not every third-party declaration. Library typechecking and declaration emission are separate checks.
- Motion renderer probes use real React with a controlled public Animated peer; separate Node ESM/CommonJS probes verify the pure entry without React/RN/Effect installed. Metro exports and source-map inspection cover the ordinary runtime and every platform, not device rendering.

Published1.0.1 initially rejects RN0.86.3 in a real strict npm control, confirming the existing peer block. Behavioral regression tests cover preserved app runtime imports, stable SDK pins, peer expectation agreement, argument validation, installed byte/inventory tampering, compatible React patches, isolated pure motion probes and the real SDK Node floor.

Release status: [1.1.0](../../releases/1.1.0.md).

Local checks: 1,848 package tests / 33 Storybook tests, library and Storybook typechecks, frozen install and 33-page docs build. The package suite retains one existing skip. Clean CI will record its own final-source check results.
