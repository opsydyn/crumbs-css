import * as Schema from "effect/Schema"
import { makeDataCodec } from "../src/contracts/data-codec"

const Sha256 = Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/u))
const RelativePath = Schema.String.check(Schema.isPattern(/^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)[^\u0000]+$/u))
export const HostBudgetPolicyBindingSchema = Schema.Struct({
  policyId: Schema.NonEmptyString,
  policySha256: Sha256,
  registrySha256: Sha256,
})
const HostBudgetPolicySchema = Schema.Struct({
  formatVersion: Schema.Literal(1),
  policyId: Schema.NonEmptyString,
  registrySha256: Sha256,
  metrics: Schema.Array(Schema.Struct({ id: Schema.NonEmptyString, selector: Schema.NonEmptyString, enforcement: Schema.Literals(["blocking", "advisory"]) })),
  baselineFiles: Schema.Array(Schema.Struct({ path: RelativePath, sha256: Sha256 })),
})
export type HostBudgetPolicyBinding = typeof HostBudgetPolicyBindingSchema.Type
export type HostBudgetPolicy = typeof HostBudgetPolicySchema.Type
export type HostBudgetRoleSummary = Readonly<{ passIds: readonly string[]; failIds: readonly string[]; incompleteIds: readonly string[] }>
export type ReleaseHostBudgetEvaluation = Readonly<{ releasePolicyQualified: boolean; blockers: readonly string[]; blocking: HostBudgetRoleSummary; advisory: HostBudgetRoleSummary }>
export const releaseHostBudgetPolicyCodec = makeDataCodec("release-host-budget-policy", HostBudgetPolicySchema)
export const hostBudgetPolicyBindingCodec = makeDataCodec("host-budget-policy-binding", HostBudgetPolicyBindingSchema)
