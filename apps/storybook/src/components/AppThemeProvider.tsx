import { TokenThemeProvider, TokenThemeScopeProvider } from "@opsydyn/crumbs-css/theme"
import { StatusBar } from "expo-status-bar"
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import {
  baseTheme,
  brandScopes,
  densityScopes,
  modeScopes,
  vars,
  type ShowcaseBrand,
  type ShowcaseDensity,
  type ShowcaseThemeMode,
} from "../styles/theme"

type AppThemeContextValue = {
  readonly brand: ShowcaseBrand
  readonly density: ShowcaseDensity
  readonly mode: ShowcaseThemeMode
  readonly setBrand: (brand: ShowcaseBrand) => void
  readonly setDensity: (density: ShowcaseDensity) => void
  readonly setMode: (mode: ShowcaseThemeMode) => void
  readonly toggleMode: () => void
}

type AppThemeProviderProps = {
  readonly children: ReactNode
  readonly initialBrand?: ShowcaseBrand
  readonly initialDensity?: ShowcaseDensity
  readonly initialMode?: ShowcaseThemeMode
}

const AppThemeContext = createContext<AppThemeContextValue | null>(null)

export function AppThemeProvider({
  children,
  initialBrand = "foundry",
  initialDensity = "comfortable",
  initialMode = "dark",
}: AppThemeProviderProps) {
  const [brand, setBrand] = useState<ShowcaseBrand>(initialBrand)
  const [density, setDensity] = useState<ShowcaseDensity>(initialDensity)
  const [mode, setMode] = useState<ShowcaseThemeMode>(initialMode)
  const toggleMode = useCallback(
    () => setMode((current) => (current === "dark" ? "light" : "dark")),
    [],
  )
  const contextValue = useMemo(
    () => ({ brand, density, mode, setBrand, setDensity, setMode, toggleMode }),
    [brand, density, mode, toggleMode],
  )

  return (
    <AppThemeContext.Provider
      value={contextValue}
    >
      <TokenThemeProvider contract={vars} theme={baseTheme}>
        <TokenThemeScopeProvider contract={vars} context="brand" values={brandScopes[brand]}>
          <TokenThemeScopeProvider contract={vars} context="mode" values={modeScopes[mode]}>
            <TokenThemeScopeProvider
              contract={vars}
              context="density"
              values={densityScopes[density]}
            >
              {children}
              <StatusBar style={mode === "dark" ? "light" : "dark"} />
            </TokenThemeScopeProvider>
          </TokenThemeScopeProvider>
        </TokenThemeScopeProvider>
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
