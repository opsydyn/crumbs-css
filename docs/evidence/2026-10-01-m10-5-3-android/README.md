# M10.5.3 Android Storybook acceptance

The interactive Storybook reference rendered on an Android 16 / API 36 emulator. The final Maestro flow passed in 20.215 seconds; the selector-adjusted flow also passed once before a redundant startup tap was removed. Both successful runs changed light/dark theme and exercised the primary action.

The run used Storybook's `Design System/Reference Patterns / Interactive` story from app source revision `7d71ff3235a8c26c3e16999bfb2f4a97bab5f959`, Expo Go 56.0.4 (SDK 56), Expo 56.0.23, React Native 0.85.3, and React 19.2.3. The emulator reported model `sdk_gphone64_arm64`, display 1080 × 2400 at 420 dpi. Maestro was 2.11.0 on JDK 17.0.20.1.

The flow resolved the visible **Storybook theme**, **Light**, **Dark**, and **Save changes** text controls, then observed **Primary action selected.** after each action. These are text-discovery and interaction observations from Maestro's Android UI hierarchy queries, not a TalkBack audit. The optional `uiautomator dump` process exited 137, so no standalone hierarchy snapshot was retained. The Expo Go developer launcher bubble remains visible over the right portion of the **Light** control in the screenshots; Maestro taps its unobstructed left edge.

The four 1080 × 2400 captures show the initial dark state, the light state, the light action feedback, and the dark action feedback. `maestro-junit.xml`, `maestro-commands.json`, and `maestro-run.log` retain the successful run result and command trace. SHA-256 digests are in `acceptance.json`.

This evidence does not establish TalkBack/VoiceOver behavior, role or announcement semantics, automated screenshot-diff acceptance, physical-device rendering, WCAG conformance, or release-device performance. The exact Node v22.0.0 M10.5 host-budget gate remains last; M1.6 release-device budgets remain separate.

- [Initial dark state](android-storybook-dark.png)
- [Light state](android-storybook-light.png)
- [Light action feedback](android-storybook-light-action.png)
- [Dark action feedback](android-storybook-dark-action.png)
