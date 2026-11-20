import assert from "node:assert/strict"
import test from "node:test"

import {
  codePointLength,
  hasInvisibleCharacters,
  joinTokens,
  parseTokens,
  tokenKey,
} from "./tokens.ts"

test("parseTokens splits on commas and newlines, trims, collapses spaces, drops empties", () => {
  assert.deepEqual(parseTokens("python, ,  go  \n data   science,"), [
    "python",
    "go",
    "data science",
  ])
})

test("parseTokens dedupes case-insensitively keeping the first spelling", () => {
  assert.deepEqual(
    parseTokens("Python, python, PYTHON, Розробник, розробник"),
    ["Python", "Розробник"],
  )
})

test("parseTokens of blank text is empty", () => {
  assert.deepEqual(parseTokens("  \n , "), [])
})

test("joinTokens renders the comma-separated form the textarea shows", () => {
  assert.equal(joinTokens(["python", "go"]), "python, go")
})

test("parseTokens matches the server casefold: ß equals ss, case-insensitively", () => {
  assert.deepEqual(parseTokens("Straße, STRASSE, strasse"), ["Straße"])
  assert.equal(tokenKey("STRASSE"), tokenKey("Straße"))
  assert.equal(tokenKey("GROẞ"), tokenKey("gross"))
})

test("tokenKey lowercases independently of the process locale", () => {
  assert.equal(tokenKey("I"), "i")
  assert.deepEqual(parseTokens("I, i"), ["I"])
  assert.equal(tokenKey("İ"), "i̇")
})

test("parseTokens normalises to NFC before comparing", () => {
  const composed = "café"
  const decomposed = "café"
  assert.deepEqual(parseTokens(`${decomposed}, ${composed}`), [composed])
})

test("parseTokens collapses any whitespace run, including tabs", () => {
  assert.deepEqual(parseTokens("data \t  science"), ["data science"])
})

test("codePointLength counts code points, not UTF-16 units", () => {
  assert.equal(codePointLength("😀".repeat(50)), 50)
  assert.equal("😀".repeat(50).length, 100)
  assert.equal(codePointLength(""), 0)
})

test("hasInvisibleCharacters flags control and format characters only", () => {
  assert.equal(hasInvisibleCharacters("py​thon"), true)
  assert.equal(hasInvisibleCharacters("py\u0000thon"), true)
  assert.equal(hasInvisibleCharacters("py‮thon"), true)
  assert.equal(hasInvisibleCharacters("python 3 Розробник 😀"), false)
})
