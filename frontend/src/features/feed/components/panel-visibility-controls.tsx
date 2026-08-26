import {
  ArrowDown01Icon,
  FileViewIcon,
  Layout03Icon,
  ListViewIcon,
  SlidersHorizontal,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type PanelVisibilityControlsProps = {
  listVisible: boolean
  detailVisible: boolean
  filtersVisible: boolean
  onToggleList: () => void
  onToggleDetail: () => void
  onToggleFilters: () => void
}

export function PanelVisibilityControls({
  listVisible,
  detailVisible,
  filtersVisible,
  onToggleList,
  onToggleDetail,
  onToggleFilters,
}: PanelVisibilityControlsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="hidden lg:inline-flex"
            aria-label="Налаштувати вигляд"
          />
        }
      >
        <HugeiconsIcon
          icon={Layout03Icon}
          data-icon="inline-start"
          aria-hidden="true"
        />
        Вигляд
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          data-icon="inline-end"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-max min-w-(--anchor-width)">
        <DropdownMenuGroup>
          <DropdownMenuCheckboxItem
            className="whitespace-nowrap"
            checked={listVisible}
            disabled={listVisible && !detailVisible}
            onCheckedChange={onToggleList}
          >
            <HugeiconsIcon icon={ListViewIcon} aria-hidden="true" />
            Список вакансій
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            className="whitespace-nowrap"
            checked={detailVisible}
            disabled={detailVisible && !listVisible}
            onCheckedChange={onToggleDetail}
          >
            <HugeiconsIcon icon={FileViewIcon} aria-hidden="true" />
            Деталі вакансії
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            className="whitespace-nowrap"
            checked={filtersVisible}
            onCheckedChange={onToggleFilters}
          >
            <HugeiconsIcon icon={SlidersHorizontal} aria-hidden="true" />
            Фільтри
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
