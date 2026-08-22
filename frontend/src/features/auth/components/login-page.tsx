import {
  ArrowRight01Icon,
  LockKeyIcon,
  Monocle01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"

/**
 * CareerLens Login Page.
 * Adapted from shadcnspace Login 01 (Free plan) - https://shadcnspace.com/blocks/marketing/login
 * Simplified for WorkOS OAuth flow with theme-aware layout and invitation notice.
 */
export function LoginPage() {
  return (
    <div className="relative flex min-h-svh w-full flex-col justify-between overflow-hidden bg-background p-4 select-none sm:p-6 md:p-8">
      {/* Decorative background shapes (Login 01 style) */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 size-[500px] rounded-full bg-muted/40 blur-3xl dark:bg-muted/20"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 size-[600px] rounded-full bg-muted/40 blur-3xl dark:bg-muted/15"
        aria-hidden="true"
      />

      {/* Top Controls */}
      <header className="relative z-10 flex w-full items-center justify-end">
        <ThemeToggle />
      </header>

      {/* Center Content */}
      <main className="relative z-10 flex flex-1 items-center justify-center py-6">
        <Card className="w-full max-w-sm flex-col items-center gap-6 p-6 text-center sm:p-8">
          {/* Logo Circle Badge */}
          <div className="flex size-12 items-center justify-center rounded-full bg-foreground text-background dark:bg-muted dark:text-foreground">
            <HugeiconsIcon icon={Monocle01Icon} className="size-6" />
          </div>

          {/* Heading */}
          <div className="flex flex-col gap-1.5">
            <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              CareerLens
            </h1>
            <p className="text-balance text-sm text-muted-foreground">
              Єдина стрічка вакансій та&nbsp;персональний AI-агент
            </p>
          </div>

          {/* Invitation Notice */}
          <Badge
            variant="outline"
            className="gap-1.5 bg-muted/40 font-medium text-foreground"
          >
            <HugeiconsIcon
              icon={LockKeyIcon}
              className="size-3 text-foreground"
            />
            Доступ тільки за запрошенням
          </Badge>

          {/* Sign In Action */}
          <div className="w-full">
            <Button
              size="lg"
              className="w-full gap-2"
              nativeButton={false}
              render={<a href="/login/" />}
            >
              <span>Увійти в акаунт</span>
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
            </Button>
          </div>
        </Card>
      </main>

      {/* Bottom Footer Note */}
      <footer className="relative z-10 py-2 text-center text-xs text-foreground">
        CareerLens
      </footer>
    </div>
  )
}
