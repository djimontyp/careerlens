import { Monocle01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { AppNavigation } from "@/components/app-navigation"
import { UserMenu } from "@/components/user-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import type { User } from "@/features/auth/api"

type AppSidebarProps = {
  user: User
  loggingOut: boolean
  onLogout: () => void
}

export function AppSidebar({ user, loggingOut, onLogout }: AppSidebarProps) {
  return (
    <Sidebar
      variant="floating"
      collapsible="icon"
      className="[&_[data-slot=sidebar-inner]]:bg-sidebar/72 [&_[data-slot=sidebar-inner]]:backdrop-blur-xl"
    >
      <SidebarHeader>
        <div className="flex h-12 items-center gap-2 px-2 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <HugeiconsIcon icon={Monocle01Icon} className="size-5 shrink-0" />
          <span className="truncate font-semibold group-data-[collapsible=icon]:hidden">
            CareerLens
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent className="justify-center">
        <AppNavigation />
      </SidebarContent>
      <SidebarFooter>
        <UserMenu
          user={user}
          loggingOut={loggingOut}
          onLogout={onLogout}
          sidebar
        />
      </SidebarFooter>
      <SidebarRail className="right-0! translate-x-1/2! after:inset-y-4" />
    </Sidebar>
  )
}
