import {expect, it} from "bun:test"
import {validateNativeComponentRecipeExtensionDescriptor} from "../src/components/extension-contract"
import {
  NativeComponentRecipeExtensionType,
  NativeComponentRecipeExtensionVersion,
} from "../src/native-tags"

function extensionDescriptor(compoundVariants: unknown = []) {
  return {
    $$type: NativeComponentRecipeExtensionType,
    version: NativeComponentRecipeExtensionVersion,
    identity: {owner: "@acme/brand", name: "Brand", version: 1},
    componentIdentity: {owner: "@acme/ui", name: "Button", version: 1},
    defaultVariants: {},
    variants: {},
    compoundVariants,
    slotOverrides: {},
  }
}

it("enumerates extension descriptor records and arrays once for own keys", () => {
  let descriptorOwnKeyScans = 0
  let compoundVariantsOwnKeyScans = 0
  const compoundVariants = new Proxy([], {
    ownKeys(target) {
      compoundVariantsOwnKeyScans += 1
      return Reflect.ownKeys(target)
    },
  })
  const descriptor = new Proxy(extensionDescriptor(compoundVariants), {
    ownKeys(target) {
      descriptorOwnKeyScans += 1
      return Reflect.ownKeys(target)
    },
  })

  expect(() => validateNativeComponentRecipeExtensionDescriptor(descriptor)).not.toThrow()
  expect(descriptorOwnKeyScans).toBe(1)
  // Array validation also asks for property descriptors after validating own keys.
  expect(compoundVariantsOwnKeyScans).toBe(2)
})

it("avoids a duplicate class-reference probe for ordinary descriptor styles", () => {
  let styleOwnKeyScans = 0
  const style = new Proxy({opacity: 0.75}, {
    ownKeys(target) {
      styleOwnKeyScans += 1
      return Reflect.ownKeys(target)
    },
  })
  const descriptor = extensionDescriptor()
  descriptor.slotOverrides = {root: style}

  const normalized = validateNativeComponentRecipeExtensionDescriptor(descriptor)

  expect(styleOwnKeyScans).toBeLessThanOrEqual(2)
  expect(normalized.slotOverrides.root).toEqual({opacity: 0.75})
  expect(Object.isFrozen(normalized.slotOverrides.root)).toBe(true)
})

it("normalizes tagged and untagged class references at descriptor style roots", () => {
  const marker = Symbol.for("crumbs.css.recipe-class-reference")
  const untagged = {$$type: "crumbs.css.class", className: "brandTone"}
  const tagged = Object.defineProperty(
    {$$type: "crumbs.css.class", className: "partnerTone"},
    marker,
    {value: true, enumerable: true},
  )
  const descriptor = extensionDescriptor()
  descriptor.slotOverrides = {root: untagged, label: tagged}

  const normalized = validateNativeComponentRecipeExtensionDescriptor(descriptor)
  const root = normalized.slotOverrides.root
  const label = normalized.slotOverrides.label

  expect(root).toMatchObject({$$type: "crumbs.css.class", className: "brandTone"})
  expect(Object.getOwnPropertyDescriptor(root as object, marker)?.value).toBe(true)
  expect(Object.isFrozen(root)).toBe(true)
  expect(label).toMatchObject({$$type: "crumbs.css.class", className: "partnerTone"})
  expect(Object.getOwnPropertyDescriptor(label as object, marker)?.value).toBe(true)
  expect(Object.isFrozen(label)).toBe(true)
})

it("rejects unsafe nested descriptor styles without invoking accessors", () => {
  let getterCalls = 0
  const accessorStyle = Object.defineProperty({}, "opacity", {
    enumerable: true,
    get() {
      getterCalls += 1
      return 0.5
    },
  })
  const accessorDescriptor = extensionDescriptor()
  accessorDescriptor.slotOverrides = {root: accessorStyle}
  expect(() => validateNativeComponentRecipeExtensionDescriptor(accessorDescriptor))
    .toThrow(/enumerable data property/i)
  expect(getterCalls).toBe(0)

  const symbolDescriptor = extensionDescriptor()
  symbolDescriptor.slotOverrides = {root: {opacity: 0.5, [Symbol("hidden")]: true}}
  expect(() => validateNativeComponentRecipeExtensionDescriptor(symbolDescriptor))
    .toThrow(/cannot contain symbol keys/i)

  const prototypeDescriptor = extensionDescriptor()
  prototypeDescriptor.slotOverrides = {root: Object.assign(Object.create({inherited: true}), {opacity: 0.5})}
  expect(() => validateNativeComponentRecipeExtensionDescriptor(prototypeDescriptor))
    .toThrow(/plain data record/i)

  const cyclicStyle: Record<string, unknown> = {}
  cyclicStyle.self = cyclicStyle
  const cycleDescriptor = extensionDescriptor()
  cycleDescriptor.slotOverrides = {root: cyclicStyle}
  expect(() => validateNativeComponentRecipeExtensionDescriptor(cycleDescriptor))
    .toThrow(/cannot contain a cycle/i)
})

it("continues rejecting symbol-decorated records and arrays without invoking accessors", () => {
  const decoratedRecord = {...extensionDescriptor(), [Symbol("hidden")]: true}
  expect(() => validateNativeComponentRecipeExtensionDescriptor(decoratedRecord))
    .toThrow(/cannot contain symbol keys/i)

  const decoratedArray: unknown[] = []
  Object.defineProperty(decoratedArray, Symbol("hidden"), {value: true})
  expect(() => validateNativeComponentRecipeExtensionDescriptor(extensionDescriptor(decoratedArray)))
    .toThrow(/cannot contain symbol properties/i)

  let getterCalls = 0
  const accessorRecord = Object.defineProperty(extensionDescriptor(), "slotOverrides", {
    enumerable: true,
    get() {
      getterCalls += 1
      return {}
    },
  })
  expect(() => validateNativeComponentRecipeExtensionDescriptor(accessorRecord))
    .toThrow(/enumerable data property/i)
  expect(getterCalls).toBe(0)
})
