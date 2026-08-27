import { Calendar03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useRef } from "react"

import { Button } from "@/components/ui/button"
import { formatPublicationDate } from "@/features/vacancies/presentation"

type FeedDateJumpProps = {
  visibleDate: string | null | undefined
  onJump: (date: string) => void
}

export function FeedDateJump({ visibleDate, onJump }: FeedDateJumpProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="max-w-32 text-foreground"
        aria-label="Перейти до дати"
        onClick={() => inputRef.current?.showPicker()}
      >
        <HugeiconsIcon icon={Calendar03Icon} />
        <span className="truncate">
          {visibleDate === undefined
            ? "Дата"
            : formatPublicationDate(visibleDate)}
        </span>
      </Button>
      <input
        ref={inputRef}
        type="date"
        aria-label="Вибрана дата"
        className="sr-only"
        onChange={(event) => {
          if (event.target.value) onJump(event.target.value)
          event.target.value = ""
        }}
      />
    </>
  )
}
