import { createRequire } from "node:module"
import type { MetroConfig } from "metro"

const requireFromHere = createRequire(import.meta.url)

export function withNativeStyles(config: MetroConfig): MetroConfig {
  // Metro must require() the compiled CJS transformer.
  // The build step emits dist/transformer.cjs before expo start is run.
  const transformerPath: string = resolveTransformerPath()
  return { ...config, transformerPath }
}

function resolveTransformerPath(): string {
  try {
    return requireFromHere.resolve("./transformer.cjs")
  } catch {
    return requireFromHere.resolve("./transformer")
  }
}
