import type { ReactElement } from "react"
import { vars } from "@acme/design-tokens"
import { useTokenTheme } from "@opsydyn/crumbs-css/theme"

type ThemeTokenProbeProps = {
  readonly secondaryContract: typeof vars
}

/** Reads two identified themes through the UI package's Crumbs runtime copy. */
export default function ThemeTokenProbe({secondaryContract}: ThemeTokenProbeProps): ReactElement {
  const foundation = useTokenTheme(vars)
  const secondary = useTokenTheme(secondaryContract)

  return (
    <>
      <span data-probe="foundation">{foundation.values.color.accent}</span>
      <span data-probe="secondary">{secondary.values.color.accent}</span>
    </>
  )
}
