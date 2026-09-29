import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { buildReferenceContrastReview } from "../src/accessibility/contrast-review"

const destination = fileURLToPath(new URL("../test/native-accessibility-review-cases.json", import.meta.url))
const review = {
  formatVersion: 1,
  conditions: [
    {
      axis: "fontScaleBucket",
      source: "useWindowDimensions().fontScale",
      consumerCase: "Text with allowFontScaling enabled and no maxFontSizeMultiplier cap",
    },
    {
      axis: "direction",
      source: "I18nManager.isRTL at AppThemeProvider mount",
      consumerCase: "Preview control updates the condition snapshot and native View.direction while Crumbs logical padding remains authored once",
      limitation: "The preview control is not a substitute for testing a localized RTL app launch.",
    },
    {
      axis: "motion",
      source: "AccessibilityInfo.isReduceMotionEnabled and reduceMotionChanged",
      consumerCase: "Reduced motion stops an active sample and completes future sample transitions immediately",
    },
    {
      axis: "contrast",
      sources: {
        ios: "AccessibilityInfo.isDarkerSystemColorsEnabled and darkerSystemColorsChanged",
        android: "AccessibilityInfo.isHighTextContrastEnabled and highTextContrastChanged",
      },
      mapping: { enabled: "more", disabled: "normal" },
      limitation: "React Native exposes no less-contrast preference; custom adapters may still supply contrast=less.",
    },
  ],
  contrastReview: {
    method: "WCAG 2.2 sRGB relative luminance ratio for declared opaque six-digit hex pairs",
    minimumTextRatio: 4.5,
    strongerContrastTarget: 7,
    appliesLargeTextException: false,
    limitation: "Source-level palette review only; not a WCAG conformance result or a native rendering measurement.",
    pairs: buildReferenceContrastReview().pairs,
  },
  acceptance: {
    iosSimulator: { status: "accepted", osVersion: "26.5", app: "standalone" },
    iosPhysicalDevice: "not-run",
    androidDevice: "parked",
    screenReader: "not-assessed",
    storybookOnDeviceNavigator: "not-qualified",
  },
}

const contents = `${JSON.stringify(review, null, 2)}\n`
const checking = process.argv.includes("--check")

if (checking) {
  if (!existsSync(destination) || readFileSync(destination, "utf8") !== contents) {
    throw new Error("Native accessibility review cases are stale; run accessibility:generate.")
  }
} else {
  writeFileSync(destination, contents)
}
