# M1.9e — released consumer skill dogfood

The four-file [ActionCard example](../../../.agents/skills/crumbs-css/references/design-system.md)
ran unchanged in an isolated Expo app using public `@opsydyn/crumbs-css@1.1.1`.
No skill or library correction was needed. This is a real consumer/native exercise;
it does not measure agent effectiveness or add a release requirement.

[Qualification](qualification.json) pins source `174340169a72ebaba132b7bfcb9fa3e66fa0ea97`,
the reference and example hashes, installed versions, registry tarball and results.
All [185 installed file hashes](installed-file-hashes.json) match the retained,
independently verified public registry tarball from M1.9d (SHA-256
`91ade0bb50cbd3da6bbc9c74e006b0a9f8765850f6a67488a68cf616dbf7546e`).
Crumbs is physically installed in the isolated consumer, with no workspace link.

## Observed behaviour

- Strict TypeScript 6.0.3 checking passes with `skipLibCheck: true`.
- [Expo production exports](exports.log) pass for iOS, Android and web. All three
  [source maps](runtime-maps.json) contain the installed Crumbs runtime and exclude
  compiler and Effect dependencies.
- On a dedicated iPhone 17 simulator running iOS 26.4, Expo Go renders both variants:
  the normal primary card and compact secondary card with a per-instance teal border.
- [Native accessibility hierarchies](before-hierarchy.json) expose both cards as
  enabled buttons. Delivered native taps on Continue and Preview advance the real
  callback counter from [0](before.png) to [1](after-1-hierarchy.json) to [2](after.png).
  [The observation](native-observations.json) retains actual button frames; both
  heights are at least 48 points.
- On the retained Android API 36 emulator, started read-only, both cards render as
  enabled `android.widget.Button` nodes. [ADB-delivered taps](android-observations.json)
  independently advance the counter from [0](android-before.png) to
  [1](android-after-1.xml) to [2](android-after.png).

The [counter harness](harness/index.js) mounts the unchanged example with its existing
`onActionPress` callback. The executed [idb probe](check-native.py) is an archived
study script with the original local paths and simulator UUID, not a portable runner.
The dedicated simulator was shut down and deleted after capture; the other booted
simulators were preserved. The test Metro processes were stopped. The owned
Android emulator was stopped and its temporary port reverse removed. The session
used `-read-only`; the existing AVD was retained and its data was not reset.

## Host issues and evidence boundaries

The environment reuses a retained owned npm SDK 56 install through an APFS clone:
Expo 56.0.4, React 19.2.3 and RN 0.85.3. Crumbs was freshly extracted from the retained
public 1.1.1 tarball. This is **not** a fresh dependency installation or a new SDK 57
native run. The app's package manifest records the reused installation; it does not
provide a new clean-install lockfile.

The first harness inherited `type: module` while copying CommonJS Expo config files;
removing that inherited field fixed Metro. Localhost initially bound only IPv6;
`NODE_OPTIONS=--dns-result-order=ipv4first`, scoped to the test process, allowed the
IPv4 Expo Go URL to connect. The idb CLI requires integer tap coordinates. These
were harness/host corrections; none changed the four skill files.

The [Maestro attempt](native.xml) failed before app interaction while its driver
setup coincided with observed disk exhaustion. Its raw failure is retained, not
reported as passing. After stopping it, the lighter retained idb tool independently
read the native hierarchy and delivered the successful taps above.

After asynchronous iOS simulator cleanup recovered space, the retained Android AVD
started successfully in read-only mode; [startup output](android-preflight.log) and
[the executed ADB probe](check-android.py) are retained. Both native platforms
therefore have actual interaction evidence in this exercise.

The minimal harness uses React Native's legacy SafeAreaView and emits a deprecation
warning. It is a callback test fixture, not an app shell; full safe-area/edge-to-edge
layout was not assessed. Keep the consuming app's own root layout around the example.
SDK 57 native interaction, spoken screen-reader output, physical acceptance,
live HMR and release performance were not exercised. Existing release qualification
and future performance gates remain unchanged; M11.6 stays parked.

## Reproduce the consumer exercise

Copy the four code blocks from the pinned reference into an Expo app, configure
`withNativeStyles` around its existing Metro config, and install `@opsydyn/crumbs-css@1.1.1`
with the app's supported Expo dependencies. The small harness here provides only a
callback counter. Run the app's typecheck and `expo export --platform all --source-maps`,
then launch on an explicitly chosen compatible native target. Assert Actions: 0,
tap Continue, assert Actions: 1, tap Preview, and assert Actions: 2. Record actual
versions, package identity and native contexts rather than inheriting this receipt.
