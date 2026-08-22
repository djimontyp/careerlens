import { useEffect, useState } from "react"

import {
  THEME_STORAGE_KEY,
  ThemeContext,
  type Theme,
} from "@/components/theme-context"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  onThemeChange?: (theme: Theme) => void
}

export function ThemeProvider({
  children,
  defaultTheme,
  onThemeChange,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (defaultTheme) return defaultTheme

    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY)
      return stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "system"
    } catch {
      return "system"
    }
  })

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const applyTheme = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches)
      document.documentElement.classList.toggle("dark", dark)
      document.documentElement.style.colorScheme = dark ? "dark" : "light"
    }

    applyTheme()
    if (theme === "system") media.addEventListener("change", applyTheme)
    return () => media.removeEventListener("change", applyTheme)
  }, [theme])

  const changeTheme = (theme: Theme) => {
    if (defaultTheme === undefined) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme)
      } catch {}
    }
    setTheme(theme)
    onThemeChange?.(theme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: changeTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
