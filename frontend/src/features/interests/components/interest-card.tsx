import { useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { MoreHorizontalIcon } from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Interest } from "@/features/interests/api"

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
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [pending, setPending] = useState(false)
  const [toggleFailed, setToggleFailed] = useState(false)

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
      <Card className="gap-3 p-4">
        <div className="flex items-start gap-2">
          <h2 className="min-w-0 flex-1 truncate text-base font-semibold">
            {interest.name}
          </h2>
          {!interest.is_active && <Badge variant="secondary">На паузі</Badge>}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  ref={triggerRef}
                  variant="ghost"
                  size="icon"
                  className="size-[44px] md:size-8"
                  aria-label={`Дії: ${interest.name}`}
                  aria-disabled={pending || undefined}
                />
              }
            >
              <HugeiconsIcon icon={MoreHorizontalIcon} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(triggerRef.current)}>
                Редагувати
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleActive}>
                {interest.is_active ? "Призупинити" : "Відновити"}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(interest)}
              >
                Видалити
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <ul aria-label="Ключові слова" className="flex flex-wrap gap-1">
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
            Стоп-слова: {interest.stop_words.join(", ")}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          {interest.sources.length
            ? `Джерела: ${interest.sources.map((source) => source.name).join(", ")}`
            : "Усі джерела"}
        </p>
        {toggleFailed && <p role="alert">Не вдалося оновити інтерес.</p>}
      </Card>
    </li>
  )
}
