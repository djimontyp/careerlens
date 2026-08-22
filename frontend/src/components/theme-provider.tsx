import { useEffect, useState } from "react"

import { ThemeContext, type Theme } from "@/components/theme-context"
import { SHELL_STORAGE_KEY, useShellStore } from "@/features/shell/store"

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
  const storedTheme = useShellStore((state) => state.theme)
  const setStoredTheme = useShellStore((state) => state.setTheme)
  const [previewTheme, setPreviewTheme] = useState<Theme>(
    defaultTheme ?? "system",
  )
  const theme = defaultTheme === undefined ? storedTheme : previewTheme

  useEffect(() => {
    const syncPreferences = (event: StorageEvent) => {
      if (event.key === SHELL_STORAGE_KEY) {
        void useShellStore.persist.rehydrate()
      }
    }

    window.addEventListener("storage", syncPreferences)
    return () => window.removeEventListener("storage", syncPreferences)
  }, [])

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
      setStoredTheme(theme)
    } else {
      setPreviewTheme(theme)
    }
    onThemeChange?.(theme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: changeTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
