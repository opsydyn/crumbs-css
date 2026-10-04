import {expect, it} from "bun:test"
import {validateNativeComponentContract} from "../src/components/contracts"

function validateSlots(slots: unknown) {
  return validateNativeComponentContract(
    {
      identity: {owner: "@crumbs/test", name: "ProxyArraySnapshot", version: 1},
      public: {slots, variants: {}},
    },
    {slots: {root: {}}, variants: {}},
    undefined,
    {registerIdentity: false},
  )
}

it("uses one validated own-key snapshot for proxy array descriptors", () => {
  const operations: string[] = []
  const slots = new Proxy(["root"], {
    ownKeys(target) {
      operations.push("ownKeys")
      return Reflect.ownKeys(target)
    },
    getOwnPropertyDescriptor(target, key) {
      operations.push("descriptor:" + String(key))
      return Reflect.getOwnPropertyDescriptor(target, key)
    },
  })

  const normalized = validateSlots(slots)

  expect(normalized.public.slots).toEqual(["root"])
  expect(operations).toEqual(["ownKeys", "ownKeys", "descriptor:0", "descriptor:length"])
})

it("preserves array shape diagnostics and symbol precedence", () => {
  expect(() => validateSlots(new Array(1))).toThrow(/dense enumerable data values/i)

  const extraKey = Object.assign(["root"], {extra: true})
  expect(() => validateSlots(extraKey)).toThrow(/only indexed values/i)

  const decorated = Object.assign(["root"], {extra: true})
  Object.defineProperty(decorated, Symbol("hidden"), {value: true})
  expect(() => validateSlots(decorated)).toThrow(/cannot contain symbol properties/i)
})

it("rejects accessor elements without invoking getters", () => {
  let getterCalls = 0
  const slots: unknown[] = new Array(1)
  Object.defineProperty(slots, "0", {
    configurable: true,
    enumerable: true,
    get() {
      getterCalls += 1
      return "root"
    },
  })

  expect(() => validateSlots(slots)).toThrow(/dense enumerable data values/i)
  expect(getterCalls).toBe(0)
})

it("still inspects proxy length descriptors", () => {
  const descriptorReads: string[] = []
  const slots = new Proxy(["root"], {
    getOwnPropertyDescriptor(target, key) {
      descriptorReads.push(String(key))
      if (key === "length") throw new Error("length descriptor trap")
      return Reflect.getOwnPropertyDescriptor(target, key)
    },
  })

  expect(() => validateSlots(slots)).toThrow("length descriptor trap")
  expect(descriptorReads).toEqual(["0", "length"])
})
