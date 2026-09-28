const INVISIBLE_CHARACTERS = /[\p{Cc}\p{Cf}]/u

export function tokenKey(token: string): string {
  return token.toLowerCase().replaceAll("ß", "ss")
}

export function codePointLength(value: string): number {
  return Array.from(value).length
}

export function hasInvisibleCharacters(value: string): boolean {
  return INVISIBLE_CHARACTERS.test(value)
}

export function parseTokens(text: string): string[] {
  const seen = new Set<string>()
  const tokens: string[] = []
  for (const raw of text.split(/[,\n]/)) {
    const token = raw.normalize("NFC").trim().replace(/\s+/g, " ")
    const key = tokenKey(token)
    if (!token || seen.has(key)) continue
    seen.add(key)
    tokens.push(token)
  }
  return tokens
}

export function joinTokens(tokens: string[]): string {
  return tokens.join(", ")
}
