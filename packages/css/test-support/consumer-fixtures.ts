import { statSync } from "node:fs"
import { resolve } from "node:path"

// Required compiler coverage belongs to the package, never an optional app tree.
export function consumerFixtures(root = resolve(import.meta.dir, "../fixtures/consumer")) {
  function required(name: string): string {
    const file = resolve(root, "styles", name)
    try {
      if (!statSync(file).isFile()) throw new Error("Expected a regular file")
    } catch (cause) {
      throw new Error(`Required Crumbs consumer fixture missing or invalid: ${file}`, { cause })
    }
    return file
  }
  return {
    root,
    shared: required("shared.css.ts"),
    button: required("button.css.ts"),
    reference: required("reference.css.ts"),
    theme: required("theme.css.ts"),
  }
}
