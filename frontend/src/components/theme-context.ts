import { createContext } from "react"

import type { Theme } from "@/features/shell/store"

export type { Theme } from "@/features/shell/store"
export type ThemeContextValue = { theme: Theme; setTheme: (t: Theme) => void }

export const ThemeContext = createContext<ThemeContextValue | null>(null)
