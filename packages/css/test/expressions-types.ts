import {
  createNativeExpressionAdd,
  createNativeExpressionAlias,
  createNativeExpressionConditionReference,
  createNativeExpressionDomain,
  createNativeExpressionLiteral,
  createNativeExpressionMatch,
  createNativeExpressionScale,
  type NativeExpression,
} from "../src/expressions"

const lengthDomain = createNativeExpressionDomain({
  kind: "length",
  unit: "px",
  allowNegative: false,
})
const durationDomain = createNativeExpressionDomain({
  kind: "duration",
  unit: "ms",
})
const enumDomain = createNativeExpressionDomain({
  kind: "enum",
  values: ["compact", "expanded"],
})

const length = createNativeExpressionLiteral(lengthDomain, 8)
const duration = createNativeExpressionLiteral(durationDomain, 120)
const compact = createNativeExpressionLiteral(lengthDomain, 8)
const expanded = createNativeExpressionLiteral(lengthDomain, 16)
const validEnum = createNativeExpressionLiteral(enumDomain, "compact")

void createNativeExpressionAdd(length, length)
void createNativeExpressionScale(length, 2)
void createNativeExpressionMatch({
  condition: "widthBucket",
  cases: [
    {value: "compact", expression: compact},
    {value: "medium", expression: expanded},
    {value: "expanded", expression: expanded},
  ],
})
void createNativeExpressionConditionReference("contrast")
void createNativeExpressionAlias("contrastValue", createNativeExpressionConditionReference("contrast"))
void validEnum

// @ts-expect-error Arithmetic operands must share the same unit/domain.
void createNativeExpressionAdd(length, duration)
// @ts-expect-error Enum literals are restricted to the declared finite domain.
void createNativeExpressionLiteral(enumDomain, "medium")

const widened: NativeExpression = length
void widened
