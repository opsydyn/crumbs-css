import * as Schema from "effect/Schema";
import { NativeLocalStylePlanType } from "../local-vars/model";
export const LocalStylePlanSchema = Schema.Struct({ $$type: Schema.Literal(NativeLocalStylePlanType), version: Schema.Literal(1), primitiveDomain: Schema.Array(Schema.Literals(["view", "text", "image"])).check(Schema.isMinLength(1)), declarations: Schema.Array(Schema.Struct({ property: Schema.NonEmptyString, value: Schema.Unknown })), dependencies: Schema.Struct({ localVars: Schema.Array(Schema.String), tokens: Schema.Array(Schema.String) }) });
export function validateLocalStylePlanSchema(input: unknown): void { Schema.decodeUnknownSync(LocalStylePlanSchema, { onExcessProperty: "error" })(input); }
