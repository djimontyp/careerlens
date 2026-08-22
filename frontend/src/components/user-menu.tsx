import { Logout01Icon, UnfoldMoreIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { ThemeToggle } from "@/components/theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { User } from "@/features/auth/api"
import { userFullName, userInitials } from "@/lib/user-display"

type UserMenuProps = {
  user: User
  loggingOut: boolean
  onLogout: () => void
}

export function UserMenu({ user, loggingOut, onLogout }: UserMenuProps) {
  const name = userFullName(user)
  const initials = userInitials(user)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="h-auto min-w-0 gap-2 px-2 py-1.5"
            aria-label={`Профіль ${name}`}
          />
        }
      >
        <Avatar>
          {user.avatar_url && (
            <AvatarImage src={user.avatar_url} alt={`Аватар ${name}`} />
          )}
          <AvatarFallback className="bg-accent text-accent-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="hidden min-w-0 text-left leading-tight md:grid">
          <span className="truncate text-sm font-medium">{name}</span>
          <span className="truncate text-xs text-foreground">{user.email}</span>
        </span>
        <HugeiconsIcon
          icon={UnfoldMoreIcon}
          data-icon="inline-end"
          className="hidden md:block"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-auto min-w-64" align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex items-center gap-2 py-1">
              <Avatar>
                {user.avatar_url && (
                  <AvatarImage src={user.avatar_url} alt={`Аватар ${name}`} />
                )}
                <AvatarFallback className="bg-accent text-accent-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="grid min-w-0 leading-tight">
                <span className="truncate text-sm font-medium text-foreground">
                  {name}
                </span>
                <span className="truncate text-xs text-foreground">
                  {user.email}
                </span>
              </span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <ThemeToggle menu />
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem disabled={loggingOut} onClick={onLogout}>
            <HugeiconsIcon icon={Logout01Icon} />
            {loggingOut ? "Вихід…" : "Вийти"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
