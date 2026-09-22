import {
  createNativeNormalizeValueFn,
  NATIVE_RESPONSIVE_CONDITION_NAMES,
  type NativeConditionalRecord,
  type NativeConditionalValue,
} from "../src/conditions"

const normalize = createNativeNormalizeValueFn(NATIVE_RESPONSIVE_CONDITION_NAMES)

const scalar: NativeConditionalValue<number, typeof NATIVE_RESPONSIVE_CONDITION_NAMES> = 8
const tuple: NativeConditionalValue<number, typeof NATIVE_RESPONSIVE_CONDITION_NAMES> = [
  8,
  12,
  16,
  24,
]
const record: NativeConditionalValue<number, typeof NATIVE_RESPONSIVE_CONDITION_NAMES> = {
  default: 8,
  expanded: 24,
}

void normalize(scalar)
void normalize(tuple)
void normalize(record)

const invalidRecord: NativeConditionalRecord<
  number,
  typeof NATIVE_RESPONSIVE_CONDITION_NAMES
> = {
  // @ts-expect-error Condition names are finite and configured, not arbitrary strings.
  tablet: 16,
}

void invalidRecord
