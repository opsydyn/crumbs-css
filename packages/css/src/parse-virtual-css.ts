/**
 * Parses a flat vanilla-extract virtual CSS file into a map of
 * className → CSS declaration pairs.
 *
 * At-rules (@media, @keyframes, @supports, etc.) are stripped — they have no
 * equivalent on React Native. Pseudo-class and pseudo-element selectors are
 * also excluded for the same reason. Only plain `.className { ... }` rules
 * survive.
 */
export function parseCssClassRules(
  css: string,
): Map<string, ReadonlyArray<readonly [string, string]>> {
  const stripped = stripComments(css)
  const flat = removeAtRuleBlocks(stripped)

  // Matches .className followed immediately by optional whitespace then {
  // Excludes .className:pseudo, .className.another, .className > child, etc.
  // because none of those have \s*{ directly after the class identifier.
  const classRuleRe = /\.([\w-]+)\s*\{([^}]*)\}/g
  const result = new Map<string, Array<[string, string]>>()

  let match: RegExpExecArray | null
  while ((match = classRuleRe.exec(flat)) !== null) {
    const className = match[1]!
    const declarationsStr = match[2]!
    const declarations = parseDeclarations(declarationsStr)
    if (declarations.length === 0) continue
    const existing = result.get(className) ?? []
    result.set(className, [...existing, ...declarations])
  }

  return result
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "")
}

function removeAtRuleBlocks(css: string): string {
  let result = ""
  let depth = 0
  let inAtRule = false
  let i = 0

  while (i < css.length) {
    const ch = css[i]!

    if (ch === "@" && depth === 0) {
      // Look ahead: does this at-rule use braces or end with a semicolon?
      const semiIdx = css.indexOf(";", i)
      const braceIdx = css.indexOf("{", i)

      if (semiIdx !== -1 && (braceIdx === -1 || semiIdx < braceIdx)) {
        // @charset, @import — no block, just skip to semicolon
        i = semiIdx + 1
        continue
      }
      // @media, @keyframes, @supports, etc. — has a block
      inAtRule = true
      i++
      continue
    }

    if (ch === "{") {
      depth++
      if (inAtRule) {
        i++
        continue
      }
    } else if (ch === "}") {
      if (inAtRule) {
        depth--
        if (depth === 0) inAtRule = false
        i++
        continue
      }
      depth--
    }

    if (!inAtRule) result += ch
    i++
  }

  return result
}

function parseDeclarations(declarationsStr: string): Array<[string, string]> {
  return declarationsStr
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean)
    .flatMap((decl): Array<[string, string]> => {
      const colonIdx = decl.indexOf(":")
      if (colonIdx === -1) return []
      const prop = decl.slice(0, colonIdx).trim()
      const value = decl.slice(colonIdx + 1).trim()
      if (!prop || !value) return []
      return [[prop, value]]
    })
}
