import { useRef, type KeyboardEvent, type PointerEvent } from "react"

type ResizeHandleProps = {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}

export function ResizeHandle({
  label,
  value,
  min,
  max,
  onChange,
}: ResizeHandleProps) {
  const drag = useRef<{ x: number; value: number } | null>(null)
  const clamp = (width: number) => Math.min(Math.max(width, min), max)

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    drag.current = { x: event.clientX, value }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return
    onChange(clamp(drag.current.value + event.clientX - drag.current.x))
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    drag.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const delta =
      event.key === "ArrowRight" ? 10 : event.key === "ArrowLeft" ? -10 : 0
    if (!delta) return
    event.preventDefault()
    onChange(clamp(value + delta * (event.shiftKey ? 4 : 1)))
  }

  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      tabIndex={0}
      className="group relative w-(--workspace-gap) shrink-0 cursor-col-resize touch-none outline-none after:absolute after:inset-y-4 after:left-1/2 after:w-px after:-translate-x-1/2 hover:after:bg-primary focus-visible:after:bg-ring"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => (drag.current = null)}
      onKeyDown={handleKeyDown}
    />
  )
}
