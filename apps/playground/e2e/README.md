# Native scroll acceptance

These local Maestro flows target Expo Go (`host.exp.Exponent`). Start the workspace consumer with the diagnostic probe:

```sh
EXPO_PUBLIC_CRUMBS_SCROLL_PROBE=true bun run playground
```

Install Maestro separately from app dependencies. The recorded run uses Maestro 2.10.0 and Java 17.0.20.1. Select an explicitly dedicated, booted iOS simulator with Expo Go installed:

```sh
maestro --device YOUR_CRUMBS_SIMULATOR_UDID test apps/playground/e2e/native-scroll.yaml \
  --format JUNIT --output /tmp/crumbs-scroll.xml \
  --test-output-dir /tmp/crumbs-scroll
```

Run the positive flow twice. Each run stops Expo Go and opens `exp://127.0.0.1:8091`, verifies a fresh list, performs a native swipe, checks offset and half-visible row advancement plus native drag delivery, changes the theme without changing position, then swipes back. Screenshots and `CRUMBS_NATIVE_SCROLL` measurements accompany the assertions. Missing or malformed probe text fails admission. Change the URL using `-e PLAYGROUND_URL=exp://YOUR_HOST:8091` when needed.

Run `native-scroll-negative.yaml` individually as a negative control. It deliberately omits the swipe and **must fail the final scrolling assertion**, after successfully reading the fresh-list measurements. A startup failure does not qualify as the negative control. Do not run the entire directory as a passing suite: it includes this intentionally failing flow and a startup helper.

On the recorded macOS host, Maestro's Android fallback scans a non-ADB IPv4 service on port 5563 and hangs even with an explicit iOS device. `JAVA_OPTS=-Djava.net.preferIPv6Addresses=true` scoped to Maestro avoids that collision through `localhost`'s IPv6 address. No service or system networking setting was changed. This workaround requires IPv6 localhost and is specific to this host; it is not an app prerequisite. Use `JAVA_HOME=/opt/homebrew/opt/openjdk@17` for the keg-only Homebrew Java installation.

The probe updates React state during scrolling. These flows qualify functional behavior in a development Expo Go consumer. Disable the probe for performance measurements; Android, release builds, physical devices and accessibility need separate acceptance.
