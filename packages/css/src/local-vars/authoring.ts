import { NativeStylesDiagnosticCode as Code } from "../diagnostics";
import { normalizeTokenContractIdentity, type TokenContractIdentity } from "../tokens/identity";
import { normalizeTokenDomainDefinition } from "../tokens/domain-values";
import type { TokenDomainDefinition } from "../tokens/domains";
import { createThemeTokenReference, getThemeTokenLocalDomain, isRegisteredThemeVar, getThemeTokenMetadata, type TokenDomain, type ThemeVar, type PublicDomainThemeVar } from "../theme-token";
import { NativeLocalVarType, NativeLocalFallbackType, type NativeLocalVar, type NativeLocalDomain, type NativeLocalFallback, type LocalLiteral } from "./model";
import { copyLocalData, exactLocalRecord, admitLocalOperand, localError } from "./admission";
export function createVar<const D extends TokenDomainDefinition>(definition: D, identity: TokenContractIdentity): NativeLocalVar<NativeLocalDomain<D>> {
  const d = copyLocalData(definition, Code.InvalidLocalVar);
  const i = copyLocalData(identity, Code.InvalidLocalVar);
  if (typeof d === "object" && d !== null) {
    const kind = (d as {
      kind?: unknown;
    }).kind;
    exactLocalRecord(d, kind === "enum" ? ["kind", "values"] : kind === "length" && Object.hasOwn(d, "allowNegative") ? ["kind", "allowNegative"] : ["kind"], Code.InvalidLocalVar, "createVar.domain");
    if (kind === "length" && Object.hasOwn(d, "allowNegative") && typeof (d as {
      allowNegative?: unknown;
    }).allowNegative !== "boolean")
      localError(Code.InvalidLocalVar, "createVar.domain", "invalid negative permission");
  }
  exactLocalRecord(i, ["owner", "name", "version"], Code.InvalidLocalVar, "createVar.identity");
  let domain, normalized;
  try {
    domain = normalizeTokenDomainDefinition(d as D);
    normalized = normalizeTokenContractIdentity(i as TokenContractIdentity);
  }
  catch {
    return localError(Code.InvalidLocalVar, "createVar", "invalid definition or identity");
  }
  return admitLocalOperand({ $$type: NativeLocalVarType, version: 1, identity: normalized, domain }) as NativeLocalVar<NativeLocalDomain<D>>;
}
type Last<T extends readonly unknown[]> = T extends readonly [
  ...unknown[],
  infer L
] ? L : never;
type CheckedTerminal<D extends TokenDomain, T> = T extends ThemeVar ? T extends PublicDomainThemeVar<D> ? unknown : never : T extends LocalLiteral<D> ? unknown : never;
export function fallbackVar<D extends TokenDomain, const A extends [
  ...NativeLocalVar<NoInfer<D>>[],
  string | number
]>(primary: NativeLocalVar<D>, ...rest: A & CheckedTerminal<NoInfer<D>, Last<A>>): NativeLocalFallback<D> {
  const terminal = rest.at(-1);
  let encoded: unknown = { kind: "literal", value: terminal };
  if (isRegisteredThemeVar(terminal)) {
    const metadata = getThemeTokenMetadata(terminal);
    const owned = getThemeTokenLocalDomain(terminal);
    if (metadata.visibility !== "public" || !owned || owned.ambiguous)
      localError(Code.InvalidLocalVar, "fallbackVar", "expected unambiguous public typed theme token");
    encoded = { kind: "theme", reference: createThemeTokenReference(metadata.varName), domain: owned.domain, publicId: metadata.publicId ?? metadata.varName, ...(owned.identity ? { contractIdentity: owned.identity } : {}) };
  }
  return admitLocalOperand({ $$type: NativeLocalFallbackType, version: 1, variables: [primary, ...rest.slice(0, -1)], terminal: encoded }) as NativeLocalFallback<D>;
}
