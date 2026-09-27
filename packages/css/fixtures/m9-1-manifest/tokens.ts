import { createTokenContract, defineToken } from "../../src/tokens"

export const tokens = createTokenContract({
  color: {
    surface: defineToken("color"),
    privateSurface: defineToken("color"),
    label: defineToken("color"),
  },
  space: {
    publicSmall: defineToken({ kind: "length" }),
    privateGap: defineToken({ kind: "length" }),
  },
} as const, {
  identity: { owner: "@acme/tokens", name: "manifestFixture", version: 1 },
  visibility: { public: [["color", "surface"], ["color", "label"], ["space", "publicSmall"]] },
})
