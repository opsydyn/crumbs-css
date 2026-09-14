import {
  createThemeContract,
  imageStyle,
  type NativeRecipeProps,
  type NativeRecipeVariants,
  type NativeStyle,
  recipe,
  style,
  styleVariants,
  textStyle,
  viewStyle,
} from "../src/native-style"
import {
  createRecipeResolver,
  type NativeRecipeResolver,
  resolveRecipeStyle,
} from "../src/theme-runtime"

const vars = createThemeContract({
  color: {
    canvas: null,
    text: null,
  },
  image: {
    size: null,
  },
  space: {
    md: null,
  },
})

const baseStyle = style({ color: "red" })
const composedStyle: NativeStyle = style([baseStyle, [{ color: "blue" }]])
const composedView = viewStyle([viewStyle({ opacity: 0.5 }), [{ opacity: 1 }]] as const)
const composedText = textStyle([textStyle({ color: "red" }), { color: "blue" }])
const composedImage = imageStyle([imageStyle({ resizeMode: "contain" }), { resizeMode: "cover" }])
styleVariants({ active: [baseStyle, { color: "blue" }] })
void [composedStyle, composedView, composedText, composedImage]

// @ts-expect-error Arbitrary browser class names are not native style inputs.
style(["unknown-browser-class"])

// @ts-expect-error Composition must retain view-only inline property checking.
viewStyle([composedView, { fontWeight: "700" }])
// @ts-expect-error Composition must retain text-only inline property checking.
textStyle([composedText, { resizeMode: "cover" }])
// @ts-expect-error Composition must retain image-only inline property checking.
imageStyle([composedImage, { fontWeight: "700" }])

viewStyle({
  backgroundColor: vars.color.canvas,
  flex: 1,
  padding: vars.space.md,
})

textStyle({
  color: vars.color.text,
  fontSize: vars.space.md,
  fontWeight: "700",
})

imageStyle({
  height: vars.image.size,
  resizeMode: "cover",
  tintColor: vars.color.text,
  width: vars.image.size,
})

// @ts-expect-error Text styles must not accept image-only props.
textStyle({ resizeMode: "cover" })

// @ts-expect-error View styles must not accept text-only props.
viewStyle({ fontWeight: "700" })

// @ts-expect-error Image styles must not accept text-only props.
imageStyle({ fontWeight: "700" })

const button = recipe({
  base: {
    backgroundColor: vars.color.canvas,
  },
  compoundVariants: [
    {
      style: {
        opacity: 0.5,
      },
      variants: {
        disabled: true,
        tone: "primary",
      },
    },
  ],
  defaultVariants: {
    disabled: false,
    pressed: false,
    size: "md",
    tone: "primary",
  },
  variants: {
    disabled: {
      false: {},
      true: {
        opacity: 0.6,
      },
    },
    pressed: {
      false: {},
      true: {
        opacity: 0.82,
      },
    },
    size: {
      md: {
        padding: vars.space.md,
      },
      sm: {
        padding: 8,
      },
    },
    tone: {
      danger: {
        backgroundColor: "red",
      },
      primary: {
        backgroundColor: vars.color.canvas,
      },
    },
  },
})

resolveRecipeStyle(button, {
  disabled: false,
  pressed: true,
  size: "sm",
  tone: "danger",
})

type ButtonProps = NativeRecipeProps<typeof button>

const buttonProps = {
  disabled: true,
  pressed: false,
  size: "md",
  tone: "primary",
} satisfies ButtonProps

resolveRecipeStyle(button, buttonProps)

const resolvedButtonStyles: ReadonlyArray<NativeStyle> = resolveRecipeStyle(button, buttonProps)
void resolvedButtonStyles

const resolveButton = createRecipeResolver(button)
const resolvedButtonStylesFromResolver: ReadonlyArray<NativeStyle> = resolveButton(buttonProps)
void resolvedButtonStylesFromResolver

const typedResolveButton: NativeRecipeResolver<NativeRecipeVariants<typeof button>> =
  createRecipeResolver(button)
void typedResolveButton

// @ts-expect-error Recipe selection must use declared tone values.
resolveRecipeStyle(button, { tone: "ghost" })

// @ts-expect-error Recipe resolver selection must use declared tone values.
resolveButton({ tone: "ghost" })

recipe({
  compoundVariants: [
    {
      style: {},
      variants: {
        // @ts-expect-error Compound variants must use declared size values.
        size: "xl",
      },
    },
  ],
  variants: { size: { sm: {}, md: {} } },
})

viewStyle({ transform: [{translateX: 4}, {rotate: '45deg'}, {matrix: [1,0,0,0,0,1,0,0,0,0,1,0,2,3,0,1]}], shadowOffset: {width: 2, height: 3} })
// @ts-expect-error Static compiler inputs must not accept animated transform nodes.
viewStyle({ transform: [{scale: {} as import('react-native').Animated.Value}] })
style({transform: [{scale: 2}], shadowOffset: {width: 1, height: 2}})
styleVariants({active: {transform: [{rotate: '45deg'}], shadowOffset: {width: 1, height: 2}}})
