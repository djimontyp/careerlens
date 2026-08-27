import { ArrowDown01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { FeedMode } from "@/features/feed/api"

const MODES: Array<{ value: FeedMode; label: string }> = [
  { value: "active", label: "Активні" },
  { value: "saved", label: "Збережені" },
  { value: "hidden", label: "Приховані" },
]

export function FeedModeControl({
  mode,
  mobile = false,
}: {
  mode: FeedMode
  mobile?: boolean
}) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const label = MODES.find((item) => item.value === mode)!.label

  function select(nextMode: FeedMode) {
    const next = new URLSearchParams(searchParams)
    if (nextMode === "active") next.delete("mode")
    else next.set("mode", nextMode)
    next.delete("vacancy")
    if (pathname === "/feed/detail") navigate(`/feed?${next}`)
    else setSearchParams(next)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className={mobile ? "h-[44px]" : undefined}
            aria-label={`Режим: ${label}`}
          />
        }
      >
        {label}
        <HugeiconsIcon icon={ArrowDown01Icon} aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuGroup>
          {MODES.map((item) => (
            <DropdownMenuItem
              key={item.value}
              onClick={() => select(item.value)}
            >
              <span className="flex-1">{item.label}</span>
              {item.value === mode && (
                <HugeiconsIcon icon={Tick02Icon} aria-hidden="true" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
