import type { Locator, Page } from "@playwright/test"
import { BasePage } from "./base.page"

export class AppPage extends BasePage {
  readonly userEmail: Locator
  readonly logoutButton: Locator
  readonly errorAlert: Locator
  readonly retryButton: Locator

  constructor(page: Page) {
    super(page)
    this.userEmail = page.locator("p.text-muted-foreground")
    this.logoutButton = page.getByRole("button", { name: /вийти|вихід/i })
    this.errorAlert = page.getByRole("alert")
    this.retryButton = page.getByRole("button", { name: "Повторити" })
  }

  async goto(options?: {
    user?: {
      id?: number
      email: string
      first_name?: string | null
      last_name?: string | null
    }
  }) {
    const mockUser = options?.user ?? {
      id: 1,
      email: "test@example.com",
      first_name: "Test",
      last_name: "User",
      avatar_url: null,
    }
    await this.page.route("**/api/**/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockUser),
      })
    })
    await this.page.goto("/")
  }

  async clickLogout() {
    await this.logoutButton.click()
  }

  async clickRetry() {
    await this.retryButton.click()
  }
}
