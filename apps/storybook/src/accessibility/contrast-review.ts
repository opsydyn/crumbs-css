import {
  baseThemeValues,
  brandScopes,
  contrastMoreScope,
  modeScopeFor,
  type ShowcaseBrand,
  type ShowcaseThemeMode,
} from "../styles/theme"

export type DeclaredContrastPair = Readonly<{
  readonly id: string
  readonly foreground: string
  readonly background: string
  readonly minimumRatio: number
  readonly context: Readonly<{
    readonly brand: ShowcaseBrand
    readonly mode: ShowcaseThemeMode
    readonly contrast: "normal" | "more"
  }>
}>

export type ContrastReviewResult = DeclaredContrastPair & Readonly<{
  readonly ratio: number | null
  readonly status: "pass" | "fail" | "unknown"
  readonly reason?: string
}>

const brands = ["foundry", "signal"] as const satisfies readonly ShowcaseBrand[]
const modes = ["dark", "light"] as const satisfies readonly ShowcaseThemeMode[]
const levels = ["normal", "more"] as const

function parseOpaqueHex(value: string): readonly [number, number, number] | undefined {
  if (!/^#[0-9a-f]{6}$/i.test(value)) return undefined
  const channels = value.slice(1).match(/.{2}/g)
  if (channels === null || channels === undefined) return undefined
  return channels.map((channel) => Number.parseInt(channel, 16) / 255) as unknown as
    readonly [number, number, number]
}

function linearize(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

function luminance(color: readonly [number, number, number]): number {
  return 0.2126 * linearize(color[0]) + 0.7152 * linearize(color[1]) + 0.0722 * linearize(color[2])
}

export function contrastRatio(foreground: string, background: string): number | undefined {
  const foregroundRgb = parseOpaqueHex(foreground)
  const backgroundRgb = parseOpaqueHex(background)
  if (foregroundRgb === undefined || backgroundRgb === undefined) return undefined
  const values = [luminance(foregroundRgb), luminance(backgroundRgb)].sort((a, b) => b - a)
  return (values[0]! + 0.05) / (values[1]! + 0.05)
}

function resolveColors(brand: ShowcaseBrand, mode: ShowcaseThemeMode, contrast: "normal" | "more") {
  return {
    ...baseThemeValues.color,
    ...brandScopes[brand].color,
    ...modeScopeFor(brand, mode).color,
    ...(contrast === "more" ? contrastMoreScope.color : {}),
  }
}

function reviewPair(pair: DeclaredContrastPair): ContrastReviewResult {
  const ratio = contrastRatio(pair.foreground, pair.background)
  if (ratio === undefined) {
    return {
      ...pair,
      ratio: null,
      status: "unknown",
      reason: "The pair is not two opaque six-digit sRGB colours.",
    }
  }
  return { ...pair, ratio, status: ratio >= pair.minimumRatio ? "pass" : "fail" }
}

export function buildReferenceContrastReview(): Readonly<{
  readonly minimumTextRatio: 4.5
  readonly strongerContrastTarget: 7
  readonly pairs: ReadonlyArray<ContrastReviewResult>
}> {
  const pairs: ContrastReviewResult[] = []
  for (const brand of brands) {
    for (const mode of modes) {
      for (const contrast of levels) {
        const colors = resolveColors(brand, mode, contrast)
        const context = { brand, mode, contrast } as const
        const minimumRatio = contrast === "more" ? 7 : 4.5
        const declarations = [
          { id: "copy-on-panel", foreground: colors.copy, background: colors.panel },
          { id: "muted-on-panel", foreground: colors.muted, background: colors.panel },
          { id: "accent-on-panel", foreground: colors.accent, background: colors.panel },
          { id: "button-label-on-accent", foreground: colors.accentText, background: colors.accent },
          { id: "copy-on-canvas", foreground: colors.copy, background: colors.canvas },
          { id: "accent-on-canvas", foreground: colors.accent, background: colors.canvas },
          { id: "copy-on-accent-muted", foreground: colors.copy, background: colors.accentMuted },
          { id: "muted-on-accent-muted", foreground: colors.muted, background: colors.accentMuted },
          { id: "accent-on-accent-muted", foreground: colors.accent, background: colors.accentMuted },
        ] as const
        for (const declaration of declarations) {
          pairs.push(reviewPair({
            ...declaration,
            id: `${brand}/${mode}/${contrast}/${declaration.id}`,
            context,
            minimumRatio,
          }))
        }
      }
    }
  }

  pairs.push({
    id: "shared/disabled-label-opacity",
    foreground: "token:muted",
    background: "token:panelRaised",
    minimumRatio: 4.5,
    context: { brand: "foundry", mode: "dark", contrast: "normal" },
    ratio: null,
    status: "unknown",
    reason: "Disabled text opacity requires compositing against the actual ancestor and surface backgrounds.",
  })
  pairs.push({
    id: "shared/pressed-opacity",
    foreground: "token:copy",
    background: "token:accentMuted",
    minimumRatio: 4.5,
    context: { brand: "foundry", mode: "light", contrast: "normal" },
    ratio: null,
    status: "unknown",
    reason: "Pressed menu-item opacity composites text and surface colours against the painted ancestor; the result needs native/background compositing.",
  })

  return Object.freeze({
    minimumTextRatio: 4.5,
    strongerContrastTarget: 7,
    pairs: Object.freeze(pairs),
  })
}
