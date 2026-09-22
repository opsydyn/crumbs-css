import type {
  NativeConditionBranch,
  NativeConditionInput,
  NativeConditionMatcher,
  NativeConditionSnapshot,
} from "../src/conditions"

const input: NativeConditionInput = {
  platform: "ios",
  width: 390,
  height: 844,
  isRTL: false,
  fontScale: 1,
  reducedMotion: false,
  contrast: "normal",
}

const snapshot: NativeConditionSnapshot = {
  platform: "ios",
  widthBucket: "compact",
  heightBucket: "regular",
  orientation: "portrait",
  direction: "ltr",
  fontScaleBucket: "normal",
  motion: "full",
  contrast: "normal",
}

const branch: NativeConditionBranch<string> = {
  when: {platform: "ios", widthBucket: "compact"},
  value: "compact-ios",
}

const matcher: NativeConditionMatcher = {motion: "reduced"}

void input
void snapshot
void branch
void matcher

// @ts-expect-error Raw dimensions are inputs, never condition matchers.
const invalidMatcher: NativeConditionMatcher = {width: 600}

void invalidMatcher
