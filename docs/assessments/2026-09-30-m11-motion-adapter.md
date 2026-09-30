# M11 Motion Adapter Dogfood Assessment

Date: 2026-09-30
Source revision: `b10c420`
Decision: **Park a Crumbs-owned motion adapter; retain direct native-animation integration.**
Confidence: Moderate for the internal reference app; broader adopter demand is unknown.

## Question

Does a concrete reference interaction need a Crumbs adapter between typed style/condition data and a native animation system, beyond what the app can express with the existing condition resolver and animation API?

## Evidence reviewed

- `apps/storybook/src/components/NativeAccessibilityContexts.tsx` is the only explicit animation use found in the reference app and CSS runtime sources. It maps the `motion` condition to `0` ms for reduced motion and `550` ms otherwise, owns a React Native `Animated.Value`, and interpolates that value into the marker's `translateX`. It calls `Animated.timing`; the native driver is enabled off web.
- The sample stops and jumps to the endpoint when the native preference changes to reduced motion. Re-running the sample stops the previous run before resetting it. `NativeAccessibilityConditionSource` begins in the reduced state until the asynchronous preference read resolves, avoiding an initial assumption that motion is allowed.
- Crumbs styles the static track and marker with `useThemedStyles`; the animated value is supplied directly to `Animated.View`. Crumbs does not resolve styles for each animation frame. `apps/storybook/package.json` also declares Reanimated, but this sample imports and uses React Native's core `Animated` API.
- The 2026-09-29 M10.3 iOS acceptance record reports that changing Reduce Motion changed the condition from `full` to `reduced` and the sample reached its endpoint in LTR and RTL launches. `apps/storybook/test/NativeAccessibility.test.ts` covers preference-source reads, subscriptions, updates, and cleanup; it does not exercise the component animation or its interruption path.

## Finding and limit

The user need is real: honor a system reduced-motion preference for a transition, including stopping an active run and completing immediately when reduced motion becomes active. The reference app already meets that need by resolving policy through Crumbs' finite condition API and delegating continuous updates to React Native `Animated`. This follows the intended architectural boundary: animation frames stay in the animation system rather than flowing through React theme resolution.

The reference contains only one simple animation and no repeated style-binding or cancellation code that a Crumbs adapter would remove. A new public adapter or animation dependency would therefore expand the API without a demonstrated capability gain. The current source has explicit cancellation on preference change and restart, but no focused component test for interruption/unmount behavior. Prior iOS acceptance covers the observed endpoint, not all interruption states or performance. Android and other-device behavior remain unqualified.

## Disposition

Keep the M11 motion-adapter item parked. Do not add an animation package to the Crumbs runtime or route animated values through theme resolution for this sample. Reopen when multiple reference/adopter components demonstrate repeated typed style-to-animation integration, or one concrete interaction cannot be represented cleanly with the existing condition and native animation APIs. A future design must select an optional supported animation boundary, test preference changes, restart/interruption and unmount cleanup, and measure update cost on named native targets.

## Next roadmap slice

Assess whether typed token-algebra operators solve a real maintenance or correctness problem in the reference theme's authored brand/mode accent and contrast layers. If the remaining optional extensions have no concrete use case, return to M10.5 final qualification; the Node v22.0.0 host-budget gate remains last and Android remains parked.
