import type { Preview } from "@storybook/react-vite"
import { useGlobals } from "storybook/preview-api"

import type { Theme } from "@/components/theme-context"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"

import "@/index.css"

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Тема інтерфейсу",
      defaultValue: "light",
      toolbar: {
        icon: "paintbrush",
        dynamicTitle: true,
        items: [
          { value: "light", title: "Світла" },
          { value: "dark", title: "Темна" },
          { value: "system", title: "Системна" },
        ],
      },
    },
  },
  parameters: {
    viewport: {
      options: {
        mobile: {
          name: "Mobile 390×844",
          styles: { width: "390px", height: "844px" },
          type: "mobile",
        },
        mobileBoundary: {
          name: "Mobile boundary 767×1024",
          styles: { width: "767px", height: "1024px" },
          type: "mobile",
        },
        desktopBoundary: {
          name: "Desktop boundary 768×1024",
          styles: { width: "768px", height: "1024px" },
          type: "tablet",
        },
        compactWorkspace: {
          name: "Compact workspace 1024×800",
          styles: { width: "1024px", height: "800px" },
          type: "desktop",
        },
        desktop: {
          name: "Desktop 1440×900",
          styles: { width: "1440px", height: "900px" },
          type: "desktop",
        },
        ultrawide: {
          name: "Ultrawide 3440×1440",
          styles: { width: "3440px", height: "1440px" },
          type: "desktop",
        },
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "error",
    },
  },
  decorators: [
    (Story) => {
      const [globals, updateGlobals] = useGlobals()
      const theme: Theme =
        globals.theme === "dark" || globals.theme === "system"
          ? globals.theme
          : "light"

      return (
        <ThemeProvider
          key={theme}
          defaultTheme={theme}
          onThemeChange={(theme) => updateGlobals({ theme })}
        >
          <TooltipProvider>
            <Story />
          </TooltipProvider>
        </ThemeProvider>
      )
    },
  ],
}

export default preview
