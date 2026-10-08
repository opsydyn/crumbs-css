import type { TokenDomain } from "../theme-token";
import type { TokenDomainDefinition } from "./domains";
export function isTokenDomainValue(domain: TokenDomain, value: unknown): boolean {
  switch (domain.kind) {
    case "color":
      return typeof value === "string" && value.length > 0;
    case "length":
      if (value === "auto")
        return true;
      if (typeof value === "number")
        return Number.isFinite(value) && (domain.allowNegative || value >= 0);
      if (typeof value !== "string")
        return false;
      if (!new RegExp(`^${domain.allowNegative ? "[+-]?" : "\\+?"}(?:\\d+(?:\\.\\d*)?|\\.\\d+)%$`).test(value))
        return false;
      return Number.isFinite(Number.parseFloat(value));
    case "duration":
      return typeof value === "number" && Number.isFinite(value) && value >= 0;
    case "opacity":
      return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
    case "enum":
      return typeof value === "string" && domain.values.includes(value);
  }
}
export function normalizeTokenDomainDefinition(definition: TokenDomainDefinition): TokenDomain {
  if (definition === "color" || (typeof definition === "object" && definition.kind === "color"))
    return { kind: "color" };
  if (definition === "duration" || (typeof definition === "object" && definition.kind === "duration"))
    return { kind: "duration" };
  if (definition === "opacity" || (typeof definition === "object" && definition.kind === "opacity"))
    return { kind: "opacity" };
  if (definition === "length" || (typeof definition === "object" && definition.kind === "length")) {
    return { kind: "length", allowNegative: typeof definition === "object" && definition.allowNegative === true };
  }
  if (typeof definition === "object" && definition.kind === "enum") {
    if (definition.values.length === 0 || definition.values.some(value => typeof value !== "string" || value.length === 0)) {
      throw new Error("Token enum domains require one or more non-empty string values");
    }
    if (new Set(definition.values).size !== definition.values.length) {
      throw new Error("Token enum domains cannot contain duplicate values");
    }
    return { kind: "enum", values: [...definition.values] };
  }
  throw new Error(`Unsupported token domain: ${String(definition)}`);
}
export function tokenDomainsEqual(left: TokenDomain, right: TokenDomain): boolean {
  if (left.kind !== right.kind)
    return false;
  if (left.kind === "length" && right.kind === "length")
    return left.allowNegative === right.allowNegative;
  if (left.kind === "enum" && right.kind === "enum") {
    return left.values.length === right.values.length &&
      [...left.values].sort().every((value, index) => value === [...right.values].sort()[index]);
  }
  return true;
}
