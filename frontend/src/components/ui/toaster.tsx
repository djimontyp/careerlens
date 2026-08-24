import { Toast } from "@base-ui/react/toast"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"

function Toaster() {
  const { toasts } = Toast.useToastManager()

  return (
    <Toast.Portal>
      <Toast.Viewport className="fixed right-4 bottom-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 outline-none">
        {toasts.map((toast) => (
          <Toast.Root
            key={toast.id}
            toast={toast}
            className="rounded-xl border bg-popover text-popover-foreground shadow-md transition duration-200 data-ending:translate-y-2 data-ending:opacity-0 data-starting:translate-y-2 data-starting:opacity-0"
          >
            <Toast.Content className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <Toast.Title className="text-sm font-medium" />
                <Toast.Description className="text-xs text-muted-foreground" />
              </div>
              <Toast.Action render={<Button variant="outline" size="sm" />} />
            </Toast.Content>
          </Toast.Root>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  )
}

export function ToasterProvider({ children }: { children: ReactNode }) {
  return (
    <Toast.Provider limit={1} timeout={10_000}>
      {children}
      <Toaster />
    </Toast.Provider>
  )
}
