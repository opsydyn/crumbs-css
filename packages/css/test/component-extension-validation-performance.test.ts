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
