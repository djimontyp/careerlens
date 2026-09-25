import assert from "node:assert/strict"
import test from "node:test"

import { joinTokens, parseTokens } from "./tokens.ts"

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
