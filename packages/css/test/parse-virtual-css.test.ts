import { describe, expect, it } from "bun:test"
import { parseCssClassRules } from "../src/parse-virtual-css"

describe("parseCssClassRules", () => {
  it("parses a simple class rule", () => {
    const css = `.container__abc123 { flex: 1; background-color: #0a0a0a; }`
    const result = parseCssClassRules(css)
    expect(result.get("container__abc123")).toEqual([
      ["flex", "1"],
      ["background-color", "#0a0a0a"],
    ])
  })

  it("parses multiple class rules", () => {
    const css = `.a__1 { color: red; } .b__2 { font-size: 16px; }`
    const result = parseCssClassRules(css)
    expect(result.size).toBe(2)
    expect(result.get("a__1")).toEqual([["color", "red"]])
    expect(result.get("b__2")).toEqual([["font-size", "16px"]])
  })

  it("skips at-rule blocks", () => {
    const css = `
      .base__1 { color: red; }
      @media (max-width: 768px) { .base__1 { font-size: 14px; } }
    `
    const result = parseCssClassRules(css)
    expect(result.size).toBe(1)
    expect(result.get("base__1")).toEqual([["color", "red"]])
  })

  it("skips @keyframes blocks", () => {
    const css = `
      .btn__1 { color: red; }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    `
    const result = parseCssClassRules(css)
    expect(result.size).toBe(1)
    expect(result.get("btn__1")).toEqual([["color", "red"]])
  })

  it("skips pseudo-class rules", () => {
    const css = `
      .btn__1 { color: red; }
      .btn__1:hover { color: blue; }
      .btn__1::before { content: ""; }
    `
    const result = parseCssClassRules(css)
    expect(result.size).toBe(1)
    expect(result.get("btn__1")).toEqual([["color", "red"]])
  })

  it("merges duplicate class rules", () => {
    const css = `.a__1 { color: red; } .a__1 { font-size: 16px; }`
    const result = parseCssClassRules(css)
    expect(result.get("a__1")).toEqual([
      ["color", "red"],
      ["font-size", "16px"],
    ])
  })

  it("strips CSS comments", () => {
    const css = `/* generated */ .a__1 { color: red; /* inline */ }`
    const result = parseCssClassRules(css)
    expect(result.get("a__1")).toEqual([["color", "red"]])
  })

  it("handles multiline declaration blocks", () => {
    const css = `.title__xyz {\n  color: #c8aa6e;\n  font-size: 24px;\n  font-weight: 700;\n}`
    const result = parseCssClassRules(css)
    expect(result.get("title__xyz")).toEqual([
      ["color", "#c8aa6e"],
      ["font-size", "24px"],
      ["font-weight", "700"],
    ])
  })

  it("handles class names with hyphens and underscores", () => {
    const css = `.my-component_title__abc123 { color: red; }`
    const result = parseCssClassRules(css)
    expect(result.has("my-component_title__abc123")).toBe(true)
  })

  it("returns empty map for empty css", () => {
    expect(parseCssClassRules("").size).toBe(0)
  })

  it("skips @import and @charset at-rules", () => {
    const css = `@charset "UTF-8"; @import "other.css"; .a__1 { color: red; }`
    const result = parseCssClassRules(css)
    expect(result.size).toBe(1)
    expect(result.get("a__1")).toEqual([["color", "red"]])
  })
})
