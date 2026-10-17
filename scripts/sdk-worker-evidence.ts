/** SDK 58 2g worker events: configuration flags are not execution evidence. */
export function summarizeRustWorkerEvents(
  records: readonly unknown[],
) {
  const rustFiles = new Set<string>();
  const fallbacks: Array<{ file: string; reason: string }> = [];
  for (const record of records) {
    if (record === null || typeof record !== "object" || Array.isArray(record))
      throw new Error("Invalid worker event");
    const event = record as Record<string, unknown>;
    if (
      event._e === "transform:noxcturnal:full" &&
      event.status === "complete" &&
      typeof event.file === "string"
    )
      rustFiles.add(event.file);
    if (
      event._e === "transform:noxcturnal:fallback" &&
      typeof event.file === "string" &&
      typeof event.reason === "string"
    )
      fallbacks.push({ file: event.file, reason: event.reason });
  }
  return { rustFiles: [...rustFiles], fallbacks };
}

export function assertRustWorkerEvidence(
  records: readonly unknown[],
  expected: { readonly app: string; readonly dependency: string },
) {
  const evidence = summarizeRustWorkerEvents(records);
  const matches = (file: string, wanted: string) =>
    file === wanted || file.endsWith("/" + wanted);
  for (const [kind, file] of Object.entries(expected)) {
    if (!evidence.rustFiles.some((actual) => matches(actual, file)))
      throw new Error(
        `Missing actual Rust completion for eligible ${kind}: ${file}`,
      );
  }
  return evidence;
}

/** An environment-only probe must preserve every source/configuration input. */
export function assertEnvironmentOnlyInputs(
  primed: Readonly<Record<string, string>>,
  current: Readonly<Record<string, string>>,
): void {
  for (const file of new Set([...Object.keys(primed), ...Object.keys(current)]))
    if (primed[file] !== current[file])
      throw new Error(`Environment-only cache probe changed input: ${file}`);
}

/** Pinned SDK58 app routes that require Expo's Babel transformations. */
export function assertAppWorkerFallbackEvidence(
  records: readonly unknown[],
  app: "playground" | "storybook",
): void {
  const expected = [
    ["node_modules/react-native/src/private/components/virtualview/VirtualViewNativeComponent.js", "full-metro:react-native-codegen"],
    ["node_modules/react-native/Libraries/Animated/createAnimatedComponent.js", "full-metro:worklets-candidate"],
    ...(app === "storybook" ? [
      ["node_modules/react-native-worklets/src/debug/bundleMode.native.ts", "full-metro:worklets"],
      ["node_modules/react-native-modal-datetime-picker/src/Modal.js", "full-metro:non-default-babel-config"],
    ] : []),
  ];
  const { fallbacks } = summarizeRustWorkerEvents(records);
  for (const [file, reason] of expected) {
    if (!fallbacks.some(actual =>
      (actual.file === file || actual.file.endsWith("/" + file)) && actual.reason === reason))
      throw new Error(`Missing expected fallback for ${file}: ${reason}`);
  }
}
