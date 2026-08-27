import { cn } from "@/lib/utils"

export function AuroraBackground({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      data-slot="aurora-background"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden bg-muted",
        className,
      )}
      {...props}
    >
      <div className="absolute -inset-1/2 animate-[ambient-aurora_70s_ease-in-out_infinite_alternate] bg-[image:var(--ambient-aurora)] bg-[size:180%_180%] opacity-70 blur-3xl will-change-transform motion-reduce:animate-none" />
    </div>
  )
}
