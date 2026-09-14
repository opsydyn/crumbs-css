export type Identity = "initial" | "same" | "changed" | "absent"
export type Sample = { borderColor?: string; opacity?: number; padding?: number; borderWidth?: number }
const actions = ["mount", "rerender", "select", "repeat-selection", "parent-switch", "nested-switch", "unmount"] as const
export function createScopePlan(cycles: number) {
  if (!Number.isSafeInteger(cycles) || cycles < 1 || cycles > 20) throw new Error("cycles must be 1–20")
  return Array.from({ length: cycles }, (_, cycle) => actions.map((action, i) => {
    const mounted = i !== 6
    const selected = i >= 2
    const parentDark = i >= 4
    const nestedDark = i < 5
    const sample = (dark: boolean): Sample => mounted ? { borderColor: dark ? "#95afff" : "#3559c7", opacity: selected ? 1 : 0.7, padding: selected ? 20 : 12, borderWidth: selected ? 4 : 1 } : {}
    return { index: cycle * 7 + i, cycle: cycle + 1, action, mounted, selected, parentDark, nestedDark, expectedParent: sample(parentDark), expectedNested: sample(nestedDark), parentIdentity: (i === 0 ? "initial" : i === 6 ? "absent" : i === 4 ? "changed" : "same") as Identity, nestedIdentity: (i === 0 ? "initial" : i === 6 ? "absent" : i === 5 ? "changed" : "same") as Identity }
  })).flat()
}
export type ScopeObservation = { step: number; action: string; parent: Sample; nested: Sample; parentIdentity: Identity; nestedIdentity: Identity; recipeArrayFresh: boolean; requestToLayoutEffectMs: number }
export function summarizeScopes(plan: ReturnType<typeof createScopePlan>, observations: ScopeObservation[], counts: { mounts: number; unmounts: number }) {
  const equal = (a: Sample, b: Sample) => ["borderColor", "opacity", "padding", "borderWidth"].every(k => a[k as keyof Sample] === b[k as keyof Sample])
  const complete = plan.length > 0 && observations.length === plan.length && observations.every((o,i) => o.step === plan[i]?.index && o.action === plan[i]?.action && Number.isFinite(o.requestToLayoutEffectMs) && o.requestToLayoutEffectMs >= 0)
  const stylesVerified = complete && observations.every((o,i) => equal(o.parent,plan[i]!.expectedParent) && equal(o.nested,plan[i]!.expectedNested))
  const referencesVerified = complete && observations.every((o,i) => o.parentIdentity === plan[i]!.parentIdentity && o.nestedIdentity === plan[i]!.nestedIdentity && o.recipeArrayFresh === plan[i]!.mounted)
  const lifecycleBalanced = counts.mounts === plan.length / 7 * 2 && counts.unmounts === counts.mounts
  return { complete, stylesVerified, referencesVerified, lifecycleBalanced, verified: complete && stylesVerified && referencesVerified && lifecycleBalanced }
}
