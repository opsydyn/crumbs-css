import { createComponentRecipeResolver } from "@opsydyn/crumbs-css/theme"
import { useThemedStyles } from "@opsydyn/crumbs-css/theme/core"
import type { NativeComponentPublicProps } from "@opsydyn/crumbs-css/style"
import { useMemo, useState } from "react"
import { Text, TextInput, View } from "react-native"
import * as s from "./ReferencePatterns.css"

type InputSelection = NativeComponentPublicProps<typeof s.inputField>

export function ReferenceTextField({ disabled = false }: { readonly disabled?: boolean }) {
  const styles = useThemedStyles(s)
  const resolve = useMemo(
    () => createComponentRecipeResolver(styles.inputField),
    [styles.inputField],
  )
  const [email, setEmail] = useState("design@company.com")
  const [focused, setFocused] = useState(false)
  const invalid = email.trim() !== "" && !email.includes("@")
  const fieldStyles = useMemo(() => {
    const selection: InputSelection = disabled
      ? { disabled: true, focused: false, invalid }
      : { disabled: false, focused, invalid }
    const resolved = resolve(selection)

    return {
      control: [...resolved.control],
      label: [...resolved.label],
      message: [...resolved.message],
      root: [...resolved.root],
    }
  }, [disabled, focused, invalid, resolve])

  return (
    <View style={fieldStyles.root}>
      <Text style={fieldStyles.label}>Work email</Text>
      <TextInput
        accessibilityHint="Enter the email used by your design system team."
        accessibilityLabel="Work email"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!disabled}
        keyboardType="email-address"
        onBlur={() => setFocused(false)}
        onChangeText={setEmail}
        onFocus={() => setFocused(true)}
        placeholder="name@company.com"
        style={fieldStyles.control}
        value={email}
      />
      <Text style={fieldStyles.message}>
        {invalid ? "Enter an email address containing @." : "Used only for team access."}
      </Text>
    </View>
  )
}
