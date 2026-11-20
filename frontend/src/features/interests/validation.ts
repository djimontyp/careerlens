import { codePointLength, hasInvisibleCharacters, tokenKey } from "./tokens.ts"

const MAX_TOKENS = 30
const MAX_TOKEN_LENGTH = 50
const MAX_NAME_LENGTH = 100

export type FieldName = "name" | "keywords" | "stop_words" | "sources"
export type Errors = Partial<Record<FieldName, string>>

export const FIELD_NAMES: readonly FieldName[] = [
  "name",
  "keywords",
  "stop_words",
  "sources",
]

export function isFieldName(
  value: string | number | undefined,
): value is FieldName {
  return (
    typeof value === "string" &&
    (FIELD_NAMES as readonly string[]).includes(value)
  )
}

function validateTokens(tokens: string[]): string | undefined {
  if (tokens.length > MAX_TOKENS) return "Не більше 30 слів"
  const invisible = tokens.find(hasInvisibleCharacters)
  if (invisible !== undefined)
    return "Слово містить невидимі або керівні символи"
  const long = tokens.find((token) => codePointLength(token) > MAX_TOKEN_LENGTH)
  if (long !== undefined) return `Слово довше за 50 символів: ${long}`
  const symbol = tokens.find((token) => !/[\p{L}\p{N}]/u.test(token))
  if (symbol !== undefined)
    return `Слово має містити літеру або цифру: ${symbol}`
  return undefined
}

export function validateInterestForm(
  name: string,
  keywords: string[],
  stopWords: string[],
): Errors {
  const errors: Errors = {}
  const trimmedName = name.trim()
  if (hasInvisibleCharacters(trimmedName))
    errors.name = "Назва містить невидимі або керівні символи"
  else if (codePointLength(trimmedName) > MAX_NAME_LENGTH)
    errors.name = "Назва довша за 100 символів"
  errors.keywords =
    keywords.length === 0
      ? "Вкажіть хоча б одне ключове слово"
      : validateTokens(keywords)
  errors.stop_words = validateTokens(stopWords)
  const known = new Set(keywords.map(tokenKey))
  const overlap = stopWords.find((token) => known.has(tokenKey(token)))
  if (overlap !== undefined)
    errors.stop_words = `Слово не може бути водночас ключовим і стоп-словом: ${overlap}`
  for (const field of FIELD_NAMES)
    if (errors[field] === undefined) delete errors[field]
  return errors
}
