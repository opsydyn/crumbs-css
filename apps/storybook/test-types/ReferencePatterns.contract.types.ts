import type {
  NativeComponentPublicProps,
  NativeComponentResolvedStyles,
} from "@opsydyn/crumbs-css/style"
import {
  actionButton,
  dialogPanel,
  inputField,
  selectionControl,
} from "../src/components/ReferencePatterns.css"

type ButtonSelection = NativeComponentPublicProps<typeof actionButton>
type ButtonSlots = NativeComponentResolvedStyles<typeof actionButton.slots>
type InputSelection = NativeComponentPublicProps<typeof inputField>
type SelectionControlSelection = NativeComponentPublicProps<typeof selectionControl>
type DialogSlots = NativeComponentResolvedStyles<typeof dialogPanel.slots>

const validButton: ButtonSelection = { disabled: false, pressed: true, tone: "neutral" }
// @ts-expect-error Public tone values come from the component contract.
const unknownButtonTone: ButtonSelection = { tone: "danger" }
// @ts-expect-error The disabled state excludes a pressed selection.
const disabledPressedButton: ButtonSelection = { disabled: true, pressed: true }

const validInput: InputSelection = { disabled: true, focused: false, invalid: true }
// @ts-expect-error Disabled fields cannot select the focused state.
const disabledFocusedInput: InputSelection = { disabled: true, focused: true }

const validSelection: SelectionControlSelection = {
  disabled: false,
  kind: "radio",
  selected: true,
}

const validButtonSlots: ButtonSlots = {
  label: [{ color: "#ffffff", lineHeight: 20 }],
  leadingMark: [{ fontSize: 12 }],
  root: [{ alignItems: "center", padding: 8 }],
}
const invalidButtonSlots: ButtonSlots = {
  label: [{ lineHeight: 20 }],
  leadingMark: [{ fontSize: 12 }],
  root: [
    // @ts-expect-error A view slot cannot accept a text-only color property.
    { color: "#ffffff" },
  ],
}
const validDialogSlots: DialogSlots = {
  actions: [{ flexDirection: "row" }],
  cancelAction: [{ minHeight: 40 }],
  cancelLabel: [{ fontWeight: "800" }],
  confirmAction: [{ minHeight: 40 }],
  confirmLabel: [{ lineHeight: 18 }],
  content: [{ padding: 16 }],
  description: [{ lineHeight: 20 }],
  overlay: [{ justifyContent: "center" }],
  title: [{ fontSize: 20 }],
}
const invalidDialogSlots: DialogSlots = {
  ...validDialogSlots,
  overlay: [
    // @ts-expect-error An overlay view slot does not accept text line height.
    { lineHeight: 18 },
  ],
}

void [
  validButton,
  unknownButtonTone,
  disabledPressedButton,
  validInput,
  disabledFocusedInput,
  validSelection,
  validButtonSlots,
  invalidButtonSlots,
  validDialogSlots,
  invalidDialogSlots,
]
