export function parseTokens(text: string): string[] {
  const seen = new Set<string>()
  const tokens: string[] = []
  for (const raw of text.split(/[,\n]/)) {
    const token = raw.trim().replace(/\s+/g, " ")
    const key = token.toLocaleLowerCase()
    if (!token || seen.has(key)) continue
    seen.add(key)
    tokens.push(token)
  }
  return tokens
}

export function joinTokens(tokens: string[]): string {
  return tokens.join(", ")
}
