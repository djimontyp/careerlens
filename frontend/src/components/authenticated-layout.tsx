import type { ReactNode } from "react"

type AuthenticatedLayoutProps = {
  header: ReactNode
  children?: ReactNode
}

export function AuthenticatedLayout({
  header,
  children,
}: AuthenticatedLayoutProps) {
  return (
    <div
      data-testid="authenticated-workspace"
      className="flex h-svh min-h-0 flex-col overflow-hidden bg-muted [--workspace-gap:0.75rem] md:gap-(--workspace-gap) md:p-(--workspace-gap)"
    >
      <header className="flex min-h-14 shrink-0 items-center justify-between border-b bg-background px-4 md:rounded-2xl md:border">
        <span className="font-semibold">CareerLens</span>
        {header}
      </header>
      <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-background md:rounded-2xl md:border">
        {children}
      </main>
    </div>
  )
}
