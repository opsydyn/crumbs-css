import * as Schema from "effect/Schema"
import * as Optic from "effect/Optic"

// M1.1 capability probes only: these types are not Crumbs public payload contracts.
const codec: Schema.Codec<number, string, never, never> = Schema.FiniteFromString
const decoded: number = Schema.decodeUnknownSync(codec)("4")
const encoded: string = Schema.encodeSync(codec)(decoded)
// @ts-expect-error Encoding consumes the decoded numeric type.
Schema.encodeSync(codec)("4")
const reveal: Schema.Codec<number, string, never, never> = Schema.revealCodec(Schema.FiniteFromString)
const focus = Optic.id<{ readonly space: { readonly md: number } }>().key("space").key("md")
const value: number = focus.get({ space: { md: 4 } })
// @ts-expect-error Nested focuses retain key safety.
Optic.id<{ readonly space: { readonly md: number } }>().key("space").key("missing")
// @ts-expect-error A number focus cannot accept a string replacement.
focus.replace("4", { space: { md: 4 } })
void [encoded, reveal, value]
