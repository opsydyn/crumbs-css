import { describe, expect, it } from "bun:test"
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { dirname, resolve } from "node:path"
import { verifyPackedExportMap } from "../../../scripts/packed-export-contract"

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
    "effect",
    "metro",
    "react",
    "react-native",
  ]) {
    linkRootDependency(resolve(tempRoot, "consumer"), dependency)
  }

  return realpathSync(resolve(tempRoot, "consumer"))
}

async function writePackedStatefulFixture(consumerRoot: string): Promise<void> {
  const buttonFilename = resolve(consumerRoot, "button.css.ts")
  writeFileSync(buttonFilename, `
    import {componentRecipe, createThemeContract} from "@opsydyn/crumbs-css/style";
    const vars = createThemeContract({color: {label: null}});
    export const button = componentRecipe({
      slots: {root: "view", label: "text"},
      base: {
        root: {opacity: 0.25},
        label: {color: vars.color.label},
      },
      variants: {
        status: {
          ready: {root: {borderWidth: 1}},
          loading: {root: {borderWidth: 2}},
        },
        busy: {
          false: {root: {opacity: 0.5}},
          true: {root: {opacity: 0.75}},
        },
        tone: {
          primary: {label: {fontWeight: "700", color: vars.color.label}},
          quiet: {label: {fontWeight: "400"}},
        },
      },
      defaultVariants: {status: "ready", busy: false, tone: "primary"},
      stateVariants: {
        status: {
          ready: {busy: [false], tone: ["primary", "quiet"]},
          loading: {busy: [true], tone: ["primary"]},
        },
      },
    }, "button");
  `)

  const uiRoot = resolve(consumerRoot, "packages", "ui")
  const brandRoot = resolve(consumerRoot, "packages", "brand")
  mkdirSync(uiRoot, {recursive: true})
  mkdirSync(brandRoot, {recursive: true})
  writeFileSync(resolve(uiRoot, "package.json"), JSON.stringify({name: "@acme/ui", type: "module"}))
  writeFileSync(resolve(brandRoot, "package.json"), JSON.stringify({name: "@acme/brand", type: "module"}))

  const ownerFilename = resolve(uiRoot, "button.css.ts")
  writeFileSync(ownerFilename, `
    import {componentRecipe, createThemeContract} from "@opsydyn/crumbs-css/style";
    export const vars = createThemeContract({color: {label: null, brand: null}});
    export const contractedButton = componentRecipe({
      contract: {
        identity: {owner: "@acme/ui", name: "PackedContractButton", version: 1},
        public: {slots: ["root", "label"], variants: {tone: ["primary", "quiet"]}},
        extensionPoints: {defaults: ["tone"], variantValues: ["tone"], compoundVariants: true, slotStyles: ["root", "label"]},
      },
      slots: {root: "view", label: "text", internalIcon: "image"},
      base: {root: {opacity: 0.25}, label: {color: vars.color.label}},
      variants: {
        tone: {
          primary: {root: {opacity: 0.6}},
          quiet: {root: {opacity: 0.4}},
          dangerInternal: {root: {opacity: 0.1}},
        },
        density: {compact: {internalIcon: {width: 12}}},
      },
      defaultVariants: {tone: "primary", density: "compact"},
    }, "contractedButton");
  `)

  const brandFilename = resolve(brandRoot, "branded-button.css.ts")
  writeFileSync(brandFilename, `
    import {extendComponentRecipe} from "@opsydyn/crumbs-css/style";
    import {contractedButton, vars} from "../ui/button.css";
    export const brand = extendComponentRecipe(contractedButton, {
      identity: {owner: "@acme/brand", name: "PackedButtonBrand", version: 1},
      defaultVariants: {tone: "brand"},
      variants: {tone: {brand: {root: {backgroundColor: vars.color.brand}}}},
      compoundVariants: [{variants: {tone: "brand"}, styles: {label: {color: vars.color.brand}}}],
      slotOverrides: {root: {opacity: 0.95}},
    });
  `)

  const requireFromConsumer = createRequire(resolve(consumerRoot, "package.json"))
  const {transformCssTsToStyleSheet} = requireFromConsumer(
    "@opsydyn/crumbs-css/dist/transformer",
  ) as {
    readonly transformCssTsToStyleSheet: (
      filePath: string,
      cwd: string,
      options: {readonly useStyleSheet: false; readonly strictDiagnostics: true},
    ) => Promise<string>
  }
  const modules = [
    {sourcePath: buttonFilename, outputPath: resolve(consumerRoot, "button.css")},
    {sourcePath: ownerFilename, outputPath: resolve(uiRoot, "button.css")},
    {sourcePath: brandFilename, outputPath: resolve(brandRoot, "branded-button.css")},
  ]
  const compiledModules: Array<{readonly outputPath: string; readonly code: string}> = []
  for (const module of modules) {
    const code = await transformCssTsToStyleSheet(module.sourcePath, consumerRoot, {
      useStyleSheet: false,
      strictDiagnostics: true,
    })
    if (module.sourcePath === brandFilename) {
      expect(code).toContain('import "../ui/button.css.ts";')
      const brandSource = readFileSync(brandFilename, "utf8")
      expect(brandSource).toContain('import {contractedButton, vars} from "../ui/button.css"')
      expect(brandSource).not.toContain("componentRecipe(")
    }
    compiledModules.push({outputPath: module.outputPath, code})
  }
  for (const module of compiledModules) {
    // Metro tracks .css.ts source dependencies; this Node fixture loads each
    // independently compiled output as .css while retaining the same graph.
    writeFileSync(module.outputPath, module.code.replaceAll(".css.ts", ".css"))
  }
}

const statefulConsumerAssertions = `
  const contains = (styles, slot, property, expected) => styles[slot].some(style => style[property] === expected);
  if (button.version !== 2) throw new Error("stateful component descriptor version was not preserved");
  if (JSON.stringify(button.stateVariants) !== JSON.stringify({status: {ready: {busy: [false], tone: ["primary", "quiet"]}, loading: {busy: [true], tone: ["primary"]}}})) throw new Error("state constraints were not preserved");
  const themedButton = THEME.resolveThemeTokens(button, {contract: {}, values: {}, tokens: {"--crumbs-color-label": "#fff"}});
  const resolveButton = THEME.createComponentRecipeResolver(themedButton);
  const defaultStyles = resolveButton({});
  if (!contains(defaultStyles, "root", "borderTopWidth", 1) || !contains(defaultStyles, "root", "opacity", 0.5) || !contains(defaultStyles, "label", "color", "#fff")) throw new Error("default state styles did not resolve");
  const loadingStyles = resolveButton({status: "loading", busy: true, tone: "primary"});
  if (!contains(loadingStyles, "root", "borderTopWidth", 2) || !contains(loadingStyles, "root", "opacity", 0.75) || !contains(loadingStyles, "label", "fontWeight", "700")) throw new Error("valid non-default state styles did not resolve");
  const prohibitedStyles = resolveButton({status: "loading", busy: false, tone: "quiet"});
  if (JSON.stringify(prohibitedStyles.root) !== JSON.stringify([{opacity: 0.25}])) throw new Error("prohibited state input did not fall back to base styles");
`

const extensionConsumerAssertions = `
  if (contractedButton.version !== 3 || contractedButton.contract.identity.name !== "PackedContractButton") throw new Error("v3 component contract was not preserved");
  if (brand.$$type !== "crumbs.css.component-recipe-extension" || brand.version !== 1 || brand.componentIdentity.name !== "PackedContractButton") throw new Error("extension descriptor metadata was not preserved");
  const themedContractedButton = THEME.resolveThemeTokens(contractedButton, {contract: {}, values: {}, tokens: {"--crumbs-color-label": "#ffffff", "--crumbs-color-brand": "#336699"}});
  const themedBrand = THEME.resolveThemeTokens(brand, {contract: {}, values: {}, tokens: {"--crumbs-color-label": "#ffffff", "--crumbs-color-brand": "#336699"}});
  const extendedStyles = THEME.createComponentRecipeResolver(themedContractedButton, {extensions: [themedBrand]})();
  const expected = {root: [{opacity: 0.25}, {backgroundColor: "#336699"}, {opacity: 0.95}], label: [{color: "#ffffff"}, {color: "#336699"}], internalIcon: [{width: 12}]};
  if (JSON.stringify(extendedStyles) !== JSON.stringify(expected)) throw new Error("extension styles did not resolve in exact base/variant/compound/override order: " + JSON.stringify(extendedStyles));
`

const consumerTypeSource = `
  import { NativeStylesDiagnosticCode } from "@opsydyn/crumbs-css";
  import { explainStyle, type ExplainStyleInput, type StyleExplanationBranchDecision, type StyleExplanationCoverage, type StyleExplanationMetadata, type StyleExplanationReport, type StyleExplanationSnapshot, type StyleExplanationTransitionStatus, type StyleExplanationValue } from "@opsydyn/crumbs-css/devtools";
  import { componentRecipe, createNativeNormalizeValueFn, createSprinklesLookupPlan, createTheme, createThemeContract, defineProperties, extendComponentRecipe, NATIVE_RESPONSIVE_CONDITION_NAMES, type NativeComponentPublicProps, type NativeComponentRecipeExtensionDescriptor, type NativeComponentRecipeProps, type NativeRecipeProps, recipe } from "@opsydyn/crumbs-css/style";
  import { resolveThemeTokens as resolveCoreThemeTokens } from "@opsydyn/crumbs-css/theme/core";
  import { createComponentRecipeResolver, createRecipeResolver, createSprinklesResolver, resolveThemeStyles, resolveThemeTokens } from "@opsydyn/crumbs-css/theme";
  import { createTokenContract, createTokenTheme, defineToken } from "@opsydyn/crumbs-css/tokens";
  import { createTokenThemeFocus } from "@opsydyn/crumbs-css/tokens/optic";
  import { decodeExternalTokenTheme, decodeTokenValue, type ExternalTokenTheme } from "@opsydyn/crumbs-css/tokens/schema";
  import { decodeTokenValue as decodeTokenValueFocused } from "@opsydyn/crumbs-css/tokens/schema/value";
  import { withNativeStyles } from "@opsydyn/crumbs-css/metro-plugin";
  import { transformCssTsToStyleSheet } from "@opsydyn/crumbs-css/dist/transformer";
  import { checkDesignSystemPolicy, decodeDesignSystemPolicy, decodeDesignSystemPolicyReport, decodePolicyMeasurements, encodeCanonicalDesignSystemPolicyReport, getBuiltInPolicyPreset } from "@opsydyn/crumbs-css/tooling/policy";
  import type { DesignSystemManifest, DesignSystemPolicy, DesignSystemPolicyReport, PolicyMeasurement, StyleExplanationMetadata as PolicyStyleExplanationMetadata } from "@opsydyn/crumbs-css/tooling/policy";

  const policyForTypes: DesignSystemPolicy = {
    format: "crumbs.css.design-system-policy", schemaVersion: 1, policyId: "@acme/policy", version: 1,
    preset: {name: "migration", version: 1}, severityOverrides: {}, literalValueScopes: [],
    semanticTokenScopes: [], semanticTokenIds: [], targetProfiles: [], outputBudgets: [], exceptions: [],
  };
  const manifestForTypes: DesignSystemManifest = {
    format: "crumbs.design-system-manifest", schemaVersion: 1,
    package: {name: "@acme/design-system", version: "1.0.0"},
    producer: {compiler: {name: "@opsydyn/crumbs-css", version: "1.0.0"}, artifact: {name: "crumbs-native-style-artifact", version: 1}},
    tokens: [], components: [], modules: [], dependencies: [], capabilities: [], coverage: {roots: [], unresolved: []},
  };
  const typedMeasurements: ReadonlyArray<PolicyMeasurement> = decodePolicyMeasurements([]);
  const typedMetadata: ReadonlyArray<PolicyStyleExplanationMetadata> = [];
  const decodedPolicyForTypes = decodeDesignSystemPolicy(policyForTypes);
  const typedReport: DesignSystemPolicyReport = checkDesignSystemPolicy({policy: decodedPolicyForTypes, current: manifestForTypes, styleMetadata: typedMetadata, measurements: typedMeasurements});
  decodeDesignSystemPolicyReport(typedReport);
  encodeCanonicalDesignSystemPolicyReport(typedReport);
  getBuiltInPolicyPreset("migration");

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

  const contractedButton = componentRecipe({
    contract: {
      identity: {owner: "@acme/ui", name: "PackedTypeButton", version: 1},
      public: {slots: ["root"], variants: {tone: ["primary", "quiet"]}},
      extensionPoints: {defaults: ["tone"], variantValues: ["tone"], slotStyles: ["root"]},
    },
    slots: {root: "view", internalIcon: "image"} as const,
    variants: {
      tone: {primary: {root: {opacity: 1}}, quiet: {root: {opacity: 0.8}}, dangerInternal: {root: {opacity: 0.1}}},
      density: {compact: {internalIcon: {width: 12}}},
    },
  });
  const brand = extendComponentRecipe(contractedButton, {
    identity: {owner: "@acme/brand", name: "PackedTypeBrand", version: 1},
    variants: {tone: {brand: {root: {opacity: 0.9}}}},
  });
  type BrandedSelection = NativeComponentPublicProps<typeof brand>;
  const publicBrandSelection: BrandedSelection = {tone: "brand"};
  const typedExtension: NativeComponentRecipeExtensionDescriptor = brand;
  const themedExtension: typeof brand = resolveThemeTokens(brand, activeTheme)!;
  const themedCoreExtension: typeof brand = resolveCoreThemeTokens(brand, activeTheme)!;
  const mappedExtension: typeof brand = resolveThemeStyles({brand}, activeTheme).brand;
  createComponentRecipeResolver(contractedButton, {extensions: [brand]})(publicBrandSelection);
  // @ts-expect-error private owner axes stay unavailable through extension selection.
  const privateAxisSelection: BrandedSelection = {density: "compact"};
  // @ts-expect-error private owner values stay unavailable through extension selection.
  const privateValueSelection: BrandedSelection = {tone: "dangerInternal"};
  void [privateAxisSelection, privateValueSelection, typedExtension, themedExtension, themedCoreExtension, mappedExtension];

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
  const decodedColor: string = decodeTokenValue({kind: "color"}, "#ffffff");
  const decodedFocusedColor: string = decodeTokenValueFocused({kind: "color"}, "#ffffff");
  void decodedFocusedColor;
  const externalTheme: ExternalTokenTheme = {_tag: "CrumbsTokenTheme", version: 1, contract: {owner: "@acme/ui", name: "Theme", version: 1}, values: {"color.text": decodedColor}};
  const decodedTheme = decodeExternalTokenTheme(externalTheme);
  if (decodedTheme.ok) {
    const publicTheme: ExternalTokenTheme = decodedTheme.value;
    void publicTheme;
  }
  const explanationInput: ExplainStyleInput = {
    module: {card: {opacity: 0.5}},
    exportPath: ["card"],
    current: {theme: {contract: {}, tokens: {}, values: {}}},
  };
  const explanation: StyleExplanationReport = explainStyle(explanationInput);
  type ExplanationTypeSurface = [StyleExplanationSnapshot, StyleExplanationMetadata, StyleExplanationValue, StyleExplanationBranchDecision, StyleExplanationCoverage, StyleExplanationTransitionStatus];
  void explanation;
  withNativeStyles({} as never);
  void transformCssTsToStyleSheet;
  void focusedValue;
  const diagnostic: NativeStylesDiagnosticCode = NativeStylesDiagnosticCode.UnsupportedSelector;
  void diagnostic;
  void typedReport;
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
  it("ships only the compiled npm surface and can be consumed outside the monorepo", async () => {
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
      readonly peerDependencies?: Readonly<Record<string, string>>
      readonly engines?: Readonly<{node?: string}>
      readonly exports: Readonly<Record<string, unknown>>
    }
    expect(packedPackageJson.name).toBe("@opsydyn/crumbs-css")
    expect(packedPackageJson.private).not.toBe(true)
    expect(packedPackageJson.peerDependencies?.effect).toBeUndefined()
    expect(packedPackageJson.engines?.node).toBe(">=22.0.0")

    const nodeVersionOutput = run(["node", "-p", "process.versions.node"], consumerRoot).stdout
    const nodeMajor = Number.parseInt(nodeVersionOutput?.toString().trim().split(".")[0] ?? "0", 10)
    expect(nodeMajor).toBeGreaterThanOrEqual(22)
    const exportResolutions = await verifyPackedExportMap(packageRoot, consumerRoot)
    expect(exportResolutions.map((entry) => entry.subpath)).toEqual(Object.keys(packedPackageJson.exports))
    expect(exportResolutions.find((entry) => entry.subpath === "./dist/theme")?.import)
      .toBe("./dist/theme.mjs")
    expect(exportResolutions.find((entry) => entry.subpath === "./dist/metro-plugin")?.require)
      .toBe("./dist/metro-plugin.cjs")
    expect(exportResolutions.find((entry) => entry.subpath === "./package.json")?.import)
      .toBe("./package.json")

    writeFileSync(
      resolve(consumerRoot, "package.json"),
      JSON.stringify({name: "crumbs-css-packed-consumer", private: true, type: "module"}, null, 2),
    )
    await writePackedStatefulFixture(consumerRoot)
    writeFileSync(
      resolve(consumerRoot, "css-loader.mjs"),
      `import {readFile} from "node:fs/promises";
       import {fileURLToPath} from "node:url";
       export async function load(url, context, nextLoad) {
         if (url.endsWith(".css")) return {format: "module", shortCircuit: true, source: await readFile(fileURLToPath(url), "utf8")};
         return nextLoad(url, context);
       }`,
    )

    writeFileSync(
      resolve(consumerRoot, "runtime.cjs"),
      `
        const root = require("@opsydyn/crumbs-css");
        const style = require("@opsydyn/crumbs-css/style");
        const theme = require("@opsydyn/crumbs-css/theme");
        const themeCore = require("@opsydyn/crumbs-css/theme/core");
        const tokenOptic = require("@opsydyn/crumbs-css/tokens/optic");
        const tokenSchema = require("@opsydyn/crumbs-css/tokens/schema");
        const tokenValueSchema = require("@opsydyn/crumbs-css/tokens/schema/value");
        const devtools = require("@opsydyn/crumbs-css/devtools");
        const metro = require("@opsydyn/crumbs-css/metro-plugin");
        const transformer = require("@opsydyn/crumbs-css/dist/transformer");
        const policyTools = require("@opsydyn/crumbs-css/tooling/policy");
        const policyInput = {format:"crumbs.css.design-system-policy",schemaVersion:1,policyId:"@acme/policy",version:1,preset:{name:"migration",version:1},severityOverrides:{},literalValueScopes:[],semanticTokenScopes:[],semanticTokenIds:[],targetProfiles:[],outputBudgets:[],exceptions:[]};
        const policyCurrent = {format:"crumbs.design-system-manifest",schemaVersion:1,package:{name:"@acme/design-system",version:"1.0.0"},producer:{compiler:{name:"@opsydyn/crumbs-css",version:"1.0.0"},artifact:{name:"crumbs-native-style-artifact",version:1}},tokens:[],components:[],modules:[],dependencies:[],capabilities:[],coverage:{roots:[],unresolved:[]}};
        const policyReport = policyTools.checkDesignSystemPolicy({policy:policyTools.decodeDesignSystemPolicy(policyInput),current:policyCurrent});
        if (policyReport.format !== "crumbs.css.design-system-policy-report" || policyReport.schemaVersion !== 1) throw new Error("CommonJS policy report contract failed");
        if (JSON.parse(policyTools.encodeCanonicalDesignSystemPolicyReport(policyReport)).policy.policyId !== "@acme/policy") throw new Error("CommonJS canonical policy report failed");
        if (Object.keys(policyTools).some(name => name.endsWith("Schema") || name.endsWith("Codec"))) throw new Error("Effect Schema object leaked from the policy API");
        require.extensions[".css"] = (module, filename) => {
          const source = require("node:fs").readFileSync(filename, "utf8")
            .replace(/^import (["'][^"']+["']);$/gm, "require($1);")
            .replace(/^export const (\\w+) =/gm, "exports.$1 =");
          module._compile(source, filename);
        };
        const {button} = require("./button.css");
        const {contractedButton} = require("./packages/ui/button.css");
        const {brand} = require("./packages/brand/branded-button.css");

        if (typeof root.withNativeStyles !== "function") throw new Error("missing root withNativeStyles");
        if (typeof style.createThemeContract !== "function") throw new Error("missing style createThemeContract");
        if (typeof style.componentRecipe !== "function") throw new Error("missing style componentRecipe");
        if (typeof style.extendComponentRecipe !== "function") throw new Error("missing style extendComponentRecipe");
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
        if (tokenSchema.decodeTokenValue({kind: "color"}, "#ffffff") !== "#ffffff") throw new Error("token schema color decode failed");
        if (tokenValueSchema.decodeTokenValue({kind: "color"}, "#ffffff") !== "#ffffff") throw new Error("focused token schema color decode failed");
        const decodedExternalTheme = tokenSchema.decodeExternalTokenTheme({_tag: "CrumbsTokenTheme", version: 1, contract: {owner: "@acme/ui", name: "Theme", version: 1}, values: {"color.text": "#ffffff"}});
        if (!decodedExternalTheme.ok || decodedExternalTheme.value.values["color.text"] !== "#ffffff") throw new Error("external token theme decode failed");
        if (typeof metro.withNativeStyles !== "function") throw new Error("missing metro-plugin withNativeStyles");
        if (typeof transformer.transformCssTsToStyleSheet !== "function") throw new Error("missing transformer");
        const explanation = devtools.explainStyle({module: {card: {width: theme.createThemeTokenReference("--crumbs-packed-width")}}, exportPath: ["card"], current: {theme: {contract: {}, values: {}, tokens: {"--crumbs-packed-width": 24}}}});
        const explainedWidth = explanation.resolution.value.width;
        if (explanation.$$type !== "crumbs.css.style-explanation" || explanation.version !== 1 || explainedWidth.kind !== "theme-token" || explainedWidth.resolvedValue !== 24) throw new Error("CommonJS devtools explanation contract failed");
        ${statefulConsumerAssertions.replaceAll("THEME", "theme")}
        ${extensionConsumerAssertions.replaceAll("THEME", "theme")}
      `,
    )
    run(["node", "runtime.cjs"], consumerRoot)

    writeFileSync(
      resolve(consumerRoot, "runtime.mjs"),
      `
        import { NativeStylesDiagnosticCode } from "@opsydyn/crumbs-css";
        import { componentRecipe, createNativeNormalizeValueFn, createSprinklesLookupPlan, createThemeContract, defineProperties, extendComponentRecipe, NATIVE_RESPONSIVE_CONDITION_NAMES } from "@opsydyn/crumbs-css/style";
        import { resolveThemeTokens as resolveCoreThemeTokens } from "@opsydyn/crumbs-css/theme/core";
        import { createComponentRecipeResolver, createRecipeResolver, createSprinklesResolver, createThemeTokenReference, resolveThemeTokens } from "@opsydyn/crumbs-css/theme";
        import { createTokenThemeFocus } from "@opsydyn/crumbs-css/tokens/optic";
        import { decodeExternalTokenTheme, decodeTokenValue } from "@opsydyn/crumbs-css/tokens/schema";
        import { decodeTokenValue as decodeTokenValueFocused } from "@opsydyn/crumbs-css/tokens/schema/value";
        import { withNativeStyles } from "@opsydyn/crumbs-css/metro-plugin";
        import { transformCssTsToStyleSheet } from "@opsydyn/crumbs-css/dist/transformer";
        import { explainStyle } from "@opsydyn/crumbs-css/devtools";
        import { checkDesignSystemPolicy, decodeDesignSystemPolicy, encodeCanonicalDesignSystemPolicyReport } from "@opsydyn/crumbs-css/tooling/policy";
        const policyInput = {format:"crumbs.css.design-system-policy",schemaVersion:1,policyId:"@acme/policy",version:1,preset:{name:"migration",version:1},severityOverrides:{},literalValueScopes:[],semanticTokenScopes:[],semanticTokenIds:[],targetProfiles:[],outputBudgets:[],exceptions:[]};
        const policyCurrent = {format:"crumbs.design-system-manifest",schemaVersion:1,package:{name:"@acme/design-system",version:"1.0.0"},producer:{compiler:{name:"@opsydyn/crumbs-css",version:"1.0.0"},artifact:{name:"crumbs-native-style-artifact",version:1}},tokens:[],components:[],modules:[],dependencies:[],capabilities:[],coverage:{roots:[],unresolved:[]}};
        const policyReport = checkDesignSystemPolicy({policy:decodeDesignSystemPolicy(policyInput),current:policyCurrent});
        if (policyReport.format !== "crumbs.css.design-system-policy-report" || JSON.parse(encodeCanonicalDesignSystemPolicyReport(policyReport)).policy.policyId !== "@acme/policy") throw new Error("ESM policy API contract failed");
        import {button} from "./button.css";
        import {contractedButton} from "./packages/ui/button.css";
        import {brand} from "./packages/brand/branded-button.css";

        if (typeof NativeStylesDiagnosticCode.UnsupportedSelector !== "string") throw new Error("missing root diagnostic code");
        if (typeof createThemeContract !== "function") throw new Error("missing style createThemeContract");
        if (typeof componentRecipe !== "function") throw new Error("missing style componentRecipe");
        if (typeof extendComponentRecipe !== "function") throw new Error("missing style extendComponentRecipe");
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
        if (decodeTokenValue({kind: "color"}, "#ffffff") !== "#ffffff") throw new Error("token schema color decode failed");
        if (decodeTokenValueFocused({kind: "color"}, "#ffffff") !== "#ffffff") throw new Error("focused token schema color decode failed");
        const decodedExternalTheme = decodeExternalTokenTheme({_tag: "CrumbsTokenTheme", version: 1, contract: {owner: "@acme/ui", name: "Theme", version: 1}, values: {"color.text": "#ffffff"}});
        if (!decodedExternalTheme.ok || decodedExternalTheme.value.values["color.text"] !== "#ffffff") throw new Error("external token theme decode failed");
        if (typeof withNativeStyles !== "function") throw new Error("missing metro-plugin withNativeStyles");
        if (typeof transformCssTsToStyleSheet !== "function") throw new Error("missing transformer");
        const explanation = explainStyle({module: {card: {width: createThemeTokenReference("--crumbs-packed-width")}}, exportPath: ["card"], current: {theme: {contract: {}, values: {}, tokens: {"--crumbs-packed-width": 24}}}});
        const explainedWidth = explanation.resolution.value.width;
        if (explanation.$$type !== "crumbs.css.style-explanation" || explanation.version !== 1 || explainedWidth.kind !== "theme-token" || explainedWidth.resolvedValue !== 24) throw new Error("ESM devtools explanation contract failed");
        ${statefulConsumerAssertions.replaceAll("THEME", "({resolveThemeTokens, createComponentRecipeResolver})")}
        ${extensionConsumerAssertions.replaceAll("THEME", "({resolveThemeTokens, createComponentRecipeResolver})")}
      `,
    )
    run(["node", "--loader", "./css-loader.mjs", "runtime.mjs"], consumerRoot)

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
