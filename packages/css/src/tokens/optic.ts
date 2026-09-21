import * as Optic from "effect/Optic"
import {
  applyTokenThemePatch,
  assertTokenThemeContractCompatibility,
  type TokenThemeLayer,
  type TokenThemeOperationError,
  type TokenThemePatchResult,
  type TokenThemeValues,
} from "./domains"
import {
  getThemeTokenAliasForContract,
  getThemeTokenDomainForContract,
  type DomainThemeVar,
  type TokenDomain,
  type TokenDomainValue,
} from "../theme-token"
import {
  getThemeTokenPath,
  type NativeTheme,
} from "../theme-contract"
import { formatNativeStylesDiagnostic, NativeStylesDiagnosticCode } from "../diagnostics"

/** A plain-data result for one validated focus update. */
export type TokenThemeFocusResult<TContract> = TokenThemePatchResult<TContract>

/**
 * A reusable nested token focus. The pure value methods expose Effect Optic's
 * path-copy semantics without leaking Effect types; theme methods add Crumbs'
 * contract and domain validation before publishing a new snapshot.
 */
export type TokenThemeFocus<TContract, TValue> = {
  readonly path: ReadonlyArray<string>
  readonly getValues: (values: TokenThemeValues<TContract>) => TValue
  readonly replaceValues: (
    value: TValue,
    values: TokenThemeValues<TContract>,
  ) => TokenThemeValues<TContract>
  readonly modifyValues: (
    update: (value: TValue) => unknown,
    values: TokenThemeValues<TContract>,
  ) => TokenThemeValues<TContract>
  readonly get: (theme: NativeTheme<TContract>) => TValue
  readonly replace: (value: TValue, theme: NativeTheme<TContract>) => TokenThemeFocusResult<TContract>
  readonly modify: (
    update: (value: TValue) => unknown,
    theme: NativeTheme<TContract>,
  ) => TokenThemeFocusResult<TContract>
}

/**
 * Create a reusable focus for one definition token. Aliases are derived data
 * and therefore cannot be focus targets. The returned focus is safe to cache
 * outside render loops and can be used for both pure transformations and
 * validated immutable theme updates.
 */
export function createTokenThemeFocus<
  TContract extends Readonly<Record<string, unknown>>,
  TDomain extends TokenDomain,
>(
  contract: TContract,
  token: DomainThemeVar<TDomain>,
): TokenThemeFocus<TContract, TokenDomainValue<TDomain>> {
  let path: ReadonlyArray<string>
  try {
    path = getThemeTokenPath(token)
  } catch (error) {
    throw invalidFocusError(error instanceof Error ? error.message : String(error))
  }
  if (path.length === 0 || getThemeTokenDomainForContract(contract, token) === undefined ||
    getThemeTokenAliasForContract(contract, token) !== undefined) {
    throw invalidFocusError(`Token focus ${JSON.stringify(path)} must reference a definition token in the supplied contract.`)
  }

  const frozenPath = Object.freeze([...path])
  const optic = makePathOptic(frozenPath)
  const focus: TokenThemeFocus<TContract, TokenDomainValue<TDomain>> = {
    path: frozenPath,
    getValues: values => optic.get(values as unknown as ValueRecord) as TokenDomainValue<TDomain>,
    replaceValues: (value, values) => optic.replace(
      value,
      values as unknown as ValueRecord,
    ) as TokenThemeValues<TContract>,
    modifyValues: (update, values) => optic.modify(
      value => update(value as TokenDomainValue<TDomain>),
    )(values as unknown as ValueRecord) as TokenThemeValues<TContract>,
    get: theme => {
      assertTokenThemeContractCompatibility(contract, theme)
      return optic.get(theme.values as unknown as ValueRecord) as TokenDomainValue<TDomain>
    },
    replace: (value, theme) => updateThemeFocus(contract, theme, frozenPath, optic, value),
    modify: (update, theme) => {
      try {
        assertTokenThemeContractCompatibility(contract, theme)
        const values = optic.modify(
          value => update(value as TokenDomainValue<TDomain>),
        )(theme.values as unknown as ValueRecord) as TokenThemeValues<TContract>
        return publishThemeFocus(contract, theme, frozenPath, optic.get(values as unknown as ValueRecord))
      } catch (error) {
        return {ok: false, error: toFocusOperationError(error)}
      }
    },
  }
  return Object.freeze(focus)
}

type ValueRecord = Record<string, unknown>
type PathOptic = Optic.Lens<ValueRecord, unknown>

function makePathOptic(path: ReadonlyArray<string>): PathOptic {
  return Optic.makeLens<ValueRecord, unknown>(
    source => readPath(source, path),
    (value, source) => replacePath(source, path, value),
  )
}

function updateThemeFocus<TContract extends Readonly<Record<string, unknown>>>(
  contract: TContract,
  theme: NativeTheme<TContract>,
  path: ReadonlyArray<string>,
  optic: PathOptic,
  value: unknown,
): TokenThemeFocusResult<TContract> {
  try {
    assertTokenThemeContractCompatibility(contract, theme)
    const values = optic.replace(
      value,
      theme.values as unknown as ValueRecord,
    )
    return publishThemeFocus(contract, theme, path, optic.get(values))
  } catch (error) {
    return {ok: false, error: toFocusOperationError(error)}
  }
}

function publishThemeFocus<TContract extends Readonly<Record<string, unknown>>>(
  contract: TContract,
  theme: NativeTheme<TContract>,
  path: ReadonlyArray<string>,
  value: unknown,
): TokenThemeFocusResult<TContract> {
  return applyTokenThemePatch(
    contract,
    theme,
    makeLeafPatch(path, value) as TokenThemeLayer<TContract>,
  )
}

function makeLeafPatch(path: ReadonlyArray<string>, value: unknown): ValueRecord {
  const root: ValueRecord = {}
  let cursor = root
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index]
    if (key === undefined) throw invalidFocusError("Token focus path is empty.")
    const child: ValueRecord = {}
    Object.defineProperty(cursor, key, {
      value: child,
      enumerable: true,
      configurable: true,
      writable: true,
    })
    cursor = child
  }
  const key = path[path.length - 1]
  if (key === undefined) throw invalidFocusError("Token focus path is empty.")
  Object.defineProperty(cursor, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  })
  return root
}

function readPath(source: ValueRecord, path: ReadonlyArray<string>): unknown {
  let current: unknown = source
  for (const key of path) {
    if (!isValueRecord(current) || !Object.prototype.hasOwnProperty.call(current, key)) {
      throw invalidFocusError(`Token focus path ${JSON.stringify(path)} is absent from the supplied values.`)
    }
    current = current[key]
  }
  return current
}

function replacePath(source: ValueRecord, path: ReadonlyArray<string>, value: unknown): ValueRecord {
  if (path.length === 0) throw invalidFocusError("Token focus path is empty.")
  const replaceAt = (current: unknown, index: number): ValueRecord => {
    if (!isValueRecord(current)) throw invalidFocusError(`Token focus path ${JSON.stringify(path)} is absent from the supplied values.`)
    const key = path[index]
    if (key === undefined || !Object.prototype.hasOwnProperty.call(current, key)) {
      throw invalidFocusError(`Token focus path ${JSON.stringify(path)} is absent from the supplied values.`)
    }
    const previous = current[key]
    const next = index === path.length - 1 ? value : replaceAt(previous, index + 1)
    if (next === previous) return current
    const copy: ValueRecord = Object.create(Object.getPrototypeOf(current))
    for (const ownKey of Object.keys(current)) {
      Object.defineProperty(copy, ownKey, {
        value: current[ownKey],
        enumerable: true,
        configurable: true,
        writable: true,
      })
    }
    Object.defineProperty(copy, key, {
      value: next,
      enumerable: true,
      configurable: true,
      writable: true,
    })
    return copy
  }
  return replaceAt(source, 0)
}

function isValueRecord(value: unknown): value is ValueRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function invalidFocusError(message: string): Error {
  return new Error(formatNativeStylesDiagnostic(
    NativeStylesDiagnosticCode.TokenThemeFocusInvalid,
    message,
  ))
}

function toFocusOperationError(error: unknown): TokenThemeOperationError {
  const message = error instanceof Error ? error.message : String(error)
  const code = message.match(/CRUMBS_CSS_[A-Z0-9_]+/)?.[0] ?? NativeStylesDiagnosticCode.TokenThemeFocusInvalid
  return {code, path: [], message}
}
