import {
  useEffect,
  useId,
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
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  createInterest,
  fetchSources,
  type Interest,
  type InterestPatch,
  type Source,
  updateInterest,
  validationIssues,
} from "@/features/interests/api"
import { joinTokens, parseTokens } from "@/features/interests/tokens"
import { ApiError } from "@/lib/api"

const MAX_TOKENS = 30
const MAX_TOKEN_LENGTH = 50
const MAX_NAME_LENGTH = 100

type FieldName = "name" | "keywords" | "stop_words" | "sources"
type Errors = Partial<Record<FieldName, string>>

const FIELD_NAMES: readonly FieldName[] = [
  "name",
  "keywords",
  "stop_words",
  "sources",
]

function isFieldName(value: string | number | undefined): value is FieldName {
  return (
    typeof value === "string" &&
    (FIELD_NAMES as readonly string[]).includes(value)
  )
}

function validateForm(
  name: string,
  keywords: string[],
  stopWords: string[],
): Errors {
  const errors: Errors = {}
  if (name.trim().length > MAX_NAME_LENGTH)
    errors.name = "Назва довша за 100 символів"
  if (keywords.length === 0)
    errors.keywords = "Вкажіть хоча б одне ключове слово"
  else if (keywords.length > MAX_TOKENS) errors.keywords = "Не більше 30 слів"
  const longKeyword = keywords.find((token) => token.length > MAX_TOKEN_LENGTH)
  if (longKeyword)
    errors.keywords = `Слово довше за 50 символів: ${longKeyword}`
  const symbolKeyword = keywords.find((token) => !/[\p{L}\p{N}]/u.test(token))
  if (symbolKeyword)
    errors.keywords = `Слово має містити літеру або цифру: ${symbolKeyword}`
  if (stopWords.length > MAX_TOKENS) errors.stop_words = "Не більше 30 слів"
  const longStop = stopWords.find((token) => token.length > MAX_TOKEN_LENGTH)
  if (longStop) errors.stop_words = `Слово довше за 50 символів: ${longStop}`
  const symbolStop = stopWords.find((token) => !/[\p{L}\p{N}]/u.test(token))
  if (symbolStop)
    errors.stop_words = `Слово має містити літеру або цифру: ${symbolStop}`
  const known = new Set(keywords.map((token) => token.toLocaleLowerCase()))
  const overlap = stopWords.find((token) =>
    known.has(token.toLocaleLowerCase()),
  )
  if (overlap)
    errors.stop_words = `Слово не може бути водночас ключовим і стоп-словом: ${overlap}`
  return errors
}

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
  finalFocus?: FinalFocus
}

export function InterestFormDialog({
  open,
  onOpenChange,
  interest,
  onSaved,
  finalFocus,
}: InterestFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent finalFocus={finalFocus} showCloseButton={false}>
        {/* Base UI keeps this popup mounted for the exit animation and
            unmounts it afterwards, so the form stays visible (rather than
            collapsing to an empty shell) for as long as the dialog does. */}
        <InterestForm
          key={interest?.id ?? "new"}
          interest={interest}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
        />
      </DialogContent>
    </Dialog>
  )
}

type InterestFormProps = {
  interest: Interest | null
  onOpenChange: (open: boolean) => void
  onSaved: () => unknown
}

function InterestForm({ interest, onOpenChange, onSaved }: InterestFormProps) {
  const ids = {
    name: useId(),
    keywords: useId(),
    stopWords: useId(),
    sources: useId(),
  }

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
  const [pending, setPending] = useState(false)

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

  function toggleSource(code: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current)
      if (checked) next.add(code)
      else next.delete(code)
      return next
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const keywords = parseTokens(keywordsText)
    const stopWords = parseTokens(stopWordsText)
    const validationErrors = validateForm(name, keywords, stopWords)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      setFormError(null)
      return
    }

    setErrors({})
    setFormError(null)
    const sourceCodes = [...selected]
    const patch = interest
      ? buildPatch(interest, name, keywords, stopWords, sourceCodes)
      : null

    if (patch && Object.keys(patch).length === 0) {
      onOpenChange(false)
      return
    }

    setPending(true)
    try {
      if (interest) {
        await updateInterest(interest.id, patch!)
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
      if (error instanceof ApiError && error.status === 409) {
        setFormError("Досягнуто ліміт інтересів.")
      } else if (error instanceof ApiError && error.status === 422) {
        const issues = validationIssues(error)
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
        setErrors(fieldErrors)
        if (hasFormError || Object.keys(fieldErrors).length === 0) {
          setFormError("Не вдалося зберегти інтерес.")
        }
      } else {
        setFormError("Не вдалося зберегти інтерес.")
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      aria-busy={pending}
      noValidate
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
    >
      <DialogHeader>
        <DialogTitle>
          {interest ? "Редагувати інтерес" : "Новий інтерес"}
        </DialogTitle>
        <DialogDescription>
          Стрічка покаже вакансії, де в назві або описі є хоча б одне ключове
          слово.
        </DialogDescription>
      </DialogHeader>

      <Field data-invalid={errors.name ? true : undefined}>
        <FieldLabel htmlFor={ids.name}>Назва</FieldLabel>
        <Input
          id={ids.name}
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
          Через кому. Шукаємо цілі слова без урахування регістру: go не знайде
          Google.
        </FieldDescription>
        {errors.keywords && (
          <FieldError id={`${ids.keywords}-error`}>
            {errors.keywords}
          </FieldError>
        )}
      </Field>

      <Field data-invalid={errors.stop_words ? true : undefined}>
        <FieldLabel htmlFor={ids.stopWords}>Стоп-слова</FieldLabel>
        <Textarea
          id={ids.stopWords}
          placeholder="senior, lead"
          value={stopWordsText}
          onChange={(event) => setStopWordsText(event.target.value)}
          aria-invalid={errors.stop_words ? true : undefined}
          aria-describedby={
            errors.stop_words
              ? `${ids.stopWords}-description ${ids.stopWords}-error`
              : `${ids.stopWords}-description`
          }
        />
        <FieldDescription id={`${ids.stopWords}-description`}>
          Через кому. Вакансії з такими словами в назві не показуємо.
        </FieldDescription>
        {errors.stop_words && (
          <FieldError id={`${ids.stopWords}-error`}>
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
          <ul className="grid gap-2 sm:grid-cols-2">
            {sources.map((source) => (
              <li key={source.code}>
                <Label className="flex items-center gap-2">
                  <Checkbox
                    value={source.code}
                    checked={selected.has(source.code)}
                    aria-invalid={errors.sources ? true : undefined}
                    onCheckedChange={(checked) =>
                      toggleSource(source.code, checked === true)
                    }
                  />
                  {source.name}
                </Label>
              </li>
            ))}
          </ul>
        )}
        {errors.sources && (
          <FieldError id={`${ids.sources}-error`}>{errors.sources}</FieldError>
        )}
      </FieldSet>

      <DialogFooter>
        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}
        <Button
          variant="outline"
          type="button"
          disabled={pending}
          onClick={() => onOpenChange(false)}
        >
          Скасувати
        </Button>
        <Button type="submit" disabled={pending}>
          {interest ? "Зберегти" : "Створити"}
        </Button>
      </DialogFooter>
    </form>
  )
}
