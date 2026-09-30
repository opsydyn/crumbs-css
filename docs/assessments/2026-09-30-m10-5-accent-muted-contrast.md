# M10.5 `accentMuted` Contrast Palette Follow-Up

Date: 2026-09-30

Parent revision: `cd8ad45`

## Decision

Repair the six known normal-contrast failures with explicit, mode-specific `accentMuted` values in the Storybook reference theme. Keep the brand accents, base palette, other brand/mode combinations, and more-contrast palette unchanged.

## Evidence

The existing deterministic review evaluates opaque six-digit sRGB colours against a 4.5:1 normal-text threshold. The test was first changed to require zero known-pair failures and all six target pairs to pass; it failed on the six previously recorded cases before the palette edit. After the edit, the focused accessibility test passed, and the theme-axis test asserts both authored surface values.

| Brand / mode | Foreground | `accentMuted` surface | Contrast |
| --- | --- | --- | ---: |
| Foundry / light — copy | `#2b1a12` | `#fff4df` | 15.294:1 |
| Foundry / light — muted | `#6c5648` | `#fff4df` | 6.289:1 |
| Foundry / light — accent | `#905f00` | `#fff4df` | 5.038:1 |
| Signal / dark — copy | `#f3ecdf` | `#022126` | 14.321:1 |
| Signal / dark — muted | `#b9ac97` | `#022126` | 7.540:1 |
| Signal / dark — accent | `#15a3b0` | `#022126` | 5.526:1 |

The deterministic review now reports no failures among its known opaque pairs. Its disabled-label and pressed-opacity cases remain `unknown` because their results require compositing against the actual painted backgrounds.

## Limits and remaining M10.5 work

This is source-level palette evidence only. It does not establish rendered colour, overall WCAG conformance, screen-reader acceptance, or device performance. No simulator, screenshot, or physical-device validation was run for this slice. The Node v22.0.0 host-budget gate remains the final M10.5 gate; Android remains parked.
