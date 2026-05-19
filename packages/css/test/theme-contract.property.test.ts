import { describe, expect, it } from "bun:test"
import {
  createTheme,
  createThemeContract,
  getThemeTokenPath,
  getThemeVarName,
  isThemeVar,
  type NativeThemeValue,
  type ThemeContract,
  type ThemeContractInput,
} from "@opsydyn/crumbs-css/style"
import fc from "fast-check"

type ContractNode = {
  readonly children?: ReadonlyArray<ContractNode>
  readonly key: string
}
type ContractCase = {
  readonly leafPaths: ReadonlyArray<ReadonlyArray<string>>
  readonly shape: ThemeContractInput
  readonly values: Record<string, unknown>
}

const PROPERTY_RUNS = 100
const PROPERTY_SEED = 20260510

const keyArbitrary = fc.constantFrom(
  "accent",
  "canvas",
  "surface",
  "surfaceRaised",
  "text",
  "space",
  "md",
  "lg",
)

const nodeArbitrary: fc.Arbitrary<ContractNode> = fc.letrec<{
  readonly node: ContractNode
}>((tie) => ({
  node: fc.oneof(
    keyArbitrary.map((key) => ({ key })),
    fc.record({
      children: fc.array(tie("node"), { maxLength: 3, minLength: 1 }),
      key: keyArbitrary,
    }),
  ),
})).node

const contractCaseArbitrary = fc
  .array(nodeArbitrary, { maxLength: 4, minLength: 1 })
  .map(contractCaseFromNodes)
  .filter((contractCase) => contractCase.leafPaths.length > 0)

describe("native theme contract properties", () => {
  it("roundtrips every generated contract leaf through theme tokens", () => {
    fc.assert(
      fc.property(contractCaseArbitrary, ({ leafPaths, shape, values }) => {
        const contract = createThemeContract(shape)
        const theme = createTheme(contract, values as never)
        const tokenNames = new Set<string>()

        for (const [index, path] of leafPaths.entries()) {
          const themeVar = getPath(contract, path)
          const expectedValue = themeValueForIndex(index)

          expect(isThemeVar(themeVar)).toBe(true)
          expect(getThemeTokenPath(themeVar)).toEqual(path)
          expect(getValue(theme.values, path)).toBe(expectedValue)
          expect(theme.tokens[getThemeVarName(themeVar)]).toBe(expectedValue)
          tokenNames.add(getThemeVarName(themeVar))
        }

        expect(tokenNames.size).toBe(leafPaths.length)
      }),
      { numRuns: PROPERTY_RUNS, seed: PROPERTY_SEED },
    )
  })

  it("rejects contract token name collisions after native token sanitization", () => {
    fc.assert(
      fc.property(fc.constantFrom("surfaceRaised"), (collidingKey) => {
        expect(() =>
          createThemeContract({
            color: {
              [collidingKey]: null,
              "surface-raised": null,
            },
          }),
        ).toThrow("Duplicate native theme token")
      }),
      { numRuns: PROPERTY_RUNS, seed: PROPERTY_SEED },
    )
  })

  it("rejects generated missing, extra, and invalid theme values deterministically", () => {
    fc.assert(
      fc.property(contractCaseArbitrary, ({ leafPaths, shape, values }) => {
        const contract = createThemeContract(shape)
        const firstLeafPath = leafPaths[0]
        if (firstLeafPath === undefined) return

        expect(() => createTheme(contract, removePath(values, firstLeafPath) as never)).toThrow(
          "Missing theme value",
        )
        expect(() => createTheme(contract, { ...values, __extra__: "nope" } as never)).toThrow(
          'Unknown theme value "__extra__"',
        )
        expect(() =>
          createTheme(
            contract,
            setPathImmutable(values, firstLeafPath, { invalid: true }) as never,
          ),
        ).toThrow("must be a string or number")
      }),
      { numRuns: PROPERTY_RUNS, seed: PROPERTY_SEED },
    )
  })
})

function contractCaseFromNodes(nodes: ReadonlyArray<ContractNode>): ContractCase {
  const shape = nodesToShape(nodes)
  const leafPaths = collectLeafPaths(shape)
  return {
    leafPaths,
    shape,
    values: valuesFromLeafPaths(leafPaths),
  }
}

function nodesToShape(nodes: ReadonlyArray<ContractNode>): ThemeContractInput {
  const shape: Record<string, ThemeContractInput | null> = {}
  for (const node of nodes) {
    shape[node.key] = node.children === undefined ? null : nodesToShape(node.children)
  }
  return shape
}

function collectLeafPaths(
  shape: ThemeContractInput,
  path: ReadonlyArray<string> = [],
): ReadonlyArray<ReadonlyArray<string>> {
  return Object.entries(shape).flatMap(([key, value]) => {
    const nextPath = [...path, key]
    return value === null ? [nextPath] : collectLeafPaths(value, nextPath)
  })
}

function valuesFromLeafPaths(paths: ReadonlyArray<ReadonlyArray<string>>): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  for (const [index, path] of paths.entries()) {
    setPath(values, path, themeValueForIndex(index))
  }
  return values
}

function themeValueForIndex(index: number): NativeThemeValue {
  return index % 2 === 0 ? `#${String(index).padStart(6, "0")}` : index
}

function getPath<TShape extends ThemeContractInput>(
  contract: ThemeContract<TShape>,
  path: ReadonlyArray<string>,
): never {
  let value: unknown = contract
  for (const key of path) {
    value = (value as Record<string, unknown>)[key]
  }
  return value as never
}

function getValue(root: unknown, path: ReadonlyArray<string>): unknown {
  let value = root
  for (const key of path) {
    value = (value as Record<string, unknown>)[key]
  }
  return value
}

function setPath(
  root: Record<string, unknown>,
  path: ReadonlyArray<string>,
  value: NativeThemeValue,
): void {
  let cursor = root
  for (const [index, key] of path.entries()) {
    if (index === path.length - 1) {
      cursor[key] = value
    } else {
      const next = cursor[key]
      if (!isRecord(next)) {
        cursor[key] = {}
      }
      cursor = cursor[key] as Record<string, unknown>
    }
  }
}

function removePath(
  root: Record<string, unknown>,
  path: ReadonlyArray<string>,
): Record<string, unknown> {
  const clone = cloneRecord(root)
  const parent = getParentRecord(clone, path)
  const key = path[path.length - 1]
  if (key !== undefined) {
    delete parent[key]
  }
  return clone
}

function setPathImmutable(
  root: Record<string, unknown>,
  path: ReadonlyArray<string>,
  value: unknown,
): Record<string, unknown> {
  const clone = cloneRecord(root)
  const parent = getParentRecord(clone, path)
  const key = path[path.length - 1]
  if (key !== undefined) {
    parent[key] = value
  }
  return clone
}

function getParentRecord(
  root: Record<string, unknown>,
  path: ReadonlyArray<string>,
): Record<string, unknown> {
  let cursor = root
  for (const key of path.slice(0, -1)) {
    const next = cursor[key]
    if (!isRecord(next)) {
      throw new Error(`Expected generated theme path parent "${key}" to be a record`)
    }
    cursor = next
  }
  return cursor
}

function cloneRecord(root: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(root)) as Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
