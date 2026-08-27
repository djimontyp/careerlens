import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

export function WorkspaceHeader({
  className,
  ...props
}: ComponentProps<"header">) {
  return (
    <header
      data-slot="workspace-header"
      className={cn(
        "bg-background/70 backdrop-blur-xl supports-backdrop-filter:bg-background/55",
        className,
      )}
      {...props}
    />
  )
}
