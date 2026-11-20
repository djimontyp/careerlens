import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  createInterest,
  fetchSources,
  isStaleResponse,
  overlappingStopWords,
  type Interest,
  type InterestPatch,
  type Source,
  updateInterest,
  validationIssues,
} from "@/features/interests/api"
import { joinTokens, parseTokens } from "@/features/interests/tokens"
import {
  FIELD_NAMES,
  isFieldName,
  validateInterestForm,
  type Errors,
  type FieldName,
} from "@/features/interests/validation"
import { SourceIdentity } from "@/features/vacancies/components/source-identity"
import { ApiError } from "@/lib/api"

function sortedCodes(codes: Iterable<string>): string[] {
  return [...codes].sort()
}

function buildPatch(
  interest: Interest,
  name: string,
  keywords: string[],
  stopWords: string[],
  sourceCodes: string[],
): InterestPatch {
  const patch: InterestPatch = {}
  if (name.trim() !== interest.name) patch.name = name.trim()
  if (JSON.stringify(keywords) !== JSON.stringify(interest.keywords))
    patch.keywords = keywords
  if (JSON.stringify(stopWords) !== JSON.stringify(interest.stop_words))
    patch.stop_words = stopWords
  const existingSources = sortedCodes(
    interest.sources.map((source) => source.code),
  )
  if (
    JSON.stringify(sortedCodes(sourceCodes)) !== JSON.stringify(existingSources)
  ) {
    patch.sources = sourceCodes
  }
  return patch
}

type FinalFocus = RefObject<HTMLElement | null> | (() => HTMLElement | null)

type InterestFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  interest: Interest | null
  onSaved: () => unknown
  onStale: () => Promise<Interest[] | undefined>
  finalFocus?: FinalFocus
}

export function InterestFormDialog({
  open,
  onOpenChange,
  interest,
  onSaved,
  onStale,
  finalFocus,
}: InterestFormDialogProps) {
  const [pending, setPending] = useState(false)
  // Every open starts a new form session over the interest it was opened
  // with. The session outlives `open` so the popup keeps showing (and does
  // not refetch for) the same form during its exit animation, and a reopen
  // during that animation starts from a clean draft instead of the old one.
  const [session, setSession] = useState<{
    id: number
    open: boolean
    interest: Interest | null
  }>({ id: 0, open: false, interest: null })
  if (open && !session.open)
    setSession({ id: session.id + 1, open: true, interest })
  else if (!open && session.open) setSession({ ...session, open: false })

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) onOpenChange(nextOpen)
      }}
    >
      <DialogContent
        finalFocus={finalFocus}
        showCloseButton={false}
        className="flex flex-col overflow-hidden p-0 [@media(max-height:30rem)]:overflow-y-auto"
      >
        {/* Base UI keeps this popup mounted for the exit animation and
            unmounts it afterwards, so the form stays visible (rather than
            collapsing to an empty shell) for as long as the dialog does. */}
        <InterestForm
          key={session.id}
          interest={session.interest}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
          onStale={onStale}
          pending={pending}
          setPending={setPending}
        />
      </DialogContent>
    </Dialog>
  )
}

type InterestFormProps = {
  interest: Interest | null
  onOpenChange: (open: boolean) => void
  onSaved: () => unknown
  onStale: () => Promise<Interest[] | undefined>
  pending: boolean
  setPending: (pending: boolean) => void
}

type FocusTarget = FieldName | "alert" | "submit" | "cancel"

function sameList(left: string[], right: string[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function InterestForm({
  interest,
  onOpenChange,
  onSaved,
  onStale,
  pending,
  setPending,
}: InterestFormProps) {
  const nameId = useId()
  const keywordsId = useId()
  const stopWordsId = useId()
  const sourcesId = useId()
  const ids = useMemo(
    () => ({
      name: nameId,
      keywords: keywordsId,
      stop_words: stopWordsId,
      sources: sourcesId,
    }),
    [nameId, keywordsId, stopWordsId, sourcesId],
  )
  const formRef = useRef<HTMLFormElement>(null)
  const alertRef = useRef<HTMLParagraphElement>(null)
  const submitRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  // The values the draft is compared with: the interest as it was opened,
  // replaced by the server's copy when a save reveals it went stale.
  const [base, setBase] = useState(interest)
  const [gone, setGone] = useState(false)
  const [name, setName] = useState(interest?.name ?? "")
  const [keywordsText, setKeywordsText] = useState(
    interest ? joinTokens(interest.keywords) : "",
  )
  const [stopWordsText, setStopWordsText] = useState(
    interest ? joinTokens(interest.stop_words) : "",
  )
  const [selected, setSelected] = useState<Set<string>>(
    new Set(interest?.sources.map((source) => source.code) ?? []),
  )
  const [sources, setSources] = useState<Source[] | null>(null)
  const [sourcesFailed, setSourcesFailed] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [focusRequest, setFocusRequest] = useState<{
    id: number
    target: FocusTarget
  } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchSources(controller.signal).then(
      (result) => setSources(result),
      () => {
        if (!controller.signal.aborted) {
          setSources([])
          setSourcesFailed(true)
        }
      },
    )
    return () => controller.abort()
  }, [])

  // Failure feedback can sit below the fold of the scrolling field region,
  // and the control that was focused (the submit button) is disabled while
  // the request runs, which drops focus to the document. Focus is therefore
  // placed on the first invalid field or the alert once the form is enabled
  // again.
  useEffect(() => {
    if (!focusRequest) return
    const form = formRef.current
    if (!form) return
    let element: HTMLElement | null | undefined
    if (focusRequest.target === "alert") element = alertRef.current
    else if (focusRequest.target === "submit") element = submitRef.current
    else if (focusRequest.target === "cancel") element = cancelRef.current
    else if (focusRequest.target === "sources")
      element = form.querySelector<HTMLElement>('[role="checkbox"]')
    else element = form.ownerDocument.getElementById(ids[focusRequest.target])
    element ??= alertRef.current ?? submitRef.current
    if (!element) return
    element.focus({ preventScroll: true })
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
    const scrollTarget = element.closest("[data-slot='field']") ?? element
    scrollTarget.scrollIntoView({
      block: "nearest",
      behavior: reducedMotion ? "auto" : "smooth",
    })
  }, [focusRequest, ids])

  function requestFocus(target: FocusTarget) {
    setFocusRequest((current) => ({ id: (current?.id ?? 0) + 1, target }))
  }

  function toggleSource(code: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current)
      if (checked) next.add(code)
      else next.delete(code)
      return next
    })
  }

  function adoptFresh(fresh: Interest) {
    const previous = base
    if (!previous) return
    if (name.trim() === previous.name) setName(fresh.name)
    if (sameList(parseTokens(keywordsText), previous.keywords))
      setKeywordsText(joinTokens(fresh.keywords))
    if (sameList(parseTokens(stopWordsText), previous.stop_words))
      setStopWordsText(joinTokens(fresh.stop_words))
    if (
      sameList(
        sortedCodes(selected),
        sortedCodes(previous.sources.map((source) => source.code)),
      )
    )
      setSelected(new Set(fresh.sources.map((source) => source.code)))
    setBase(fresh)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || gone) return
    const keywords = parseTokens(keywordsText)
    const stopWords = parseTokens(stopWordsText)
    const validationErrors = validateInterestForm(name, keywords, stopWords)
    const invalidField = FIELD_NAMES.find((field) => validationErrors[field])
    if (invalidField) {
      setErrors(validationErrors)
      setFormError(null)
      requestFocus(invalidField)
      return
    }

    setErrors({})
    setFormError(null)
    const sourceCodes = [...selected]
    const patch = base
      ? buildPatch(base, name, keywords, stopWords, sourceCodes)
      : null

    if (patch && Object.keys(patch).length === 0) {
      onOpenChange(false)
      return
    }

    setPending(true)
    try {
      if (base) {
        await updateInterest(base.id, patch!)
      } else {
        await createInterest({
          name: name.trim(),
          keywords,
          stop_words: stopWords,
          sources: sourceCodes,
        })
      }
      // Wait for the list to refresh before closing: the dialog's focus
      // return can target the header create button, and that button's
      // enabled state depends on the reloaded count.
      await onSaved()
      onOpenChange(false)
    } catch (error) {
      let target: FocusTarget = "alert"
      if (isStaleResponse(error)) {
        const status = (error as ApiError).status
        if (status === 404) {
          setGone(true)
          setFormError("Інтерес більше не існує. Список оновлено.")
          target = "cancel"
        } else {
          setFormError(
            base
              ? "Інтерес змінився. Список оновлено."
              : "Досягнуто ліміт інтересів.",
          )
        }
        await onStale()
      } else if (error instanceof ApiError && error.status === 422) {
        const issues = validationIssues(error)
        const overlap = overlappingStopWords(issues)
        const fieldErrors: Errors = {}
        let hasFormError = false
        for (const issue of issues) {
          const field = issue.loc.length >= 3 ? issue.loc[2] : undefined
          if (isFieldName(field)) {
            fieldErrors[field] =
              field === "sources"
                ? "Одне з джерел більше недоступне, оновіть сторінку"
                : "Перевірте це поле"
          } else {
            hasFormError = true
          }
        }
        if (overlap) {
          fieldErrors.stop_words = `Слово не може бути водночас ключовим і стоп-словом: ${overlap}`
          if (base) {
            const list = await onStale()
            const fresh = list?.find((item) => item.id === base.id)
            if (fresh) adoptFresh(fresh)
            else if (list) {
              setGone(true)
              setFormError("Інтерес більше не існує. Список оновлено.")
              target = "cancel"
            }
          }
        }
        setErrors(fieldErrors)
        if (hasFormError || Object.keys(fieldErrors).length === 0) {
          setFormError("Не вдалося зберегти інтерес.")
        }
        const invalid = FIELD_NAMES.find((field) => fieldErrors[field])
        if (invalid && target === "alert") target = invalid
      } else {
        setFormError("Не вдалося зберегти інтерес.")
      }
      requestFocus(target)
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      ref={formRef}
      aria-busy={pending}
      noValidate
      onSubmit={handleSubmit}
      className="flex min-h-0 flex-col [@media(max-height:30rem)]:shrink-0"
    >
      <DialogHeader className="shrink-0 p-4">
        <DialogTitle>
          {interest ? "Редагувати інтерес" : "Новий інтерес"}
        </DialogTitle>
        <DialogDescription>
          Стрічка покаже вакансії, де в назві або описі є хоча б одне ключове
          слово.
        </DialogDescription>
      </DialogHeader>

      <div
        role="region"
        aria-label="Поля інтересу"
        className="min-h-0 flex-1 overflow-y-auto px-4 py-2 [@media(max-height:30rem)]:min-h-auto [@media(max-height:30rem)]:flex-none [@media(max-height:30rem)]:overflow-visible"
      >
        <FieldGroup className="gap-4">
          <Field data-invalid={errors.name ? true : undefined}>
            <FieldLabel htmlFor={ids.name}>Назва</FieldLabel>
            <Input
              id={ids.name}
              disabled={pending}
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={
                errors.name
                  ? `${ids.name}-description ${ids.name}-error`
                  : `${ids.name}-description`
              }
            />
            <FieldDescription id={`${ids.name}-description`}>
              Необов’язково. Без назви візьмемо перші два ключові слова.
            </FieldDescription>
            {errors.name && (
              <FieldError id={`${ids.name}-error`}>{errors.name}</FieldError>
            )}
          </Field>

          <Field data-invalid={errors.keywords ? true : undefined}>
            <FieldLabel htmlFor={ids.keywords}>Ключові слова</FieldLabel>
            <Textarea
              id={ids.keywords}
              disabled={pending}
              placeholder="python, django"
              value={keywordsText}
              onChange={(event) => setKeywordsText(event.target.value)}
              aria-invalid={errors.keywords ? true : undefined}
              aria-describedby={
                errors.keywords
                  ? `${ids.keywords}-description ${ids.keywords}-error`
                  : `${ids.keywords}-description`
              }
            />
            <FieldDescription id={`${ids.keywords}-description`}>
              Через кому. Шукаємо цілі слова без урахування регістру: go не
              знайде Google.
            </FieldDescription>
            {errors.keywords && (
              <FieldError id={`${ids.keywords}-error`}>
                {errors.keywords}
              </FieldError>
            )}
          </Field>

          <Field data-invalid={errors.stop_words ? true : undefined}>
            <FieldLabel htmlFor={ids.stop_words}>Стоп-слова</FieldLabel>
            <Textarea
              id={ids.stop_words}
              disabled={pending}
              placeholder="senior, lead"
              value={stopWordsText}
              onChange={(event) => setStopWordsText(event.target.value)}
              aria-invalid={errors.stop_words ? true : undefined}
              aria-describedby={
                errors.stop_words
                  ? `${ids.stop_words}-description ${ids.stop_words}-error`
                  : `${ids.stop_words}-description`
              }
            />
            <FieldDescription id={`${ids.stop_words}-description`}>
              Через кому. Вакансії з такими словами в назві не показуємо.
            </FieldDescription>
            {errors.stop_words && (
              <FieldError id={`${ids.stop_words}-error`}>
                {errors.stop_words}
              </FieldError>
            )}
          </Field>

          <FieldSet
            aria-describedby={
              errors.sources
                ? `${ids.sources}-description ${ids.sources}-error`
                : `${ids.sources}-description`
            }
            data-invalid={errors.sources ? true : undefined}
          >
            <FieldLegend>Джерела</FieldLegend>
            <FieldDescription id={`${ids.sources}-description`}>
              Нічого не вибрано означає всі джерела.
            </FieldDescription>
            {sourcesFailed ? (
              <p className="text-sm text-destructive">
                Не вдалося завантажити джерела.
              </p>
            ) : sources === null ? null : sources.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Джерела з’являться після першого імпорту вакансій.
              </p>
            ) : (
              <FieldGroup className="grid gap-2 sm:grid-cols-2">
                {sources.map((source) => (
                  <Field key={source.code} orientation="horizontal">
                    <Checkbox
                      id={`${ids.sources}-${source.code}`}
                      value={source.code}
                      disabled={pending}
                      checked={selected.has(source.code)}
                      aria-invalid={errors.sources ? true : undefined}
                      onCheckedChange={(checked) =>
                        toggleSource(source.code, checked === true)
                      }
                    />
                    <FieldLabel htmlFor={`${ids.sources}-${source.code}`}>
                      <SourceIdentity source={source} />
                    </FieldLabel>
                  </Field>
                ))}
              </FieldGroup>
            )}
            {errors.sources && (
              <FieldError id={`${ids.sources}-error`}>
                {errors.sources}
              </FieldError>
            )}
          </FieldSet>
        </FieldGroup>
        {formError && (
          <p
            ref={alertRef}
            role="alert"
            tabIndex={-1}
            className="text-sm text-destructive outline-none"
          >
            {formError}
          </p>
        )}
      </div>
      <DialogFooter className="m-0 shrink-0">
        <Button
          ref={cancelRef}
          variant="outline"
          type="button"
          disabled={pending}
          onClick={() => onOpenChange(false)}
        >
          {gone ? "Закрити" : "Скасувати"}
        </Button>
        <Button ref={submitRef} type="submit" disabled={pending || gone}>
          {interest ? "Зберегти" : "Створити"}
        </Button>
      </DialogFooter>
    </form>
  )
}
