import {
  DESIGN_SYSTEM_POLICY_PRESET_VERSION,
  POLICY_RULE_IDS,
  type BuiltInPolicyPreset,
  type PolicyPresetName,
} from "./model"

function makePreset(name: PolicyPresetName, level: "warning" | "error"): BuiltInPolicyPreset {
  const severityByRule = Object.freeze(Object.fromEntries(
    POLICY_RULE_IDS.map(ruleId => [ruleId, level]),
  )) as Readonly<Record<(typeof POLICY_RULE_IDS)[number], "warning" | "error">>
  return Object.freeze({ name, version: DESIGN_SYSTEM_POLICY_PRESET_VERSION, severityByRule })
}

const BUILT_IN_POLICY_PRESETS = Object.freeze({
  migration: makePreset("migration", "warning"),
  enforce: makePreset("enforce", "error"),
}) satisfies Readonly<Record<PolicyPresetName, BuiltInPolicyPreset>>

/** Return the immutable, independently versioned defaults for a built-in preset. */
export function getBuiltInPolicyPreset(name: PolicyPresetName): BuiltInPolicyPreset {
  return BUILT_IN_POLICY_PRESETS[name]
}
