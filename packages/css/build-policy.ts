// ADR D3/D6 / M1.3: tooling must not require upstream ESM from Node 22.0 CJS.
const sharedExternals = [
  /^node:/, /^@vanilla-extract\//, "css-to-react-native", "metro",
  "metro-transform-worker", "react", "react-native",
]
export const compilerDependencies = {
  // tsdown's CommonJS createRequire shim uses the unprefixed Node `url` builtin.
  neverBundle: [...sharedExternals, "url"],
  alwaysBundle: [/^effect(?:\/|$)/],
}
// Runtime denial tests remain authoritative: externalizing is not admission.
export const runtimeDependencies = {
  neverBundle: [...sharedExternals, /^effect(?:\/|$)/],
}
