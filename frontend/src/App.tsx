import { useEffect, useState } from "react"

import { AuthenticatedLayout } from "@/components/authenticated-layout"
import { UserMenu } from "@/components/user-menu"
import { Button } from "@/components/ui/button"
import { fetchCurrentUser, logout, type User } from "@/features/auth/api"
import { LoginPage } from "@/features/auth/components/login-page"

function App() {
  const [user, setUser] = useState<User | null>()
  const [failed, setFailed] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  useEffect(() => {
    fetchCurrentUser().then(setUser, () => setFailed(true))
  }, [])

  if (failed) {
    return (
      <main className="grid min-h-svh place-items-center px-4 text-center">
        <div className="space-y-3">
          <p role="alert">Не вдалося перевірити сесію.</p>
          <Button
            variant="outline"
            onClick={() => {
              setFailed(false)
              setUser(undefined)
              fetchCurrentUser().then(setUser, () => setFailed(true))
            }}
          >
            Повторити
          </Button>
        </div>
      </main>
    )
  }

  if (user === undefined) {
    return (
      <main aria-live="polite" className="grid min-h-svh place-items-center">
        Завантаження…
      </main>
    )
  }

  if (user === null) return <LoginPage />

  return (
    <AuthenticatedLayout
      header={
        <UserMenu
          user={user}
          loggingOut={loggingOut}
          onLogout={async () => {
            setLoggingOut(true)
            try {
              await logout()
              window.location.reload()
            } catch (error) {
              console.error(error)
              setLoggingOut(false)
            }
          }}
        />
      }
    />
  )
}

export default App
