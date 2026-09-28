import { useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Edit02Icon,
  MoreHorizontalIcon,
  PauseIcon,
  PlayIcon,
} from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Interest } from "@/features/interests/api"
import { SourceIdentity } from "@/features/vacancies/components/source-identity"

type InterestCardProps = {
  interest: Interest
  onEdit: (trigger: HTMLButtonElement | null) => void
  onToggleActive: (interest: Interest) => Promise<unknown>
  onDelete: (interest: Interest) => void
}

export function InterestCard({
  interest,
  onEdit,
  onToggleActive,
  onDelete,
}: InterestCardProps) {
  const editTriggerRef = useRef<HTMLButtonElement>(null)
  const [pending, setPending] = useState(false)
  const [toggleFailed, setToggleFailed] = useState(false)
  const toggleLabel = interest.is_active ? "Призупинити" : "Відновити"

  async function toggleActive() {
    if (pending) return
    setPending(true)
    setToggleFailed(false)
    try {
      await onToggleActive(interest)
    } catch {
      setToggleFailed(true)
    } finally {
      setPending(false)
    }
  }

  return (
    <li>
      <Card className="gap-5">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 max-w-full items-center gap-2">
            <CardTitle className="min-w-0">
              <h2 className="truncate" title={interest.name}>
                {interest.name}
              </h2>
            </CardTitle>
            {!interest.is_active && (
              <Badge variant="secondary" className="border-foreground/20">
                <HugeiconsIcon
                  icon={PauseIcon}
                  data-icon="inline-start"
                  aria-hidden="true"
                />
                На паузі
              </Badge>
            )}
          </div>
          <CardAction className="flex shrink-0 items-center gap-1 self-end md:self-auto">
            <Button
              variant="ghost"
              className="min-h-11 md:min-h-0"
              aria-label={`${toggleLabel}: ${interest.name}`}
              aria-busy={pending || undefined}
              disabled={pending}
              focusableWhenDisabled
              onClick={toggleActive}
            >
              <HugeiconsIcon icon={interest.is_active ? PauseIcon : PlayIcon} />
              {toggleLabel}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                disabled={pending}
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 md:size-8"
                    ref={editTriggerRef}
                    aria-label={`Дії: ${interest.name}`}
                  />
                }
              >
                <HugeiconsIcon icon={MoreHorizontalIcon} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => onEdit(editTriggerRef.current)}
                  >
                    <HugeiconsIcon icon={Edit02Icon} />
                    Редагувати
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDelete(interest)}
                  >
                    Видалити
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ul
            aria-label="Ключові слова"
            className="flex min-w-0 flex-wrap gap-1.5"
          >
            {interest.keywords.map((keyword) => (
              <li key={keyword} className="max-w-full">
                <Badge
                  variant="outline"
                  className="h-auto max-w-full min-w-0 [overflow-wrap:anywhere] text-wrap whitespace-normal"
                >
                  {keyword}
                </Badge>
              </li>
            ))}
          </ul>
          {interest.stop_words.length > 0 && (
            <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
              Не включати: {interest.stop_words.join(", ")}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 border-t pt-4 text-sm text-muted-foreground">
            {interest.sources.length ? (
              <ul
                aria-label="Джерела"
                className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground"
              >
                {interest.sources.map((source) => (
                  <li key={source.code} className="min-w-0 max-w-full">
                    <SourceIdentity source={source} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Усі джерела</p>
            )}
          </div>
          {toggleFailed && <p role="alert">Не вдалося оновити інтерес.</p>}
        </CardContent>
      </Card>
    </li>
  )
}
