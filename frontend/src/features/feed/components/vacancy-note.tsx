import { Edit02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import type { VacancyDetail } from "@/features/feed/api"
import { useVacancyNotesStore } from "@/features/feed/state/notes"

const NOTE_MAX = 4096

export function VacancyNote({ vacancy }: { vacancy: VacancyDetail }) {
  const draft = useVacancyNotesStore((state) => state.drafts[vacancy.id])
  const change = useVacancyNotesStore((state) => state.change)
  const flush = useVacancyNotesStore((state) => state.flush)
  const note = draft?.value ?? vacancy.note
  const [editing, setEditing] = useState(
    !note || (draft && draft.status !== "saved"),
  )
  const status =
    draft?.status === "error"
      ? "Не вдалося зберегти нотатку"
      : draft?.status === "pending"
        ? "Зберігаємо…"
        : draft?.status === "saved"
          ? "Збережено"
          : "Зміни зберігаються автоматично"

  useEffect(
    () => () => {
      if (
        useVacancyNotesStore.getState().drafts[vacancy.id]?.status === "pending"
      )
        void flush(vacancy.id)
    },
    [flush, vacancy.id],
  )

  return (
    <section className="flex flex-col gap-2" aria-label="Нотатка">
      <div className="flex items-center justify-between gap-2">
        {editing ? (
          <label
            htmlFor={`note-${vacancy.id}`}
            className="text-sm font-medium text-muted-foreground"
          >
            Нотатка
          </label>
        ) : (
          <h3 className="text-sm font-medium text-muted-foreground">Нотатка</h3>
        )}
        {!editing && note && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setEditing(true)}
            aria-label="Редагувати нотатку"
          >
            <HugeiconsIcon icon={Edit02Icon} />
          </Button>
        )}
      </div>
      {!editing && note ? (
        <p className="whitespace-pre-wrap [overflow-wrap:anywhere] text-sm leading-5">
          {note}
        </p>
      ) : (
        <>
          <textarea
            id={`note-${vacancy.id}`}
            value={note}
            onChange={(event) => change(vacancy.id, event.target.value)}
            placeholder="Додайте нотатку…"
            rows={4}
            maxLength={NOTE_MAX}
            className="max-h-[60vh] resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          {note && (
            <Button
              variant="ghost"
              size="sm"
              className="self-end"
              onClick={() => setEditing(false)}
            >
              Готово
            </Button>
          )}
        </>
      )}
      {(editing ||
        draft?.status === "error" ||
        draft?.status === "pending") && (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {status}
        </p>
      )}
      {draft?.status === "error" && (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => void flush(vacancy.id)}
        >
          Повторити
        </Button>
      )}
    </section>
  )
}
