import { join } from "node:path"
import { captureRuntimeOutcome } from "./receipts"
import type { HostParityCase, HostParityRow } from "./runtime-parity"

const root = process.argv[2]!
const contracts = await import(join(root, "src/components/contracts.ts")) as typeof import("../../src/components/contracts")
const extensions = await import(join(root, "src/components/extension-contract.ts")) as typeof import("../../src/components/extension-contract")
const theme = await import(join(root, "src/theme-runtime.ts")) as typeof import("../../src/theme-runtime")
const expressions = await import(join(root, "src/expressions/index.ts")) as typeof import("../../src/expressions")
const cases = JSON.parse(await Bun.stdin.text()) as HostParityCase[]
const rows: HostParityRow[] = []
for (const input of cases) {
  const identity = { owner: "@fixture/host-remediation", name: `Component${input.id}`, version: 1 }
  function contract(trace: string[]) {
    let slots: unknown = ["root"]
    if (input.mode === "sparse") slots = new Array(1)
    if (input.mode === "symbol") Object.defineProperty(slots, Symbol("x"), { value: true })
    if (input.mode === "accessor") {
      slots = new Array(1)
      Object.defineProperty(slots, "0", { enumerable: true, get() { trace.push("getter"); return "root" } })
    }
    if (input.mode === "proxy") slots = new Proxy(["root"], {
      ownKeys(target) { trace.push("ownKeys"); return Reflect.ownKeys(target) },
      getOwnPropertyDescriptor(target, key) { trace.push("descriptor:" + String(key)); return Reflect.getOwnPropertyDescriptor(target, key) },
    })
    const result = { identity, public: { slots, variants: { tone: ["on", "off"], status: ["ready", "loading"] } },
      extensionPoints: { defaults: input.mode === "permission" ? ["private"] : ["tone"], variantValues: ["tone"], compoundVariants: true as const, slotStyles: ["root"] } }
    return input.mode === "null" ? Object.assign(Object.create(null), result) as typeof result : result
  }
  const surface = { slots: { root: "view", label: "text" }, variants: { tone: { on: true, off: true, private: true }, status: { ready: true, loading: true } } }
  const stateVariants = { status: { ready: { tone: input.mode === "state" ? ["private"] : ["on"] }, loading: { tone: ["off"] } } }
  const snapshot = { contract: {}, tokens: { "--crumbs-diff-padding": input.scalar }, values: {} }
  const token = theme.createThemeTokenReference("--crumbs-diff-padding")
  const base = { $$type: "crumbs.css.component-recipe", version: 3, slots: { root: "view", label: "text" },
    base: { root: { padding: token }, label: { opacity: 0.8 } },
    variants: { tone: { on: { root: { opacity: 1 } }, off: {} }, status: { ready: {}, loading: {} } },
    defaultVariants: { tone: "on", status: "ready" }, stateVariants, compoundVariants: [] }
  const extension = { $$type: "crumbs.css.component-recipe-extension", version: 1,
    identity: { owner: "@fixture/host-remediation", name: `Extension${input.id}`, version: 1 }, componentIdentity: identity,
    defaultVariants: {}, variants: { tone: { brand: { root: { padding: input.scalar } } } },
    compoundVariants: [] as unknown[], slotOverrides: { root: { opacity: 0.7 } } }
  if (input.mode === "cycle") { const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic; extension.slotOverrides.root = cyclic as typeof extension.slotOverrides.root }
  if (input.mode === "sparse") extension.compoundVariants = new Array(1)
  const add = (kind: string, run: (trace: string[]) => unknown) => rows.push({ label: `${input.id}:${kind}`, outcome: captureRuntimeOutcome(run) })
  add("contract", trace => contracts.validateNativeComponentContract(contract(trace), surface, stateVariants, { registerIdentity: false }))
  add("extension", () => extensions.validateNativeComponentRecipeExtensionDescriptor(extension))
  add("chain", trace => extensions.validateNativeComponentRecipeExtensionChain({ ...base, contract: contract(trace) }, [extension]))
  add("theme", trace => {
    const recipe = { ...base, contract: contract(trace) }
    const first = theme.resolveThemeTokens(recipe, snapshot)
    const repeated = theme.resolveThemeTokens(recipe, snapshot)
    const replacement = theme.resolveThemeTokens(recipe, { ...snapshot, tokens: { "--crumbs-diff-padding": input.scalar + 1 } })
    return [first, repeated, replacement]
  })
  const domain = expressions.createNativeExpressionDomain({ kind: "number", unit: "unitless" })
  const literal = expressions.createNativeExpressionLiteral(domain, input.scalar)
  const missing = expressions.createNativeExpressionTokenReference("missing", domain)
  const tree = expressions.createNativeExpressionAdd(literal, expressions.createNativeExpressionScale(literal, 2))
  add("expression", () => {
    const fallback = expressions.createNativeExpressionFallback(missing, tree)
    const match = expressions.createNativeExpressionMatch({ condition: "widthBucket", cases: [{ value: "compact", expression: fallback }], fallback: missing })
    const state = { tokens: {}, conditions: { ...theme.defaultNativeConditionSnapshot, widthBucket: "compact" as const } }
    const evaluated = expressions.evaluateNativeExpressionWithTrace(match, state)
    const folded = expressions.foldNativeExpression(tree)
    return [evaluated, folded, expressions.evaluateNativeExpression(folded)]
  })
  add("error", () => expressions.evaluateNativeExpression(missing))
  add("conditions", () => theme.normalizeNativeConditionInput({ ...theme.defaultNativeConditionSnapshot,
    ...(input.mode === "state" ? { platform: "unsupported" } : {}),
  } as never))
}
console.log(JSON.stringify(rows))
