import type { User } from "@/features/auth/api"

export function userFullName(user: User): string {
  return (
    [user.first_name, user.last_name]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(" ") || user.email
  )
}

export function userInitials(user: User): string {
  const initials = [user.first_name, user.last_name]
    .map((part) => part?.trim().charAt(0))
    .filter(Boolean)
    .join("")

  return (
    initials.toUpperCase() || user.email.trim().charAt(0).toUpperCase() || "?"
  )
}
