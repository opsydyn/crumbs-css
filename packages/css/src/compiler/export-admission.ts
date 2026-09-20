import * as vm from "node:vm"
import { NativeStylesDiagnosticCode } from "../diagnostics"
import { NativeStylesCompatibilityError } from "../native-compatibility"

/**
 * Reconstructs the named values emitted by vanilla-extract's compiled module.
 * The source is executed only as a data reconstruction step; partial regex
 * recovery would make an invalid module appear valid and is therefore
 * deliberately disabled.
 */
export function collectStyleExports(
  source: string,
  exportMap: Map<string, unknown>,
  filePath = "<compiled module>",
): void {
  const exports: Record<string, unknown> = Object.create(null)
  const cjsSource = source.replace(
    /export\s+(?:var|const|let)\s+(\w+)\s*=/g,
    (_, name: string) => `exports.${name} =`,
  )

  try {
    new vm.Script(cjsSource).runInNewContext({ exports })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new NativeStylesCompatibilityError(
      NativeStylesDiagnosticCode.UnsupportedExport,
      `Unable to reconstruct compiled vanilla-extract exports in ${filePath}: ${detail}. ` +
        "Export only supported named data/style values; regex recovery is disabled.",
    )
  }

  for (const [name, value] of Object.entries(exports)) {
    exportMap.set(name, value)
  }
}
