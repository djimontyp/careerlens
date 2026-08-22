import type { ReactNode } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { UserMenu } from "@/components/user-menu"
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
  children?: ReactNode
}

export function AuthenticatedLayout({
  user,
  loggingOut,
  onLogout,
  children,
}: AuthenticatedLayoutProps) {
  const sidebarOpen = useShellStore((state) => state.sidebarOpen)
  const setSidebarOpen = useShellStore((state) => state.setSidebarOpen)

  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
      data-testid="authenticated-workspace"
      className="h-svh min-h-0 overflow-hidden bg-muted [--workspace-gap:0.75rem]"
    >
      <AppSidebar user={user} loggingOut={loggingOut} onLogout={onLogout} />
      <SidebarInset className="h-svh min-h-0 min-w-0 gap-0 overflow-hidden bg-background md:gap-(--workspace-gap) md:bg-muted md:py-(--workspace-gap) md:pe-(--workspace-gap) md:ps-0">
        <header className="flex min-h-14 shrink-0 items-center justify-between border-b bg-background px-4 md:rounded-2xl md:border">
          <span className="font-semibold md:hidden">CareerLens</span>
          <SidebarTrigger className="hidden md:inline-flex" />
          <div className="md:hidden">
            <UserMenu user={user} loggingOut={loggingOut} onLogout={onLogout} />
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-background md:rounded-2xl md:border">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
