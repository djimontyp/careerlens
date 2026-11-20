import assert from "node:assert/strict"
import test from "node:test"

import { parseTokens } from "./tokens.ts"
import { validateInterestForm } from "./validation.ts"

function validate(name: string, keywords: string, stopWords = "") {
  return validateInterestForm(
    name,
    parseTokens(keywords),
    parseTokens(stopWords),
  )
}

test("a name of 50 emoji is valid and 101 code points is not", () => {
  assert.deepEqual(validate("😀".repeat(50), "python"), {})
  assert.deepEqual(validate("😀".repeat(100), "python"), {})
  assert.equal(
    validate("😀".repeat(101), "python").name,
    "Назва довша за 100 символів",
  )
})

test("a keyword of 50 astral letters is valid and 51 is rejected", () => {
  assert.deepEqual(validate("", "𝒜".repeat(50)), {})
  assert.match(
    validate("", "𝒜".repeat(51)).keywords ?? "",
    /^Слово довше за 50 символів/,
  )
  assert.match(
    validate("", "python", "𝒜".repeat(51)).stop_words ?? "",
    /^Слово довше за 50 символів/,
  )
})

test("keywords and stop words that differ only by ß/ss overlap", () => {
  assert.match(
    validate("", "Straße", "STRASSE").stop_words ?? "",
    /стоп-словом: STRASSE$/,
  )
})

test("Turkish dotted capital I overlaps its lowercased form", () => {
  assert.match(
    validate("", "İstanbul", "i̇stanbul").stop_words ?? "",
    /стоп-словом/,
  )
})

test("zero-width space in a token is rejected", () => {
  assert.match(validate("", "py​thon").keywords ?? "", /невидим/)
  assert.match(validate("", "python", "se​nior").stop_words ?? "", /невидим/)
})

test("control or format characters in the name are rejected", () => {
  assert.equal(
    validate("Py​thon", "python").name,
    "Назва містить невидимі або керівні символи",
  )
})

test("an empty keyword list and a symbol-only keyword keep their messages", () => {
  assert.equal(validate("", "").keywords, "Вкажіть хоча б одне ключове слово")
  assert.match(validate("", "!!!").keywords ?? "", /літеру або цифру/)
})
