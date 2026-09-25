import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { InterestCard } from "@/features/interests/components/interest-card"
import { InterestDeleteDialog } from "@/features/interests/components/interest-delete-dialog"
import { InterestFormDialog } from "@/features/interests/components/interest-form-dialog"
import { useInterests } from "@/features/interests/use-interests"
import { updateInterest, type Interest } from "@/features/interests/api"

function isUsableFocusTarget(
  element: HTMLElement | null,
): element is HTMLElement {
  return (
    element !== null &&
    element.isConnected &&
    !(element instanceof HTMLButtonElement && element.disabled)
  )
}

export function InterestsPage() {
  const { status, interests, limit, reload } = useInterests()
  const atLimit = status === "ready" && interests.length >= limit
  const [editing, setEditing] = useState<Interest | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<Interest | null>(null)
  const menuTriggerRef = useRef<HTMLElement | null>(null)
  const createButtonRef = useRef<HTMLButtonElement>(null)
  const counterRef = useRef<HTMLParagraphElement>(null)
  // Tracks whether the form dialog is creating or editing across the whole
  // open/save/reload/close cycle: `editing` itself flips back to `undefined`
  // as soon as we call `onOpenChange(false)`, before the dialog's focus
  // return actually runs, so the return-focus target can't read it.
  const formModeRef = useRef<"create" | "edit">("create")

  function handleEdit(interest: Interest, trigger: HTMLButtonElement | null) {
    formModeRef.current = "edit"
    menuTriggerRef.current = trigger
    setEditing(interest)
  }

  function handleCreate() {
    formModeRef.current = "create"
    setEditing(null)
  }

  function handleToggleActive(interest: Interest) {
    return updateInterest(interest.id, { is_active: !interest.is_active }).then(
      reload,
    )
  }

  // The create button and the menu trigger a create/edit returns focus to
  // can become detached (the empty-state CTA unmounts once the list is no
  // longer empty) or disabled (the header button at the interest limit) by
  // the time the dialog's exit animation finishes. Falling back to the
  // counter keeps focus off <body> either way.
  function formFinalFocus(): HTMLElement | null {
    const target =
      formModeRef.current === "edit"
        ? menuTriggerRef.current
        : createButtonRef.current
    return isUsableFocusTarget(target) ? target : counterRef.current
  }

  function deleteFinalFocus(): HTMLElement | null {
    return isUsableFocusTarget(createButtonRef.current)
      ? createButtonRef.current
      : counterRef.current
  }

  return (
    <div data-slot="interests-page" className="h-full min-h-0 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <p
            ref={counterRef}
            tabIndex={-1}
            className="text-sm text-muted-foreground"
          >
            {status === "ready" ? `${interests.length} із ${limit}` : ""}
          </p>
          {atLimit && (
            <p id="interests-limit" className="text-sm text-muted-foreground">
              Досягнуто ліміт інтересів.
            </p>
          )}
          <Button
            ref={createButtonRef}
            className="ms-auto"
            disabled={status !== "ready" || atLimit}
            aria-describedby={atLimit ? "interests-limit" : undefined}
            onClick={handleCreate}
          >
            Створити інтерес
          </Button>
        </div>
        {status === "failed" ? (
          <div className="space-y-3 py-8 text-center text-sm">
            <p role="alert">Не вдалося завантажити інтереси.</p>
            <Button variant="outline" size="sm" onClick={reload}>
              Повторити
            </Button>
          </div>
        ) : status === "loading" ? (
          <ul
            aria-busy="true"
            aria-label="Завантаження інтересів"
            className="space-y-3"
          >
            {Array.from({ length: 3 }, (_, index) => (
              <li key={index} className="space-y-2 rounded-xl border p-4">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </li>
            ))}
          </ul>
        ) : interests.length === 0 ? (
          <div className="space-y-3 py-12 text-center">
            <h2 className="text-lg font-semibold">Ще немає жодного інтересу</h2>
            <p className="text-sm text-muted-foreground">
              Інтерес — це ключові слова, за якими стрічка відбирає вакансії.
              Додайте перший, і стрічка покаже тільки потрібне.
            </p>
            <Button onClick={handleCreate}>Створити перший інтерес</Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {interests.map((interest) => (
              <InterestCard
                key={interest.id}
                interest={interest}
                onEdit={(trigger) => handleEdit(interest, trigger)}
                onToggleActive={handleToggleActive}
                onDelete={setDeleting}
              />
            ))}
          </ul>
        )}
      </div>
      <InterestFormDialog
        open={editing !== undefined}
        interest={editing ?? null}
        onOpenChange={(open) => !open && setEditing(undefined)}
        onSaved={reload}
        finalFocus={formFinalFocus}
      />
      <InterestDeleteDialog
        interest={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onDeleted={reload}
        finalFocus={deleteFinalFocus}
      />
    </div>
  )
}
