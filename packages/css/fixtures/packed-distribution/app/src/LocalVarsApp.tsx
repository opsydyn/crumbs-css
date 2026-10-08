import { useState } from "react";
import { ScrollView, View } from "react-native";
import { ThemeProvider } from "@opsydyn/crumbs-css/theme/core";
import { localLight, localDark } from "./local-theme";
import { LocalVarsCards, LocalLiteralExample } from "./LocalVarsPanel";
export default function LocalVarsApp() { const [dark, setDark] = useState(false); return <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60, gap: 16 }}><LocalLiteralExample /><ThemeProvider theme={dark ? localDark : localLight}><LocalVarsCards toggleTheme={() => setDark(v => !v)}/></ThemeProvider></ScrollView>; }
