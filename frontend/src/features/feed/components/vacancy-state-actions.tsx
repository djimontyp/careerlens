import {
  BookmarkCheck02Icon,
  BookmarkIcon,
  EyeOffIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Toast } from "@base-ui/react/toast"
import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { type Vacancy, updateVacancyState } from "@/features/feed/api"
import { useFeedStateStore } from "@/features/feed/state/store"

const STATE_CHANGE_ERROR_MESSAGE = "Не вдалося оновити стан."

export function VacancyStateActions({
  vacancy,
  onStateChange,
  children,
}: {
  vacancy: Vacancy
  onStateChange?: (state: Partial<Pick<Vacancy, "saved" | "hidden">>) => void
  children?: ReactNode
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
      const next = await updateVacancyState(vacancy.id, { saved: !saved })
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
      const next = await updateVacancyState(vacancy.id, { hidden: !hidden })
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
                const restored = await updateVacancyState(vacancy.id, {
                  hidden: false,
                })
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
    <div className="flex min-w-0 items-center justify-end gap-1">
      <Button
        variant="outline"
        size="icon-sm"
        className={
          saved
            ? "shrink-0 text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
            : "shrink-0"
        }
        aria-label={saved ? "Прибрати зі збережених" : "Зберегти"}
        aria-pressed={saved}
        disabled={pending === "saved"}
        onClick={updateSaved}
      >
        <HugeiconsIcon
          icon={saved ? BookmarkCheck02Icon : BookmarkIcon}
          className={saved ? "fill-current" : undefined}
        />
      </Button>
      {children}
      <Button
        variant="outline"
        size="icon-sm"
        className={
          hidden
            ? "shrink-0 text-destructive hover:text-destructive"
            : "shrink-0"
        }
        aria-label={hidden ? "Повернути вакансію" : "Приховати"}
        aria-pressed={hidden}
        disabled={pending === "hidden"}
        onClick={updateHidden}
      >
        <HugeiconsIcon icon={EyeOffIcon} />
      </Button>
      {failed && (
        <p
          role="alert"
          className="min-w-0 flex-1 truncate text-right text-xs text-destructive"
        >
          {STATE_CHANGE_ERROR_MESSAGE}
        </p>
      )}
    </div>
  )
}
