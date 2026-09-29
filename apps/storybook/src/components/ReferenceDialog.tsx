import {
  createComponentRecipeResolver,
  TokenThemeScopeProvider,
} from "@opsydyn/crumbs-css/theme"
import { useThemedStyles } from "@opsydyn/crumbs-css/theme/core"
import type { NativeComponentPublicProps } from "@opsydyn/crumbs-css/style"
import * as Dialog from "@rn-primitives/dialog"
import { useMemo } from "react"
import { Text, View } from "react-native"
import { brandScopes, vars } from "../styles/theme"
import * as s from "./ReferencePatterns.css"

type DialogSelection = NativeComponentPublicProps<typeof s.dialogPanel>

const defaultDialogSelection: DialogSelection = {}

type ReferenceDialogProps = {
  readonly onCancel: () => void
  readonly onConfirm: () => void
}

function ReferenceDialogPortalContent({ onCancel, onConfirm }: ReferenceDialogProps) {
  const styles = useThemedStyles(s)
  const resolve = useMemo(
    () => createComponentRecipeResolver(styles.dialogPanel),
    [styles.dialogPanel],
  )
  const nativeStyles = useMemo(() => {
    const resolved = resolve(defaultDialogSelection)

    return {
      actions: [...resolved.actions],
      cancelAction: [...resolved.cancelAction],
      cancelLabel: [...resolved.cancelLabel],
      confirmAction: [...resolved.confirmAction],
      confirmLabel: [...resolved.confirmLabel],
      content: [...resolved.content],
      description: [...resolved.description],
      overlay: [...resolved.overlay],
      title: [...resolved.title],
    }
  }, [resolve])

  return (
    <>
      <Dialog.Overlay closeOnPress style={nativeStyles.overlay} />
      <Dialog.Content style={nativeStyles.content}>
        <Dialog.Title style={nativeStyles.title}>Review the Signal brand contract?</Dialog.Title>
        <Dialog.Description style={nativeStyles.description}>
          This dialog is rendered through the shared portal host. Its brand scope is reapplied at
          the portal boundary so its tokens stay aligned with the card that opened it.
        </Dialog.Description>
        <View style={nativeStyles.actions}>
          <Dialog.Close onPress={onCancel} style={nativeStyles.cancelAction}>
            <Text style={nativeStyles.cancelLabel}>Cancel</Text>
          </Dialog.Close>
          <Dialog.Close onPress={onConfirm} style={nativeStyles.confirmAction}>
            <Text style={nativeStyles.confirmLabel}>Confirm review</Text>
          </Dialog.Close>
        </View>
      </Dialog.Content>
    </>
  )
}

/**
 * Portal hosts render outside the source scope subtree. Reapply the explicitly
 * selected brand layer under the host while inheriting the root mode/density.
 */
export function ReferenceDialog(props: ReferenceDialogProps) {
  return (
    <Dialog.Portal>
      <TokenThemeScopeProvider contract={vars} context="brand" values={brandScopes.signal}>
        <ReferenceDialogPortalContent {...props} />
      </TokenThemeScopeProvider>
    </Dialog.Portal>
  )
}
