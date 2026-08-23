import type { DraggableSyntheticListeners } from "@dnd-kit/core"
import { useSortable } from "@dnd-kit/sortable"
import { DragDropVerticalIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { CSSProperties, ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type SortablePanelProps = {
  id: string
  style: CSSProperties
  disabled?: boolean
  children: (handle: ReactNode) => ReactNode
}

export function SortablePanel({
  id,
  style,
  disabled,
  children,
}: SortablePanelProps) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled })

  return (
    <div
      ref={setNodeRef}
      className={cn("min-h-0 shrink-0", isDragging && "z-20 opacity-60")}
      style={{
        ...style,
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        transition,
      }}
    >
      {children(
        disabled ? null : (
          <DragHandle
            id={id}
            attributes={attributes}
            listeners={listeners}
            setActivatorNodeRef={setActivatorNodeRef}
          />
        ),
      )}
    </div>
  )
}

type DragHandleProps = {
  id: string
  attributes: ReturnType<typeof useSortable>["attributes"]
  listeners: DraggableSyntheticListeners
  setActivatorNodeRef: (element: HTMLElement | null) => void
}

function DragHandle({
  id,
  attributes,
  listeners,
  setActivatorNodeRef,
}: DragHandleProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            ref={setActivatorNodeRef}
            variant="ghost"
            size="icon-sm"
            aria-label={`Перетягнути панель ${id}`}
            {...attributes}
            {...listeners}
          />
        }
      >
        <HugeiconsIcon icon={DragDropVerticalIcon} />
      </TooltipTrigger>
      <TooltipContent>Змінити порядок</TooltipContent>
    </Tooltip>
  )
}
