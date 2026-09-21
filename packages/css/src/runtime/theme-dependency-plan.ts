export const ThemeDependencyPlanType = "crumbs.css.theme-dependency-plan" as const
export const ThemeDependencyPlanVersion = 1 as const

export type ThemeDependencyPathSegment = string | number

export type ThemeDependencyPlanEntry = {
  readonly path: ReadonlyArray<ThemeDependencyPathSegment>
  readonly tokens: ReadonlyArray<string>
}

export type ThemeDependencyPlan = {
  readonly $$type: typeof ThemeDependencyPlanType
  readonly version: typeof ThemeDependencyPlanVersion
  readonly entries: ReadonlyArray<ThemeDependencyPlanEntry>
}

/**
 * Canonicalises compiler-emitted dependency entries into immutable data. A
 * path may be discovered more than once while traversing composed exports; its
 * token set is merged before sorting so equivalent modules emit equivalent
 * plans.
 */
export function createThemeDependencyPlan(
  entries: ReadonlyArray<ThemeDependencyPlanEntry>,
): ThemeDependencyPlan {
  const byPath = new Map<string, {path: ReadonlyArray<ThemeDependencyPathSegment>; tokens: Set<string>}>()
  for (const entry of entries) {
    const path = validatePath(entry.path)
    const tokens = validateTokens(entry.tokens)
    const key = themeDependencyPathKey(path)
    const existing = byPath.get(key)
    if (existing === undefined) byPath.set(key, {path, tokens: new Set(tokens)})
    else for (const token of tokens) existing.tokens.add(token)
  }

  const canonicalEntries = [...byPath.values()]
    .sort((left, right) => themeDependencyPathKey(left.path).localeCompare(themeDependencyPathKey(right.path)))
    .map(({path, tokens}) => Object.freeze({
      path: Object.freeze([...path]),
      tokens: Object.freeze([...tokens].sort((left, right) => left.localeCompare(right))),
    }))

  return Object.freeze({
    $$type: ThemeDependencyPlanType,
    version: ThemeDependencyPlanVersion,
    entries: Object.freeze(canonicalEntries),
  })
}

export function themeDependencyPathKey(path: ReadonlyArray<ThemeDependencyPathSegment>): string {
  return path.map(segment => typeof segment === "number"
    ? `n:${segment}`
    : `s:${segment.length}:${segment}`).join("/")
}

function validatePath(path: ReadonlyArray<ThemeDependencyPathSegment>): ReadonlyArray<ThemeDependencyPathSegment> {
  if (!Array.isArray(path)) throw new TypeError("Theme dependency plan paths must be arrays")
  for (const segment of path) {
    if (typeof segment === "string") {
      if (segment.length === 0) throw new TypeError("Theme dependency plan path segments must be non-empty")
      continue
    }
    if (!Number.isSafeInteger(segment) || segment < 0) {
      throw new TypeError("Theme dependency plan array path segments must be non-negative safe integers")
    }
  }
  return [...path]
}

function validateTokens(tokens: ReadonlyArray<string>): ReadonlyArray<string> {
  if (!Array.isArray(tokens)) throw new TypeError("Theme dependency plan tokens must be arrays")
  for (const token of tokens) {
    if (typeof token !== "string" || token.length === 0) {
      throw new TypeError("Theme dependency plan token names must be non-empty strings")
    }
  }
  return [...new Set(tokens)]
}
