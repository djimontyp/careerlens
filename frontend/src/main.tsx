import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"

import App from "@/App"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ToasterProvider } from "@/components/ui/toaster"

import "@/index.css"

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <TooltipProvider>
      <ToasterProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ToasterProvider>
    </TooltipProvider>
  </ThemeProvider>,
)
