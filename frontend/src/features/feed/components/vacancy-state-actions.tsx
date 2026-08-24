import {
  BookmarkCheck02Icon,
  BookmarkIcon,
  EyeOffIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Toast } from "@base-ui/react/toast"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  setVacancyHidden,
  setVacancySaved,
  type Vacancy,
} from "@/features/feed/api"
import { useFeedStateStore } from "@/features/feed/state/store"

export function VacancyStateActions({
  vacancy,
  onStateChange,
}: {
  vacancy: Vacancy
  onStateChange?: (state: Partial<Pick<Vacancy, "saved" | "hidden">>) => void
}) {
  const toast = Toast.useToastManager()
  const override = useFeedStateStore((state) => state.overrides[vacancy.id])
  const confirm = useFeedStateStore((state) => state.confirm)
  const [pending, setPending] = useState<"saved" | "hidden" | null>(null)
  const [failed, setFailed] = useState(false)
  const saved = override?.saved ?? vacancy.saved
  const hidden = override?.hidden ?? vacancy.hidden

  async function updateSaved() {
    setPending("saved")
    setFailed(false)
    try {
      const next = await setVacancySaved(vacancy.id, !saved)
      confirm(vacancy.id, next)
      onStateChange?.(next)
    } catch {
      setFailed(true)
    } finally {
      setPending(null)
    }
  }

  async function updateHidden() {
    setPending("hidden")
    setFailed(false)
    try {
      const next = await setVacancyHidden(vacancy.id, !hidden)
      confirm(vacancy.id, next)
      onStateChange?.(next)
      if (next.hidden) {
        const toastId = toast.add({
          title: "Вакансію приховано",
          timeout: 10_000,
          actionProps: {
            children: "Скасувати",
            onClick: async () => {
              try {
                const restored = await setVacancyHidden(vacancy.id, false)
                confirm(vacancy.id, restored)
                onStateChange?.(restored)
                toast.close(toastId)
              } catch {
                toast.update(toastId, {
                  title: "Не вдалося повернути вакансію",
                  actionProps: undefined,
                })
              }
            },
          },
        })
      }
    } catch {
      setFailed(true)
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={saved ? "Прибрати зі збережених" : "Зберегти"}
        aria-pressed={saved}
        disabled={pending === "saved"}
        onClick={updateSaved}
      >
        <HugeiconsIcon icon={saved ? BookmarkCheck02Icon : BookmarkIcon} />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={hidden ? "Повернути вакансію" : "Приховати"}
        aria-pressed={hidden}
        disabled={pending === "hidden"}
        onClick={updateHidden}
      >
        <HugeiconsIcon icon={EyeOffIcon} />
      </Button>
      {failed && (
        <p role="alert" className="basis-full text-xs text-destructive">
          Не вдалося оновити стан.
        </p>
      )}
    </div>
  )
}
