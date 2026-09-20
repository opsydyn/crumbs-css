import { TokenThemeProvider } from "@opsydyn/crumbs-css/theme"
import { StatusBar } from "expo-status-bar"
import { createContext, useContext, useState, type ReactNode } from "react"
import {
  darkTheme,
  lightTheme,
  vars,
  type ShowcaseThemeMode,
} from "../styles/theme"

type AppThemeContextValue = {
  readonly mode: ShowcaseThemeMode
  readonly setMode: (mode: ShowcaseThemeMode) => void
  readonly toggleMode: () => void
}

type AppThemeProviderProps = {
  readonly children: ReactNode
  readonly initialMode?: ShowcaseThemeMode
}

const AppThemeContext = createContext<AppThemeContextValue | null>(null)

export function AppThemeProvider({
  children,
  initialMode = "dark",
}: AppThemeProviderProps) {
  const [mode, setMode] = useState<ShowcaseThemeMode>(initialMode)
  const theme = mode === "dark" ? darkTheme : lightTheme

  return (
    <AppThemeContext.Provider
      value={{
        mode,
        setMode,
        toggleMode: () => setMode((current) => (current === "dark" ? "light" : "dark")),
      }}
    >
      <TokenThemeProvider contract={vars} theme={theme}>
        {children}
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
      </TokenThemeProvider>
    </AppThemeContext.Provider>
  )
}

export function useAppTheme(): AppThemeContextValue {
  const value = useContext(AppThemeContext)

  if (value === null) {
    throw new Error("AppThemeProvider is required before using useAppTheme")
  }

  return value
}
