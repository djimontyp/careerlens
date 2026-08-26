import { Refresh01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type FeedRefreshButtonProps = {
  refreshing: boolean
  onRefresh: () => void
}

export function FeedRefreshButton({
  refreshing,
  onRefresh,
}: FeedRefreshButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="rounded-full"
      aria-label="Оновити вакансії"
      disabled={refreshing}
      onClick={onRefresh}
    >
      <HugeiconsIcon
        icon={Refresh01Icon}
        className={cn(refreshing && "animate-spin")}
      />
    </Button>
  )
}
