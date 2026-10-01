import { createHash } from "node:crypto"

const bundleUrl = new URL(
  "/.expo/.virtual-metro-entry.bundle?platform=android&dev=true&minify=false",
  process.argv[2] ?? "http://127.0.0.1:8091",
)
const response = await fetch(bundleUrl)

if (!response.ok) {
  throw new Error(`Metro returned ${response.status} for ${bundleUrl}`)
}

const bundle = await response.text()
const bundleSha256 = createHash("sha256").update(bundle).digest("hex")
const reactModules = [...bundle.matchAll(/"([^"\\]*\/node_modules\/react\/[^"\\]+\.js)"/g)]
const packageRoots = new Set(
  reactModules.map(([_, modulePath]) => {
    const packagePathEnd = modulePath.lastIndexOf("/node_modules/react/")
    return modulePath.slice(0, packagePathEnd + "/node_modules/react".length)
  }),
)

if (packageRoots.size !== 1) {
  throw new Error(`Expected one React package root, found ${packageRoots.size}: ${[...packageRoots].join(", ")}`)
}

console.log(JSON.stringify({
  bundleBytes: Buffer.byteLength(bundle),
  bundleSha256,
  reactModuleFiles: reactModules.length,
  reactPackageRoots: [...packageRoots],
  result: "passed",
}, null, 2))
