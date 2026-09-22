import { describe, expect, it } from "bun:test"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { basename, extname, join, relative, resolve } from "node:path"

const REPO_ROOT = resolve(import.meta.dir, "../../..")
const SOURCES = [
  resolve(REPO_ROOT, "apps/playground/src"),
  resolve(REPO_ROOT, "apps/storybook/src"),
  resolve(REPO_ROOT, "docs/src/content"),
  resolve(REPO_ROOT, "packages/css/README.md"),
  resolve(REPO_ROOT, "packages/css/COMPATIBILITY.md"),
] as const
const SOURCE_EXTENSIONS = new Set([".md", ".mdx", ".ts", ".tsx"])

const CORE_API_NAMES = new Set([
  "NATIVE_CONDITION_BREAKPOINTS",
  "NATIVE_RESPONSIVE_CONDITION_MATCHERS",
  "NATIVE_RESPONSIVE_CONDITION_NAMES",
  "NativeConditionBranch",
  "NativeConditionInput",
  "NativeConditionMatcher",
  "NativeConditionNameList",
  "NativeConditionSnapshot",
  "NativeConditionSource",
  "NativeConditionStore",
  "NativeConditionStoreOptions",
  "NativeConditionStoreStats",
  "NativeConditionValueMapper",
  "NativeContrastPreference",
  "NativeConditionalRecord",
  "NativeConditionalTuple",
  "NativeConditionalValue",
  "NativeDirection",
  "NativeFontScaleBucket",
  "NativeHeightBucket",
  "NativeMotionPreference",
  "NativeOrientation",
  "NativePlatform",
  "NativeMapValueFn",
  "NativeNormalizedConditionalValue",
  "NativeNormalizeValueFn",
  "NativeThemeTokenReference",
  "NativeThemeTokenReferenceType",
  "NativeWidthBucket",
  "ResolvedThemeStyles",
  "ThemeProvider",
  "createNativeConditionResolver",
  "createNativeConditionStore",
  "createNativeMapValueFn",
  "createNativeNormalizeValueFn",
  "createThemeTokenReference",
  "defaultNativeConditionSnapshot",
  "isThemeTokenReference",
  "mapNativeConditionValueToBranches",
  "nativeConditionSnapshotKey",
  "normalizeNativeConditionInput",
  "resolveThemeStyles",
  "resolveThemeTokens",
  "useNativeConditionSnapshot",
  "useTheme",
  "useThemeSelector",
  "useThemedStyle",
  "useThemedStyles",
])

const ADVANCED_API_NAMES = new Set([
  "TokenThemeProvider",
  "TokenThemeScopeProvider",
  "createRecipeResolver",
  "createSprinklesResolver",
  "createThemeDependencyPlan",
  "createThemeDependencyResolver",
  "isTokenThemeCompatible",
  "resolveRecipeStyle",
  "useTokenTheme",
])

type ImportUse = {
  readonly file: string
  readonly names: ReadonlyArray<string>
  readonly subpath: "theme" | "theme/core"
}

function sourceFiles(root: string): ReadonlyArray<string> {
  if (statSync(root).isFile()) return [root]
  const files: string[] = []
  for (const entry of readdirSync(root)) {
    const path = join(root, entry)
    if (statSync(path).isDirectory()) files.push(...sourceFiles(path))
    else if (SOURCE_EXTENSIONS.has(extname(path))) files.push(path)
  }
  return files
}

function importNames(specifier: string): ReadonlyArray<string> {
  return specifier
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .split(",")
    .map((part) => part.replace(/\/\/.*$/u, "").trim())
    .map((part) => part.replace(/^type\s+/u, "").split(/\s+as\s+/u)[0]?.trim() ?? "")
    .filter((name) => name.length > 0)
}

function themeImports(sourcePath: string): ReadonlyArray<ImportUse> {
  const source = readFileSync(sourcePath, "utf8")
  const imports: ImportUse[] = []
  for (const subpath of ["theme", "theme/core"] as const) {
    const pattern = new RegExp(
      `import\\s+(?:type\\s+)?\\{([^{}]*)\\}\\s+from\\s+["']@opsydyn/crumbs-css/${subpath.replace("/", "\\/")}["']`,
      "gu",
    )
    for (const match of source.matchAll(pattern)) {
      imports.push({
        file: relative(REPO_ROOT, sourcePath),
        names: importNames(match[1] ?? ""),
        subpath,
      })
    }
  }
  return imports
}

function allThemeImports(): ReadonlyArray<ImportUse> {
  return SOURCES.flatMap((source) => sourceFiles(source).flatMap(themeImports))
}

describe("theme entrypoint adoption policy", () => {
  it("keeps common runtime APIs on the lean theme/core entrypoint", () => {
    const violations = allThemeImports()
      .filter(({ subpath, names }) =>
        subpath === "theme" && names.some((name) => CORE_API_NAMES.has(name)),
      )
      .map(({ file, names }) => `${file}: ${names.join(", ")}`)

    expect(violations).toEqual([])
  })

  it("keeps advanced APIs out of the lean theme/core entrypoint", () => {
    const violations = allThemeImports()
      .filter(({ subpath, names }) =>
        subpath === "theme/core" && names.some((name) => !CORE_API_NAMES.has(name)),
      )
      .map(({ file, names }) => `${file}: ${names.join(", ")}`)

    expect(violations).toEqual([])
  })

  it("requires every compatibility import to name an explicit advanced API", () => {
    const violations = allThemeImports()
      .filter(({ subpath, names }) =>
        subpath === "theme" && names.some((name) => !ADVANCED_API_NAMES.has(name)),
      )
      .map(({ file, names }) => `${file}: ${names.join(", ")}`)

    expect(violations).toEqual([])
  })

  it("scans the intended app and documentation sources", () => {
    const files = allThemeImports().map(({ file }) => basename(file))
    expect(files.length).toBeGreaterThan(0)
  })
})
