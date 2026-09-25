import { useState, type RefObject } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteInterest, type Interest } from "@/features/interests/api"

type FinalFocus = RefObject<HTMLElement | null> | (() => HTMLElement | null)

type InterestDeleteDialogProps = {
  interest: Interest | null
  onOpenChange: (open: boolean) => void
  onDeleted: () => unknown
  finalFocus?: FinalFocus
}

export function InterestDeleteDialog({
  interest,
  onOpenChange,
  onDeleted,
  finalFocus,
}: InterestDeleteDialogProps) {
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const [displayInterest, setDisplayInterest] = useState<Interest | null>(
    interest,
  )
  if (interest && interest !== displayInterest) setDisplayInterest(interest)

  async function handleDelete() {
    if (!interest) return
    setPending(true)
    setFailed(false)
    try {
      await deleteInterest(interest.id)
      // Wait for the list to refresh before closing: the dialog's focus
      // return targets the header create button, and that button's enabled
      // state depends on the reloaded count.
      await onDeleted()
      onOpenChange(false)
    } catch {
      setFailed(true)
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog
      open={interest !== null}
      onOpenChange={(open) => {
        if (pending) return
        setFailed(false)
        onOpenChange(open)
      }}
    >
      <AlertDialogContent finalFocus={finalFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Видалити «{displayInterest?.name}»?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Інтерес буде видалено назавжди. Збережені вакансії та відгуки
            залишаться.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {failed && (
          <p role="alert" className="text-sm text-destructive">
            Не вдалося видалити інтерес.
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Скасувати</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            className="bg-destructive! text-white! hover:bg-destructive/90! dark:bg-[oklch(0.55_0.191_22.216)]! dark:hover:bg-[oklch(0.55_0.191_22.216)]/90!"
            disabled={pending}
            onClick={handleDelete}
          >
            Видалити
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
