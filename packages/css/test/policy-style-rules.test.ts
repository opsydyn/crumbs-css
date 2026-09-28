import { describe, expect, it } from "bun:test"
import { decodeStyleExplanationMetadata } from "../src/devtools/style-explanation-schema"
import type { StyleExplanationMetadata, StyleExplanationValue } from "../src/devtools/style-explanation-model"
import { decodeManifest } from "../src/tooling/manifest/schema"
import { tokenVariableName } from "../src/tokens/identity"
import { decodeDesignSystemPolicy } from "../src/tooling/policy/schema"
import { evaluateStylePolicyRules } from "../src/tooling/policy/style-rules"
import type { DesignSystemPolicy, PolicyPropertyScope, PolicyRuleCandidate } from "../src/tooling/policy/model"

const TOKEN_CONTRACT = { owner: "@acme/tokens", name: "palette", version: 1 } as const
const TOKEN_PATH = ["color", "primary"] as const
const TOKEN_ID = "@acme/tokens/palette@1#5:color/7:primary"
const TOKEN_VAR_NAME = tokenVariableName(TOKEN_CONTRACT, TOKEN_PATH)
const APP_MODULE_ID = "@acme/app#src/Card.css.ts"
const EXPORT_PATH = ["styles", "card"] as const

function policy(options: {
  readonly literalValueScopes?: ReadonlyArray<PolicyPropertyScope>
  readonly semanticTokenScopes?: ReadonlyArray<PolicyPropertyScope>
  readonly semanticTokenIds?: ReadonlyArray<string>
} = {}): DesignSystemPolicy {
  return decodeDesignSystemPolicy({
    format: "crumbs.css.design-system-policy",
    schemaVersion: 1,
    policyId: "acme.native-style",
    version: 1,
    preset: { name: "migration", version: 1 },
    severityOverrides: {},
    literalValueScopes: options.literalValueScopes ?? [],
    semanticTokenScopes: options.semanticTokenScopes ?? [],
    semanticTokenIds: options.semanticTokenIds ?? [],
    targetProfiles: [],
    outputBudgets: [],
    exceptions: [],
  })
}

function manifest(options: {
  readonly tokens?: ReadonlyArray<Record<string, unknown>>
  readonly visibility?: "public" | "private"
} = {}) {
  const tokens = options.tokens ?? [{
    id: TOKEN_ID,
    contract: TOKEN_CONTRACT,
    path: TOKEN_PATH,
    visibility: options.visibility ?? "public",
    domain: { kind: "color" },
    kind: "definition",
    origin: { path: "src/tokens.css.ts", exportPath: "tokens" },
  }]
  const contracts = new Map<string, { kind: "token-contract"; id: string }>()
  for (const token of tokens) {
    const contract = token.contract as { owner: string; name: string; version: number }
    const id = contract.owner + "#" + contract.name + "@" + contract.version
    contracts.set(id, { kind: "token-contract", id })
  }
  return decodeManifest({
    format: "crumbs.design-system-manifest",
    schemaVersion: 1,
    package: { name: "@acme/tokens", version: "1.0.0" },
    producer: {
      compiler: { name: "@opsydyn/crumbs-css", version: "0.1.1-alpha.1" },
      artifact: { name: "crumbs-native-style-artifact", version: 1 },
    },
    tokens,
    components: [],
    modules: [],
    dependencies: [],
    capabilities: [],
    coverage: { roots: [...contracts.values()], unresolved: [] },
  })
}

function declaration(
  id: string,
  property: string,
  value: StyleExplanationValue,
  primitiveDomain: ReadonlyArray<"view" | "text" | "image"> = ["view"],
) {
  return {
    id,
    sourceId: "src/Card.css.ts",
    packageOwner: "@acme/app",
    logicalPath: ["card"],
    authoredProperty: property,
    canonicalProperty: property,
    shorthandExpansionPath: [property],
    primitiveDomain,
    order: 0,
    value,
  }
}

function styleMetadata(
  declarations: ReadonlyArray<ReturnType<typeof declaration>>,
  options: {
    readonly coverage?: { readonly status: "complete" | "partial" | "unavailable"; readonly reasons: ReadonlyArray<string> }
    readonly tokenDependencies?: ReadonlyArray<string>
  } = {},
): StyleExplanationMetadata {
  return decodeStyleExplanationMetadata({
    $$type: "crumbs.css.style-explanation-metadata",
    version: 1,
    moduleId: APP_MODULE_ID,
    exports: [{
      path: EXPORT_PATH,
      candidates: declarations,
      branches: [],
      tokenDependencies: options.tokenDependencies ?? [],
      coverage: options.coverage ?? { status: "complete", reasons: [] },
    }],
  })
}

function themeTokenValue(options: {
  readonly varName?: string
  readonly contract?: { readonly owner: string; readonly name: string; readonly version: number }
} = {}): StyleExplanationValue {
  return {
    $$type: "crumbs.css.style-explanation-value",
    version: 1,
    kind: "theme-token",
    identity: {
      varName: options.varName ?? TOKEN_VAR_NAME,
      ...(options.contract === undefined ? {} : { contract: options.contract }),
    },
    resolvedValue: "#2673a8",
  }
}

function evaluate(input: {
  readonly policy: DesignSystemPolicy
  readonly current?: ReturnType<typeof manifest>
  readonly consumers?: ReadonlyArray<ReturnType<typeof decodeManifest>>
  readonly styleMetadata?: ReadonlyArray<StyleExplanationMetadata>
}) {
  return evaluateStylePolicyRules({
    policy: input.policy,
    current: input.current ?? manifest(),
    consumers: input.consumers ?? [],
    styleMetadata: input.styleMetadata ?? [],
  })
}

function findingsFor(result: ReturnType<typeof evaluate>, ruleId: string): ReadonlyArray<PolicyRuleCandidate> {
  return result.findings.filter(finding => finding.ruleId === ruleId)
}

describe("design-system style policy rules", () => {
  it("flags literals only in configured property and primitive scopes", () => {
    const metadata = styleMetadata([
      declaration("background.literal", "backgroundColor", "#fff", ["view"]),
      declaration("border.literal", "borderColor", "#ddd", ["view"]),
      declaration("text.literal", "backgroundColor", "#111", ["text"]),
    ])
    const result = evaluate({
      policy: policy({ literalValueScopes: [{ property: "backgroundColor", domain: ["view"] }] }),
      styleMetadata: [metadata],
    })

    expect(findingsFor(result, "style.literal-value").map(({ subjectId, fieldPath }) => ({ subjectId, fieldPath }))).toEqual([{
      subjectId: APP_MODULE_ID + "#" + JSON.stringify(EXPORT_PATH) + "#background.literal",
      fieldPath: "card.backgroundColor",
    }])
  })

  it("requires an explicitly classified semantic token in configured scopes", () => {
    const metadata = styleMetadata([
      declaration("token.value", "backgroundColor", themeTokenValue()),
      declaration("raw.value", "backgroundColor", "#fff"),
    ], { tokenDependencies: [TOKEN_VAR_NAME] })
    const result = evaluate({
      policy: policy({ semanticTokenScopes: [{ property: "backgroundColor", domain: ["view"] }] }),
      styleMetadata: [metadata],
    })

    expect(findingsFor(result, "style.semantic-token-required").map(finding => finding.subjectId)).toEqual([
      APP_MODULE_ID + "#" + JSON.stringify(EXPORT_PATH) + "#token.value",
      APP_MODULE_ID + "#" + JSON.stringify(EXPORT_PATH) + "#raw.value",
    ])
  })

  it("maps a token only when deterministic contract identity and variable name agree", () => {
    const metadata = styleMetadata([
      declaration("token.value", "backgroundColor", themeTokenValue({ contract: TOKEN_CONTRACT })),
    ], { tokenDependencies: [TOKEN_VAR_NAME] })
    const result = evaluate({
      policy: policy({
        semanticTokenScopes: [{ property: "backgroundColor", domain: ["view"] }],
        semanticTokenIds: [TOKEN_ID],
      }),
      styleMetadata: [metadata],
    })

    expect(findingsFor(result, "style.semantic-token-required")).toEqual([])
    expect(result.analysisLimits.filter(limit => limit.code === "token-identity-unknown")).toEqual([])
  })

  it("treats a variable name under a foreign contract as unknown instead of guessing", () => {
    const foreignContract = { owner: "@other/tokens", name: "palette", version: 1 } as const
    const foreignToken = {
      id: "@other/tokens/palette@1#5:color/6:accent",
      contract: foreignContract,
      path: ["color", "accent"],
      visibility: "public",
      domain: { kind: "color" },
      kind: "definition",
      origin: { path: "src/other.css.ts" },
    }
    const metadata = styleMetadata([
      declaration("foreign.value", "backgroundColor", themeTokenValue({
        varName: TOKEN_VAR_NAME,
        contract: foreignContract,
      })),
    ], { tokenDependencies: [TOKEN_VAR_NAME] })
    const result = evaluate({
      policy: policy({
        semanticTokenScopes: [{ property: "backgroundColor", domain: ["view"] }],
        semanticTokenIds: [TOKEN_ID],
      }),
      current: manifest({ tokens: [manifest().tokens[0]!, foreignToken] }),
      styleMetadata: [metadata],
    })

    expect(findingsFor(result, "style.semantic-token-required")).toEqual([])
    expect(result.analysisLimits).toContainEqual(expect.objectContaining({
      code: "token-identity-unknown",
      subjectId: APP_MODULE_ID + "#" + JSON.stringify(EXPORT_PATH) + "#foreign.value",
    }))
  })

  it("reports colliding manifest variable identities as incomplete coverage", () => {
    const firstToken = manifest().tokens[0]!
    const duplicatePathWithDifferentId = { ...firstToken, id: "@acme/tokens/forged-duplicate" }
    const metadata = styleMetadata([
      declaration("ambiguous.value", "backgroundColor", themeTokenValue()),
    ], { tokenDependencies: [TOKEN_VAR_NAME] })
    const result = evaluate({
      policy: policy({ semanticTokenScopes: [{ property: "backgroundColor", domain: ["view"] }] }),
      current: manifest({ tokens: [firstToken, duplicatePathWithDifferentId] }),
      styleMetadata: [metadata],
    })

    expect(findingsFor(result, "style.semantic-token-required")).toEqual([])
    expect(result.analysisLimits).toContainEqual(expect.objectContaining({
      code: "token-identity-unknown",
      subjectId: APP_MODULE_ID + "#" + JSON.stringify(EXPORT_PATH) + "#ambiguous.value",
    }))
  })

  it("reports opaque declarations and missing sidecars as coverage limits", () => {
    const opaque: StyleExplanationValue = {
      $$type: "crumbs.css.style-explanation-value",
      version: 1,
      kind: "opaque",
      reason: "function",
    }
    const scopedPolicy = policy({
      literalValueScopes: [{ property: "backgroundColor", domain: ["view"] }],
      semanticTokenScopes: [{ property: "backgroundColor", domain: ["view"] }],
    })
    const incomplete = evaluate({
      policy: scopedPolicy,
      styleMetadata: [styleMetadata([
        declaration("opaque.value", "backgroundColor", opaque),
      ])],
    })
    const missing = evaluate({ policy: scopedPolicy })

    expect(findingsFor(incomplete, "style.literal-value")).toEqual([])
    expect(findingsFor(incomplete, "style.semantic-token-required")).toEqual([])
    expect(incomplete.analysisLimits).toContainEqual(expect.objectContaining({ code: "style-metadata-incomplete" }))
    expect(missing.analysisLimits).toContainEqual(expect.objectContaining({ code: "style-metadata-missing" }))
  })

  it("reuses supplied consumer private-token evidence from M9.2", () => {
    const current = manifest({ visibility: "private" })
    const moduleId = "@acme/mobile#src/styles.css.ts"
    const consumer = decodeManifest({
      format: "crumbs.design-system-manifest",
      schemaVersion: 1,
      package: { name: "@acme/mobile", version: "2.0.0" },
      producer: {
        compiler: { name: "@opsydyn/crumbs-css", version: "0.1.1-alpha.1" },
        artifact: { name: "crumbs-native-style-artifact", version: 1 },
      },
      tokens: [],
      components: [],
      modules: [{ id: moduleId, origin: { path: "src/styles.css.ts" }, exports: ["Card"] }],
      dependencies: [{
        from: moduleId,
        to: TOKEN_ID,
        kind: "style-token",
        resolution: "external",
        origin: { moduleId, exportPath: "Card", property: "backgroundColor" },
      }],
      capabilities: [],
      coverage: { roots: [{ kind: "style-module", id: moduleId }], unresolved: [] },
    })
    const result = evaluate({ policy: policy(), current, consumers: [consumer] })

    const privateFindings = findingsFor(result, "consumer.private-token")
    expect(privateFindings).toHaveLength(1)
    expect(privateFindings[0]).toMatchObject({
      ruleId: "consumer.private-token",
      subjectId: TOKEN_ID,
      fieldPath: "visibility",
      evidence: expect.objectContaining({
        source: "crumbs.design-system-compatibility-report",
        code: "consumer.private-token-dependency",
        after: "private",
        affectedConsumers: [{
          package: { name: "@acme/mobile", version: "2.0.0" },
          dependency: {
            from: moduleId,
            to: TOKEN_ID,
            kind: "style-token",
            origin: { moduleId, exportPath: "Card", property: "backgroundColor" },
          },
        }],
      }),
    })
  })
})
