import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
      <main
        role="alert"
        className="grid min-h-svh place-items-center px-4 text-center"
      >
        <div className="space-y-3">
          <p>Не вдалося перевірити сесію.</p>
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
    <main className="grid min-h-svh place-items-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>CareerLens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <Button
            variant="outline"
            disabled={loggingOut}
            onClick={async () => {
              setLoggingOut(true)
              try {
                await logout()
                window.location.reload()
              } catch (error) {
                console.error(error)
                setLoggingOut(false)
              }
            }}
          >
            {loggingOut ? "Вихід…" : "Вийти"}
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

export default App
