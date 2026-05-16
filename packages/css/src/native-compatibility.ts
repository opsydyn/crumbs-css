import { formatNativeStylesDiagnostic, NativeStylesDiagnosticCode } from "./diagnostics"

const AT_RULE_RE = /@([\w-]+)\b/

export class NativeStylesCompatibilityError extends Error {
  override readonly name = "NativeStylesCompatibilityError"

  constructor(
    readonly code: NativeStylesDiagnosticCode,
    message: string,
  ) {
    super(formatNativeStylesDiagnostic(code, message))
  }
}

export function assertNativeCssCompatibility(css: string): void {
  const stripped = stripComments(css)
  const atRule = AT_RULE_RE.exec(stripped)
  if (atRule?.[1] === "media") {
    throw new NativeStylesCompatibilityError(
      NativeStylesDiagnosticCode.UnsupportedMedia,
      "@crumbs/css does not support @media rules in React Native styles. " +
        "Move responsive branching into component code and choose explicit native style exports.",
    )
  }
  if (atRule !== null) {
    throw new NativeStylesCompatibilityError(
      NativeStylesDiagnosticCode.UnsupportedAtRule,
      `@crumbs/css does not support @${atRule[1]} rules in React Native styles. ` +
        "Use React Native runtime APIs or explicit component state instead.",
    )
  }

  const unsupportedSelector = findUnsupportedSelector(stripped)
  if (unsupportedSelector !== null) {
    throw new NativeStylesCompatibilityError(
      NativeStylesDiagnosticCode.UnsupportedSelector,
      "@crumbs/css does not support selectors, global styles, or pseudo classes in React Native styles. " +
        `Unsupported selector: "${unsupportedSelector}". ` +
        "Split stateful or nested styles into explicit style exports and select them from component props.",
    )
  }
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "")
}

function findUnsupportedSelector(css: string): string | null {
  let depth = 0
  let selectorStart = 0

  for (let i = 0; i < css.length; i++) {
    const ch = css[i]
    if (ch === "{" && depth === 0) {
      const selector = css.slice(selectorStart, i).trim()
      if (selector !== "" && !isPlainClassSelectorList(selector)) {
        return selector
      }
      depth++
    } else if (ch === "{") {
      depth++
    } else if (ch === "}") {
      depth--
      if (depth === 0) selectorStart = i + 1
    }
  }

  return null
}

function isPlainClassSelectorList(selector: string): boolean {
  return /^\.[\w-]+$/.test(selector.trim())
}
