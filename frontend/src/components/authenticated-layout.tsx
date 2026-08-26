import type { ReactNode } from "react"

import { AppNavigation } from "@/components/app-navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { AuroraBackground } from "@/components/ui/aurora-background"
import { UserMenu } from "@/components/user-menu"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import type { User } from "@/features/auth/api"
import { useShellStore } from "@/features/shell/store"

type AuthenticatedLayoutProps = {
  user: User
  loggingOut: boolean
  onLogout: () => void
  headerTitle?: string
  headerActions?: ReactNode
  mobileHeaderIcon?: ReactNode
  mobileHeaderActions?: ReactNode
  children?: ReactNode
}

export function AuthenticatedLayout({
  user,
  loggingOut,
  onLogout,
  headerTitle,
  headerActions,
  mobileHeaderIcon,
  mobileHeaderActions,
  children,
}: AuthenticatedLayoutProps) {
  const sidebarOpen = useShellStore((state) => state.sidebarOpen)
  const setSidebarOpen = useShellStore((state) => state.setSidebarOpen)

  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
      data-testid="authenticated-workspace"
      className="relative isolate h-svh min-h-0 overflow-hidden bg-muted [--workspace-gap:0.75rem]"
    >
      <AuroraBackground className="hidden md:block" />
      <AppSidebar user={user} loggingOut={loggingOut} onLogout={onLogout} />
      <SidebarInset className="relative z-10 h-svh min-h-0 min-w-0 gap-0 overflow-hidden bg-background md:gap-(--workspace-gap) md:bg-transparent md:py-(--workspace-gap) md:pe-(--workspace-gap) md:ps-0">
        <header
          aria-label="Верхня навігація"
          className="flex h-14 shrink-0 items-center border-b bg-background px-4 transition-[height] ease-linear md:h-16 md:rounded-2xl md:border md:border-surface-border group-has-data-[collapsible=icon]/sidebar-wrapper:md:h-12"
        >
          <h1 className="flex items-center gap-2 text-sm font-semibold md:hidden">
            {mobileHeaderIcon}
            {headerTitle ?? "CareerLens"}
          </h1>
          <SidebarTrigger className="-ms-1 hidden md:inline-flex" />
          {headerTitle && (
            <>
              <Separator
                orientation="vertical"
                className="me-1 hidden data-vertical:h-4 data-vertical:self-center md:block"
              />
              <h1 className="hidden text-sm font-semibold md:block">
                {headerTitle}
              </h1>
            </>
          )}
          <div className="ms-auto hidden items-center gap-2 md:flex">
            {headerActions}
          </div>
          <div className="ms-auto flex items-center gap-2 md:hidden">
            {mobileHeaderActions}
            <UserMenu user={user} loggingOut={loggingOut} onLogout={onLogout} />
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden bg-background md:bg-transparent">
          {children}
        </div>
        <AppNavigation mobile />
      </SidebarInset>
    </SidebarProvider>
  )
}
