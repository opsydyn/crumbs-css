import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { assignVars, useAssignedStyles } from "@opsydyn/crumbs-css/theme/vars";
import { initialLocalCards, updateLocalCardA, type LocalCardValues } from "./local-vars-model";
import { accent, alpha, card, literal } from "./LocalVarsPanel.css";
const cardStyles = Object.freeze({ card }), literalStyles = Object.freeze({ literal });
function snapshot(values: LocalCardValues) {
  if (values.accent !== undefined && values.alpha !== undefined)
    return assignVars({ accent, alpha }, { accent: values.accent, alpha: values.alpha });
  if (values.alpha !== undefined)
    return assignVars({ alpha }, { alpha: values.alpha });
  if (values.accent !== undefined)
    return assignVars({ accent }, { accent: values.accent });
  return assignVars({}, {});
}
function Card({ id, values }: {
  id: string;
  values: LocalCardValues;
}) {
  const assignments = useMemo(() => snapshot(values), [values]);
  const s = useAssignedStyles(cardStyles, assignments);
  return <View style={{ gap: 4 }}><Text testID={`local-${id}-status`}>{`Card ${id}: ${String(s.card.backgroundColor)} / ${String(s.card.opacity)}`}</Text><View testID={`local-${id}`} style={s.card}><Text style={{ color: "white" }}>Independent card {id}</Text></View></View>;
}
export function LocalLiteralExample() { const s = useAssignedStyles(literalStyles, assignVars({}, {})); return <View style={s.literal}><Text testID="local-literal">Literal sample: {String(s.literal.opacity)}</Text></View>; }
export function LocalVarsCards({ toggleTheme }: {
  toggleTheme: () => void;
}) {
  const [state, setState] = useState(initialLocalCards);
  return <View style={{ gap: 12 }}><Text style={{ fontSize: 20, fontWeight: "600" }}>Local card styling</Text><Card id="A" values={state.a}/><Card id="B" values={state.b}/>
 {([['opacity', 'Change A opacity'], ['accent-clear', 'Clear A accent'], ['clear', 'Clear A']] as const).map(([action, label]) => <Pressable key={action} accessibilityRole="button" accessibilityLabel={label} onPress={() => setState(previous => updateLocalCardA(previous, action))} style={{ padding: 12, borderWidth: 1, borderColor: "#888", borderRadius: 8 }}><Text>{label}</Text></Pressable>)}
 <Pressable accessibilityRole="button" accessibilityLabel="Toggle local theme" onPress={toggleTheme} style={{ padding: 12, borderWidth: 1, borderColor: "#888", borderRadius: 8 }}><Text>Toggle local theme</Text></Pressable></View>;
}
import { ThemeProvider } from "@opsydyn/crumbs-css/theme/core";
import { localLight, localDark } from "./local-theme";
export function LocalVarsPanel() { const [dark, setDark] = useState(false); return <View><LocalLiteralExample /><ThemeProvider theme={dark ? localDark : localLight}><LocalVarsCards toggleTheme={() => setDark(v => !v)}/></ThemeProvider></View>; }
