import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export const SHELL_STORAGE_KEY = "careerlens-shell"

export type Theme = "light" | "dark" | "system"

type ShellState = {
  sidebarOpen: boolean
  theme: Theme
  setSidebarOpen: (sidebarOpen: boolean) => void
  setTheme: (theme: Theme) => void
}

export const useShellStore = create<ShellState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      theme: "system",
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: SHELL_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: ({ sidebarOpen, theme }) => ({ sidebarOpen, theme }),
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
