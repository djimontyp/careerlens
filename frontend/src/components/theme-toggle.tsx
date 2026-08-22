import { ComputerIcon, Moon02Icon, Sun02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useTheme } from "@/hooks/use-theme"

type ThemeToggleProps = {
  menu?: boolean
}

export function ThemeToggle({ menu = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const label =
    theme === "light"
      ? "Світла тема"
      : theme === "dark"
        ? "Темна тема"
        : "Системна тема"
  const icon =
    theme === "light" ? Sun02Icon : theme === "dark" ? Moon02Icon : ComputerIcon
  const cycleTheme = () =>
    setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light")

  if (menu) {
    return (
      <DropdownMenuItem closeOnClick={false} onClick={cycleTheme}>
        <HugeiconsIcon icon={icon} />
        {label}
      </DropdownMenuItem>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            aria-label={label}
            onClick={cycleTheme}
          />
        }
      >
        <HugeiconsIcon icon={icon} className="size-4" />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
