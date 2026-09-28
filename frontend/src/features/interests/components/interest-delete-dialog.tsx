import { useEffect, useRef, useState, type RefObject } from "react"

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
import {
  deleteInterest,
  isStaleResponse,
  type Interest,
} from "@/features/interests/api"
import { ApiError } from "@/lib/api"

type FinalFocus = RefObject<HTMLElement | null> | (() => HTMLElement | null)

type InterestDeleteDialogProps = {
  interest: Interest | null
  onOpenChange: (open: boolean) => void
  onDeleted: () => unknown
  onStale: () => unknown
  finalFocus?: FinalFocus
}

export function InterestDeleteDialog({
  interest,
  onOpenChange,
  onDeleted,
  onStale,
  finalFocus,
}: InterestDeleteDialogProps) {
  const [pending, setPending] = useState(false)
  const [failure, setFailure] = useState<"failed" | "gone" | "conflict" | null>(
    null,
  )
  const [focusRequest, setFocusRequest] = useState<{
    id: number
    target: "action" | "cancel"
  } | null>(null)
  const actionRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [displayInterest, setDisplayInterest] = useState<Interest | null>(
    interest,
  )
  if (interest && interest !== displayInterest) setDisplayInterest(interest)

  // The confirm button is disabled while the request runs, which drops focus
  // to the document; put it back on a control once the dialog is enabled.
  useEffect(() => {
    if (!focusRequest) return
    ;(focusRequest.target === "cancel" ? cancelRef : actionRef).current?.focus()
  }, [focusRequest])

  async function handleDelete() {
    if (!interest) return
    setPending(true)
    setFailure(null)
    try {
      await deleteInterest(interest.id)
      // Wait for the list to refresh before closing: the dialog's focus
      // return targets the header create button, and that button's enabled
      // state depends on the reloaded count.
      await onDeleted()
      onOpenChange(false)
    } catch (error) {
      const missing =
        isStaleResponse(error) && (error as ApiError).status === 404
      if (isStaleResponse(error)) {
        setFailure(missing ? "gone" : "conflict")
        await onStale()
      } else {
        setFailure("failed")
      }
      setFocusRequest((current) => ({
        id: (current?.id ?? 0) + 1,
        target: missing ? "cancel" : "action",
      }))
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog
      open={interest !== null}
      onOpenChange={(open) => {
        if (pending) return
        setFailure(null)
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
        {failure && (
          <p role="alert" className="text-sm text-destructive">
            {failure === "gone"
              ? "Інтерес уже видалено або недоступний. Список оновлено."
              : failure === "conflict"
                ? "Інтерес змінився. Список оновлено."
                : "Не вдалося видалити інтерес."}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel ref={cancelRef} disabled={pending}>
            {failure === "gone" ? "Закрити" : "Скасувати"}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            className="bg-destructive! text-white! hover:bg-destructive/90! dark:bg-[oklch(0.55_0.191_22.216)]! dark:hover:bg-[oklch(0.55_0.191_22.216)]/90!"
            ref={actionRef}
            disabled={pending || failure === "gone"}
            onClick={handleDelete}
          >
            Видалити
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
