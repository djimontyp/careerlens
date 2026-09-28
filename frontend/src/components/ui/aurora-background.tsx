import { cn } from "@/lib/utils"
import ambientGrain from "@/assets/ambient-grain.png"

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
      <div className="absolute -inset-1/2 bg-[image:var(--ambient-aurora)] bg-[size:180%_180%] opacity-70 blur-3xl" />
      <div
        className="absolute inset-0 bg-[size:64px_64px] bg-repeat opacity-(--ambient-grain-opacity)"
        style={{ backgroundImage: `url(${ambientGrain})` }}
      />
    </div>
  )
}
