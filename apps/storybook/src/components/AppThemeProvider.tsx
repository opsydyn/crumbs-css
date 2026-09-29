import { TokenThemeProvider, TokenThemeScopeProvider } from "@opsydyn/crumbs-css/theme"
import {
  createNativeConditionStore,
  useNativeConditionSnapshot,
  type NativeConditionInput,
  type NativeConditionSnapshot,
  type NativePlatform,
} from "@opsydyn/crumbs-css/theme/core"
import { StatusBar } from "expo-status-bar"
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { AccessibilityInfo, I18nManager, Platform, useWindowDimensions } from "react-native"
import {
  createNativeAccessibilityConditionSource,
  type NativeAccessibilityPreferenceApi,
} from "../accessibility/native-condition-source"
import {
  baseTheme,
  brandScopes,
  densityScopes,
  modeScopeFor,
  statusBarStyleFor,
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

export type NativeConditionsContextValue = Readonly<{
  readonly snapshot: NativeConditionSnapshot
  readonly update: (patch: NativeConditionInput) => boolean
}>

type AppThemeProviderProps = {
  readonly children: ReactNode
  readonly initialBrand?: ShowcaseBrand
  readonly initialDensity?: ShowcaseDensity
  readonly initialMode?: ShowcaseThemeMode
}

const AppThemeContext = createContext<AppThemeContextValue | null>(null)
const NativeConditionsContext = createContext<NativeConditionsContextValue | null>(null)
const nativePlatform = Platform.OS as NativePlatform

const nativeAccessibilityPreferences: NativeAccessibilityPreferenceApi = {
  isReduceMotionEnabled: () => AccessibilityInfo.isReduceMotionEnabled(),
  isHighTextContrastEnabled: () => AccessibilityInfo.isHighTextContrastEnabled(),
  isDarkerSystemColorsEnabled: () => AccessibilityInfo.isDarkerSystemColorsEnabled(),
  addEventListener: (event, listener) => AccessibilityInfo.addEventListener(event, listener),
}

export function AppThemeProvider({
  children,
  initialBrand = "foundry",
  initialDensity = "comfortable",
  initialMode = "dark",
}: AppThemeProviderProps) {
  const [brand, setBrand] = useState<ShowcaseBrand>(initialBrand)
  const [density, setDensity] = useState<ShowcaseDensity>(initialDensity)
  const [mode, setMode] = useState<ShowcaseThemeMode>(initialMode)
  const dimensions = useWindowDimensions()
  const [conditionStore] = useState(() => createNativeConditionStore({
    initial: {
      platform: nativePlatform,
      width: dimensions.width,
      height: dimensions.height,
      fontScale: dimensions.fontScale,
      isRTL: I18nManager.isRTL,
    },
    sources: [createNativeAccessibilityConditionSource(nativePlatform, nativeAccessibilityPreferences)],
  }))
  const nativeSnapshot = useNativeConditionSnapshot(conditionStore)
  const modeValues = useMemo(
    () => modeScopeFor(brand, mode, nativeSnapshot.contrast),
    [brand, mode, nativeSnapshot.contrast],
  )
  const nativeConditionsValue = useMemo(
    () => ({ snapshot: nativeSnapshot, update: conditionStore.update }),
    [conditionStore, nativeSnapshot],
  )
  const toggleMode = useCallback(
    () => setMode((current) => (current === "dark" ? "light" : "dark")),
    [],
  )
  const themeContextValue = useMemo(
    () => ({ brand, density, mode, setBrand, setDensity, setMode, toggleMode }),
    [brand, density, mode, toggleMode],
  )

  useLayoutEffect(() => {
    conditionStore.update({
      width: dimensions.width,
      height: dimensions.height,
      fontScale: dimensions.fontScale,
    })
  }, [conditionStore, dimensions.fontScale, dimensions.height, dimensions.width])
  return (
    <AppThemeContext.Provider value={themeContextValue}>
      <NativeConditionsContext.Provider value={nativeConditionsValue}>
        <TokenThemeProvider contract={vars} theme={baseTheme}>
          <TokenThemeScopeProvider contract={vars} context="brand" values={brandScopes[brand]}>
            <TokenThemeScopeProvider contract={vars} context="mode" values={modeValues}>
              <TokenThemeScopeProvider
                contract={vars}
                context="density"
                values={densityScopes[density]}
              >
                {children}
                <StatusBar style={statusBarStyleFor(mode, nativeSnapshot.contrast)} />
              </TokenThemeScopeProvider>
            </TokenThemeScopeProvider>
          </TokenThemeScopeProvider>
        </TokenThemeProvider>
      </NativeConditionsContext.Provider>
    </AppThemeContext.Provider>
  )
}

export function useAppTheme(): AppThemeContextValue {
  const value = useContext(AppThemeContext)
  if (value === null) throw new Error("AppThemeProvider is required before using useAppTheme")
  return value
}

export function useNativeConditions(): NativeConditionsContextValue {
  const value = useContext(NativeConditionsContext)
  if (value === null) throw new Error("AppThemeProvider is required before reading native conditions")
  return value
}
