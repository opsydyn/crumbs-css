# Native scroll acceptance

These local Maestro flows target Expo Go. The iOS bundle ID is `host.exp.Exponent`; the Android package ID is `host.exp.exponent`. Start the workspace consumer with the diagnostic probe:

```sh
EXPO_PUBLIC_CRUMBS_SCROLL_PROBE=true bun run playground
```

Install Maestro separately from app dependencies. The recorded iOS and Android runs use Maestro 2.11.0 and Java 17.0.20.1. Select an explicitly dedicated, booted device with Expo Go installed.

For an iOS simulator, use its simulator UDID and loopback URL:

```sh
maestro --device YOUR_CRUMBS_SIMULATOR_UDID test apps/playground/e2e/native-scroll.yaml \
  -e APP_ID=host.exp.Exponent \
  -e PLAYGROUND_URL=exp://127.0.0.1:8091 \
  --format JUNIT --output /tmp/crumbs-scroll.xml \
  --test-output-dir /tmp/crumbs-scroll
```

For an Android emulator, use its ADB serial and the host alias `10.0.2.2`:

```sh
maestro --device emulator-5554 test apps/playground/e2e/native-scroll.yaml \
  -e APP_ID=host.exp.exponent \
  -e PLAYGROUND_URL=exp://10.0.2.2:8091 \
  --format JUNIT --output /tmp/crumbs-android-scroll.xml \
  --test-output-dir /tmp/crumbs-android-scroll
```

Run the positive flow twice. Each Android run clears and launches Expo Go before opening the supplied URL; each iOS run stops Expo Go before opening it. Both verify a fresh list, perform a native swipe, check offset and half-visible row advancement plus native drag delivery, change the theme without changing position, then swipe back. Screenshots and `CRUMBS_NATIVE_SCROLL` measurements accompany the assertions. Missing or malformed probe text fails admission. Keep `APP_ID` aligned with the target (`host.exp.Exponent` on iOS; `host.exp.exponent` on Android); the shared journey selects a platform-specific launcher because Android link opening needs Expo Go's concrete package ID.

Run `native-scroll-negative.yaml` individually as a negative control. It deliberately omits the swipe and **must fail the final scrolling assertion**, after successfully reading the fresh-list measurements. A startup failure does not qualify as the negative control. Do not run the entire directory as a passing suite: it includes this intentionally failing flow and a startup helper.

After changing workspace Metro resolution, run `node apps/playground/e2e/check-react-singleton.mjs` while the playground Metro server is running. It requests the Android development bundle and fails if it contains zero or multiple React package roots.

On the recorded macOS host, Maestro's Android fallback scans a non-ADB IPv4 service on port 5563 and hangs even with an explicit iOS device. `JAVA_OPTS=-Djava.net.preferIPv6Addresses=true` scoped to Maestro avoids that collision through `localhost`'s IPv6 address. No service or system networking setting was changed. This workaround requires IPv6 localhost and is specific to this host; it is not an app prerequisite. Use `JAVA_HOME=/opt/homebrew/opt/openjdk@17` for the keg-only Homebrew Java installation.

The recorded Android session also needed `ADB_LOCAL_TRANSPORT_MAX_PORT=5555` scoped to the temporary ADB server because the same unrelated port 5563 listener was otherwise detected as an offline emulator. This is a host-specific ADB startup workaround; do not persist it as an app or project setting.

The probe updates React state during scrolling. These flows qualify functional behavior in a development Expo Go consumer. Disable the probe for performance measurements; Android, release builds, physical devices and accessibility need separate acceptance.

## M9.3a native inspector

Start the development playground server, then use an explicitly owned device:

```sh
maestro --device YOUR_DEVICE test apps/playground/e2e/native-devtools.yaml \
  -e APP_ID=YOUR_INSTALLED_APP_ID -e APP_URL=YOUR_EXPO_URL \
  --format JUNIT --output /tmp/crumbs-playground-devtools.xml
```

Expo Go SDK58 uses `host.exp.Exponent` on iOS and `host.exp.exponent` on Android.
Use loopback for iOS and `10.0.2.2` for Android. Existing custom clients must
include Expo Clipboard. The flow does not clear unrelated application data.
These are replay recipes; consult the [evidence](../../../docs/evidence/2026-10-18-m9-3a-native-devtools/README.md)
for which checks actually ran. A syntax check is not a live pass.

Run the companion `native-devtools-causes.yaml` with the same parameters to
assert scoped token and deterministic variant values. It leaves the override
capture open for the controlled edit/restore check below. Storybook permits
120 seconds for Expo Go startup; this is a harness download allowance, not a
widget performance threshold.

Also check each app's theme toggle, native back and
web Escape/focus. While a capture is open, change the fixture opacity from 0.8
to 0.7: Fast Refresh must mark it stale and disable Preview; Refresh must show
0.7. Restore the file and verify the same sequence back to 0.8.
The debug clipboard readback compares length plus FNV-1a checksum; it is a
functional probe, not a cryptographic integrity mechanism. Unit tests separately
assert exact equality of prepared text and the clipboard adapter argument.
Physical devices, spoken screen readers and independent user testing are separate.
