import { ApiError, apiGet, apiPost } from "@/lib/api"

export type User = {
  id: number | string
  email: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
}

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    return await apiGet<User>("/me")
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null
    }
    throw error
  }
}

export function logout(): Promise<void> {
  return apiPost("/logout")
}
