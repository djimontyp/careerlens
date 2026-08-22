import {
  BotIcon,
  BriefcaseBusinessIcon,
  Target01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { NavLink, useLocation } from "react-router-dom"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const destinations = [
  { label: "Стрічка", to: "/", icon: BriefcaseBusinessIcon, enabled: true },
  { label: "Інтереси", to: "/interests", icon: Target01Icon, enabled: false },
  { label: "Мій агент", to: "/agent", icon: BotIcon, enabled: false },
] as const

type AppNavigationProps = {
  mobile?: boolean
}

export function AppNavigation({ mobile = false }: AppNavigationProps) {
  const { pathname } = useLocation()

  if (mobile) {
    return (
      <nav
        aria-label="Основна навігація"
        className="grid shrink-0 grid-cols-3 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {destinations.map(({ label, to, icon, enabled }) => {
          const content = (
            <>
              <HugeiconsIcon icon={icon} className="size-5" />
              <span className="text-xs font-medium">{label}</span>
            </>
          )

          return enabled ? (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-muted-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                  isActive && "bg-accent text-accent-foreground",
                )
              }
            >
              {content}
            </NavLink>
          ) : (
            <button
              key={to}
              type="button"
              disabled
              className="flex min-h-14 flex-col items-center justify-center gap-1 text-muted-foreground opacity-50"
            >
              {content}
            </button>
          )
        })}
      </nav>
    )
  }

  return (
    <nav aria-label="Основна навігація">
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu className="gap-2">
            {destinations.map(({ label, to, icon, enabled }) => (
              <SidebarMenuItem key={to}>
                <SidebarMenuButton
                  tooltip={label}
                  isActive={enabled && pathname === to}
                  disabled={!enabled}
                  aria-disabled={!enabled || undefined}
                  tabIndex={enabled ? undefined : -1}
                  render={enabled ? <NavLink to={to} end /> : undefined}
                >
                  <HugeiconsIcon icon={icon} />
                  <span>{label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </nav>
  )
}
