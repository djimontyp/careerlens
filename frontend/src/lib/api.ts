const BASE = "/api/v1"

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

function csrfToken(): string {
  return document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)?.[1] ?? ""
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  headers.set("Accept", "application/json")

  const response = await fetch(`${BASE}/${path.replace(/^\//, "")}`, {
    ...init,
    credentials: "same-origin",
    headers,
  })

  if (!response.ok) {
    throw new ApiError(
      response.status,
      `${response.status} ${response.statusText}`,
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, init)
}

export function apiPost<T = void>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers)
  const token = csrfToken()
  if (token) {
    headers.set("X-CSRFToken", decodeURIComponent(token))
  }
  return request<T>(path, {
    ...init,
    method: "POST",
    headers,
  })
}

export function apiPatchJson<T, B>(path: string, body: B): Promise<T> {
  const headers = new Headers({ "Content-Type": "application/json" })
  const token = csrfToken()
  if (token) {
    headers.set("X-CSRFToken", decodeURIComponent(token))
  }
  return request<T>(path, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  })
}
