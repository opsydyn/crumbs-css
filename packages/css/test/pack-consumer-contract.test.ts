import { describe, expect, it } from "bun:test"
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { dirname, resolve } from "node:path"

const PACKAGE_ROOT = resolve(import.meta.dir, "..")
const requireFromPackage = createRequire(resolve(PACKAGE_ROOT, "package.json"))

type SpawnResult = ReturnType<typeof Bun.spawnSync>

function run(
  command: ReadonlyArray<string>,
  cwd: string,
  env?: Record<string, string>,
): SpawnResult {
  const result = Bun.spawnSync([...command], {
    cwd,
    env: { ...process.env, ...env },
    stderr: "pipe",
    stdout: "pipe",
  })
  if (result.exitCode !== 0) {
    throw new Error(
      [`$ ${command.join(" ")}`, result.stdout.toString(), result.stderr.toString()].join("\n"),
    )
  }
  return result
}

function resolveInstalledPackageRoot(packageName: string): string {
  return dirname(requireFromPackage.resolve(`${packageName}/package.json`))
}

function linkRootDependency(consumerRoot: string, packageName: string): void {
  const source = resolveInstalledPackageRoot(packageName)
  if (!existsSync(source)) {
    throw new Error(`Missing root dependency required by consumer contract: ${packageName}`)
  }

  const target = resolve(consumerRoot, "node_modules", packageName)
  mkdirSync(dirname(target), { recursive: true })
  symlinkSync(source, target, "junction")
}

function createPackedConsumer(): string {
  const tempRoot = mkdtempSync(resolve(tmpdir(), "crumbs-css-pack-consumer-"))
  run(["bun", "pm", "pack", "--destination", tempRoot], PACKAGE_ROOT)
  const tarballName = readdirSync(tempRoot).find((entry) => entry.endsWith(".tgz"))
  if (tarballName === undefined) {
    throw new Error("bun pm pack did not create a tarball")
  }
  const tarball = resolve(tempRoot, tarballName)

  const packageRoot = resolve(tempRoot, "consumer", "node_modules", "@opsydyn", "crumbs-css")
  mkdirSync(packageRoot, { recursive: true })
  run(["tar", "-xzf", tarball, "--strip-components=1", "-C", packageRoot], tempRoot)

  for (const dependency of [
    "@types/react",
    "@vanilla-extract/css",
    "@vanilla-extract/integration",
    "css-to-react-native",
    "metro",
    "react",
    "react-native",
  ]) {
    linkRootDependency(resolve(tempRoot, "consumer"), dependency)
  }

  return resolve(tempRoot, "consumer")
}

const consumerTypeSource = `
  import { NativeStylesDiagnosticCode } from "@opsydyn/crumbs-css";
  import { componentRecipe, createNativeNormalizeValueFn, createSprinklesLookupPlan, createTheme, createThemeContract, defineProperties, NATIVE_RESPONSIVE_CONDITION_NAMES, type NativeComponentRecipeProps, type NativeRecipeProps, recipe } from "@opsydyn/crumbs-css/style";
  import { resolveThemeTokens as resolveCoreThemeTokens } from "@opsydyn/crumbs-css/theme/core";
  import { createComponentRecipeResolver, createRecipeResolver, createSprinklesResolver, resolveThemeTokens } from "@opsydyn/crumbs-css/theme";
  import { createTokenContract, createTokenTheme, defineToken } from "@opsydyn/crumbs-css/tokens";
  import { createTokenThemeFocus } from "@opsydyn/crumbs-css/tokens/optic";
  import { withNativeStyles } from "@opsydyn/crumbs-css/metro-plugin";
  import { transformCssTsToStyleSheet } from "@opsydyn/crumbs-css/dist/transformer";

  const vars = createThemeContract({
    color: {
      text: null,
    },
  });
  const activeTheme = createTheme(vars, {
    color: {
      text: "#ffffff",
    },
  });
  const button = recipe({
    defaultVariants: {
      tone: "primary",
    },
    variants: {
      tone: {
        primary: {
          backgroundColor: vars.color.text,
        },
      },
    },
  });
  type ButtonSelection = NativeRecipeProps<typeof button>;
  const selection: ButtonSelection = { tone: "primary" };

  const componentButton = componentRecipe({
    slots: {root: "view", label: "text", icon: "image"} as const,
    variants: {tone: {primary: {root: {opacity: 1}, label: {color: "white"}, icon: {resizeMode: "contain"}}}},
  });
  type ComponentButtonProps = NativeComponentRecipeProps<typeof componentButton>;
  const componentSelection: ComponentButtonProps = {tone: "primary"};

  resolveThemeTokens({ color: vars.color.text }, activeTheme);
  resolveCoreThemeTokens({ color: vars.color.text }, activeTheme);
  createRecipeResolver(button)(selection);
  createComponentRecipeResolver(componentButton)(componentSelection);
  resolveThemeTokens(componentButton, activeTheme);
  const utilityProperties = defineProperties({
    primitives: ["view"] as const,
    properties: { padding: { sm: 8 } },
  });
  createSprinklesResolver(createSprinklesLookupPlan(utilityProperties))({ padding: "sm" });
  createNativeNormalizeValueFn(NATIVE_RESPONSIVE_CONDITION_NAMES)([8, 12, 16, 24]);
  const tokenVars = createTokenContract({ color: { text: defineToken("color") } });
  const tokenTheme = createTokenTheme(tokenVars, { color: { text: "#ffffff" } });
  const tokenFocus = createTokenThemeFocus(tokenVars, tokenVars.color.text);
  const focusedValue: string = tokenFocus.get(tokenTheme);
  tokenFocus.replace("#000000", tokenTheme);
  withNativeStyles({} as never);
  void transformCssTsToStyleSheet;
  void focusedValue;
  const diagnostic: NativeStylesDiagnosticCode = NativeStylesDiagnosticCode.UnsupportedSelector;
  void diagnostic;
`

function writeConsumerTsconfig(
  consumerRoot: string,
  filename: string,
  module: "ESNext" | "Node16",
  moduleResolution: "Bundler" | "Node16",
): void {
  writeFileSync(
    resolve(consumerRoot, filename),
    JSON.stringify(
      {
        compilerOptions: {
          exactOptionalPropertyTypes: true,
          module,
          moduleResolution,
          noEmit: true,
          noUncheckedIndexedAccess: true,
          skipLibCheck: true,
          strict: true,
          target: "ES2022",
        },
        include: ["consumer-types.ts", "primitive-reference-types.ts"],
      },
      null,
      2,
    ),
  )
}

describe("@opsydyn/crumbs-css packed consumer contract", () => {
  it("ships only the compiled npm surface and can be consumed outside the monorepo", () => {
    const consumerRoot = createPackedConsumer()
    const packageRoot = resolve(consumerRoot, "node_modules", "@opsydyn", "crumbs-css")

    expect(existsSync(resolve(packageRoot, "dist", "index.mjs"))).toBe(true)
    expect(existsSync(resolve(packageRoot, "dist", "index.cjs"))).toBe(true)
    expect(existsSync(resolve(packageRoot, "dist", "index.d.mts"))).toBe(true)
    expect(existsSync(resolve(packageRoot, "dist", "index.d.cts"))).toBe(true)
    expect(existsSync(resolve(packageRoot, "dist", "transformer.cjs"))).toBe(true)
    expect(existsSync(resolve(packageRoot, "LICENSE"))).toBe(true)
    expect(existsSync(resolve(packageRoot, "src"))).toBe(false)
    expect(existsSync(resolve(packageRoot, "test"))).toBe(false)
    expect(existsSync(resolve(packageRoot, "fixtures"))).toBe(false)

    const packedPackageJson = JSON.parse(
      readFileSync(resolve(packageRoot, "package.json"), "utf8"),
    ) as {
      readonly name: string
      readonly private?: boolean
    }
    expect(packedPackageJson.name).toBe("@opsydyn/crumbs-css")
    expect(packedPackageJson.private).not.toBe(true)

    writeFileSync(
      resolve(consumerRoot, "package.json"),
      JSON.stringify({ private: true, type: "module" }, null, 2),
    )

    writeFileSync(
      resolve(consumerRoot, "runtime.cjs"),
      `
        const root = require("@opsydyn/crumbs-css");
        const style = require("@opsydyn/crumbs-css/style");
        const theme = require("@opsydyn/crumbs-css/theme");
        const themeCore = require("@opsydyn/crumbs-css/theme/core");
        const tokenOptic = require("@opsydyn/crumbs-css/tokens/optic");
        const metro = require("@opsydyn/crumbs-css/metro-plugin");
        const transformer = require("@opsydyn/crumbs-css/dist/transformer");

        if (typeof root.withNativeStyles !== "function") throw new Error("missing root withNativeStyles");
        if (typeof style.createThemeContract !== "function") throw new Error("missing style createThemeContract");
        if (typeof style.componentRecipe !== "function") throw new Error("missing style componentRecipe");
        if (typeof style.createSprinklesLookupPlan !== "function") throw new Error("missing style createSprinklesLookupPlan");
        if (typeof style.createNativeNormalizeValueFn !== "function") throw new Error("missing style createNativeNormalizeValueFn");
        if (typeof theme.createRecipeResolver !== "function") throw new Error("missing theme createRecipeResolver");
        if (typeof theme.createComponentRecipeResolver !== "function") throw new Error("missing theme createComponentRecipeResolver");
        const component = { $$type: "crumbs.css.component-recipe", version: 1, slots: {root: "view"}, base: {root: {width: theme.createThemeTokenReference("--crumbs-component-width")}}, variants: {}, defaultVariants: {}, compoundVariants: [] };
        if (theme.createComponentRecipeResolver(component)({}).root.length !== 1) throw new Error("component resolver failed");
        if (theme.resolveThemeTokens(component, {contract: {}, values: {}, tokens: {"--crumbs-component-width": 24}}).base.root.width !== 24) throw new Error("component theme resolution failed");
        if (typeof theme.createSprinklesResolver !== "function") throw new Error("missing theme createSprinklesResolver");
        if (typeof themeCore.resolveThemeTokens !== "function") throw new Error("missing theme/core resolveThemeTokens");
        if (typeof tokenOptic.createTokenThemeFocus !== "function") throw new Error("missing token optic focus");
        if (typeof metro.withNativeStyles !== "function") throw new Error("missing metro-plugin withNativeStyles");
        if (typeof transformer.transformCssTsToStyleSheet !== "function") throw new Error("missing transformer");
      `,
    )
    run(["node", "runtime.cjs"], consumerRoot)

    writeFileSync(
      resolve(consumerRoot, "runtime.mjs"),
      `
        import { NativeStylesDiagnosticCode } from "@opsydyn/crumbs-css";
        import { componentRecipe, createNativeNormalizeValueFn, createSprinklesLookupPlan, createThemeContract, defineProperties, NATIVE_RESPONSIVE_CONDITION_NAMES } from "@opsydyn/crumbs-css/style";
        import { resolveThemeTokens as resolveCoreThemeTokens } from "@opsydyn/crumbs-css/theme/core";
        import { createComponentRecipeResolver, createRecipeResolver, createSprinklesResolver, createThemeTokenReference, resolveThemeTokens } from "@opsydyn/crumbs-css/theme";
        import { createTokenThemeFocus } from "@opsydyn/crumbs-css/tokens/optic";
        import { withNativeStyles } from "@opsydyn/crumbs-css/metro-plugin";
        import { transformCssTsToStyleSheet } from "@opsydyn/crumbs-css/dist/transformer";

        if (typeof NativeStylesDiagnosticCode.UnsupportedSelector !== "string") throw new Error("missing root diagnostic code");
        if (typeof createThemeContract !== "function") throw new Error("missing style createThemeContract");
        if (typeof componentRecipe !== "function") throw new Error("missing style componentRecipe");
        if (typeof createSprinklesLookupPlan !== "function") throw new Error("missing style createSprinklesLookupPlan");
        if (typeof createNativeNormalizeValueFn !== "function") throw new Error("missing style createNativeNormalizeValueFn");
        createNativeNormalizeValueFn(NATIVE_RESPONSIVE_CONDITION_NAMES)([8, 12, 16, 24]);
        if (typeof resolveCoreThemeTokens !== "function") throw new Error("missing theme/core resolveThemeTokens");
        if (typeof createRecipeResolver !== "function") throw new Error("missing theme createRecipeResolver");
        if (typeof createComponentRecipeResolver !== "function") throw new Error("missing theme createComponentRecipeResolver");
        const component = { $$type: "crumbs.css.component-recipe", version: 1, slots: {root: "view"}, base: {root: {width: createThemeTokenReference("--crumbs-component-width")}}, variants: {}, defaultVariants: {}, compoundVariants: [] };
        if (createComponentRecipeResolver(component)({}).root.length !== 1) throw new Error("component resolver failed");
        if (resolveThemeTokens(component, {contract: {}, values: {}, tokens: {"--crumbs-component-width": 24}}).base.root.width !== 24) throw new Error("component theme resolution failed");
        if (typeof createSprinklesResolver !== "function") throw new Error("missing theme createSprinklesResolver");
        if (typeof createTokenThemeFocus !== "function") throw new Error("missing token optic focus");
        if (typeof withNativeStyles !== "function") throw new Error("missing metro-plugin withNativeStyles");
        if (typeof transformCssTsToStyleSheet !== "function") throw new Error("missing transformer");
      `,
    )
    run(["node", "runtime.mjs"], consumerRoot)

    writeFileSync(resolve(consumerRoot, "consumer-types.ts"), consumerTypeSource)
    const primitiveTypes = readFileSync(resolve(PACKAGE_ROOT, "test/primitive-reference-types.ts"), "utf8")
      .replaceAll('"../src/native-style"', '"@opsydyn/crumbs-css/style"')
      .replaceAll('"../src/theme-runtime"', '"@opsydyn/crumbs-css/theme"')
    writeFileSync(resolve(consumerRoot, "primitive-reference-types.ts"), primitiveTypes)
    writeConsumerTsconfig(consumerRoot, "tsconfig.node16.json", "Node16", "Node16")
    writeConsumerTsconfig(consumerRoot, "tsconfig.bundler.json", "ESNext", "Bundler")
    run([resolve(resolveInstalledPackageRoot("typescript"), "bin", "tsc"), "-p", "tsconfig.node16.json"], consumerRoot)
    run([resolve(resolveInstalledPackageRoot("typescript"), "bin", "tsc"), "-p", "tsconfig.bundler.json"], consumerRoot)
  })
})
