import * as Schema from "effect/Schema"
import { makeDataCodec, type ContractResult } from "../src/contracts/data-codec"
import {
  nativeArtifactCodec, type NativeArtifact, type NativeDeclaration,
  type ContractIdentity, type ThemeTokenReference, type StructuredDiagnostic,
} from "../src/contracts/payloads"
import { NativeStylesDiagnosticCode } from "../src/diagnostics"

const contract: ContractIdentity = { owner: "@acme/tokens", name: "foundation", version: 1 }
const token: ThemeTokenReference = { _tag: "ThemeTokenReference", contract, varName: "--crumbs-opacity" }
const source = { file: "button.css.ts", exportName: "button", path: ["styles", 0] }
const declaration: NativeDeclaration = { _tag: "NativeDeclaration", property: "opacity", value: token, source }
const artifact: NativeArtifact = { _tag: "NativeArtifact", version: 1, contract, declarations: [declaration] }
const result: ContractResult<NativeArtifact> = nativeArtifactCodec.decode(artifact)
const encoded: ContractResult<string> = nativeArtifactCodec.encode(artifact)
// @ts-expect-error Typed producers cannot encode an unsupported artifact version.
nativeArtifactCodec.encode({ ...artifact, version: 2 })
const diagnostic: StructuredDiagnostic = { _tag: "Diagnostic", code: NativeStylesDiagnosticCode.MissingThemeToken, severity: "error", message: "Missing token", source }
// @ts-expect-error Initial artifact version is exact, not any number.
const future: NativeArtifact = { ...artifact, version: 2 }
// @ts-expect-error Qualified reference identity is required.
const missingIdentity: ThemeTokenReference = { _tag: "ThemeTokenReference", varName: "--crumbs-opacity" }
// @ts-expect-error Diagnostics require one of the current explicit codes.
const unknownCode: StructuredDiagnostic = { ...diagnostic, code: "UNKNOWN" }
// @ts-expect-error Source positions are numeric rather than coerced strings.
const stringPosition: NativeDeclaration = { ...declaration, source: { ...source, line: "1" } }
// @ts-expect-error Contract schemas and types are immutable.
contract.name = "changed"
// @ts-expect-error Identity-data JSON codecs cannot take a string-to-number transformation.
makeDataCodec("invalid-transform", Schema.FiniteFromString)
void [encoded, result, future, missingIdentity, unknownCode, stringPosition]
