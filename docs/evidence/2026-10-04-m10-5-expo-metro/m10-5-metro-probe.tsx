import React from "react"
import { Text, View } from "react-native"
import * as compatibility from "@opsydyn/crumbs-css/theme"
import * as core from "@opsydyn/crumbs-css/theme/core"
import { baseTheme, vars } from "./src/styles/theme"

const tokenName = "--crumbs-m10-5-metro-probe"
const matchedTheme = {
  contract: {},
  values: {},
  tokens: { [tokenName]: "metro-matched" },
}

function Check({ id, ok, label }) {
  return <Text testID={id}>{label}:{ok ? "PASS" : "FAIL"}</Text>
}

function CoreHookUnderThemeProvider() {
  const value = core.useTheme()
  return <Check id="compat-provider-core-hook" label="compat-provider/core-hook"
    ok={Object.is(value, matchedTheme) && value.tokens[tokenName] === "metro-matched"} />
}

function ThemeHookUnderCoreProvider() {
  const value = compatibility.useTheme()
  return <Check id="core-provider-compat-hook" label="core-provider/compat-hook"
    ok={Object.is(value, matchedTheme) && value.tokens[tokenName] === "metro-matched"} />
}

function CoreHookUnderTokenProvider() {
  const value = core.useTheme()
  return <Check id="token-provider-core-hook" label="token-provider/core-hook"
    ok={Object.is(value, baseTheme)} />
}

export default function MetroMixedEntryProbe() {
  const providersShareReference = Object.is(compatibility.ThemeProvider, core.ThemeProvider)
  return (
    <View>
      <Text testID="metro-probe-title">M10.5 Metro mixed-entry probe</Text>
      <compatibility.ThemeProvider theme={matchedTheme}>
        <CoreHookUnderThemeProvider />
      </compatibility.ThemeProvider>
      <core.ThemeProvider theme={matchedTheme}>
        <ThemeHookUnderCoreProvider />
      </core.ThemeProvider>
      <compatibility.TokenThemeProvider contract={vars} theme={baseTheme}>
        <CoreHookUnderTokenProvider />
      </compatibility.TokenThemeProvider>
      <Check id="provider-reference-identity" label="provider-export-references-distinct"
        ok={!providersShareReference} />
    </View>
  )
}
