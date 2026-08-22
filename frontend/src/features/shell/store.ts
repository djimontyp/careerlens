import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export const SHELL_STORAGE_KEY = "careerlens-shell"
const LEGACY_THEME_STORAGE_KEY = "careerlens-theme"

export type Theme = "light" | "dark" | "system"

type ShellState = {
  sidebarOpen: boolean
  theme: Theme
  setSidebarOpen: (sidebarOpen: boolean) => void
  setTheme: (theme: Theme) => void
}

function readLegacyTheme(): Theme {
  try {
    const theme = localStorage.getItem(LEGACY_THEME_STORAGE_KEY)
    return theme === "light" || theme === "dark" || theme === "system"
      ? theme
      : "system"
  } catch {
    return "system"
  }
}

export const useShellStore = create<ShellState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      theme: readLegacyTheme(),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: SHELL_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: ({ sidebarOpen, theme }) => ({ sidebarOpen, theme }),
      migrate: (persisted) => {
        const state = persisted as Partial<ShellState>
        const theme = state.theme

        return {
          ...state,
          theme:
            theme === "light" || theme === "dark" || theme === "system"
              ? theme
              : readLegacyTheme(),
        }
      },
      onRehydrateStorage: () => (state) => {
        try {
          if (state && localStorage.getItem(LEGACY_THEME_STORAGE_KEY)) {
            state.setTheme(state.theme)
            if (localStorage.getItem(SHELL_STORAGE_KEY)) {
              localStorage.removeItem(LEGACY_THEME_STORAGE_KEY)
            }
          }
        } catch {}
      },
      merge: (persisted, current) => {
        const state = persisted as Partial<ShellState> | undefined
        const sidebarOpen = state?.sidebarOpen
        const theme = state?.theme

        return {
          ...current,
          sidebarOpen:
            typeof sidebarOpen === "boolean"
              ? sidebarOpen
              : current.sidebarOpen,
          theme:
            theme === "light" || theme === "dark" || theme === "system"
              ? theme
              : current.theme,
        }
      },
    },
  ),
)
