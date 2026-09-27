import { createTokenContract, defineToken } from "../../src/tokens"

export const supplementalTokens = createTokenContract({
  border: {
    subtle: defineToken("color"),
  },
} as const, {
  identity: { owner: "@acme/tokens", name: "manifestFixtureSupplement", version: 1 },
  visibility: { public: [["border", "subtle"]] },
})
