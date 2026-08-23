import { useEffect, useState } from "react"
import { Route, Routes } from "react-router-dom"
import { Monocle01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { AuthenticatedLayout } from "@/components/authenticated-layout"
import { Button } from "@/components/ui/button"
import { fetchCurrentUser, logout, type User } from "@/features/auth/api"
import { LoginPage } from "@/features/auth/components/login-page"
import {
  FeedDesktopActions,
  FeedMobileActions,
  FeedWorkspace,
} from "@/features/feed/components/feed-workspace"

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

  if (user === null) {
    return (
      <LoginPage
        authenticationFailed={new URLSearchParams(window.location.search).has(
          "auth_error",
        )}
      />
    )
  }

  return (
    <AuthenticatedLayout
      user={user}
      loggingOut={loggingOut}
      headerTitle="Стрічка"
      headerActions={<FeedDesktopActions />}
      mobileHeaderIcon={<HugeiconsIcon icon={Monocle01Icon} />}
      mobileHeaderActions={<FeedMobileActions />}
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
    >
      <Routes>
        <Route path="/" element={<FeedWorkspace />} />
        <Route path="/feed/detail" element={<FeedWorkspace />} />
      </Routes>
    </AuthenticatedLayout>
  )
}

export default App
