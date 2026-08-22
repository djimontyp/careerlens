import type { Locator, Page } from "@playwright/test"
import { BasePage } from "./base.page"

export class LoginPage extends BasePage {
  readonly heading: Locator
  readonly subtitle: Locator
  readonly inviteBadge: Locator
  readonly loginButton: Locator

  constructor(page: Page) {
    super(page)
    this.heading = page.getByRole("heading", { name: "CareerLens" })
    this.subtitle = page.getByText("Єдина стрічка вакансій")
    this.inviteBadge = page.getByText("Доступ тільки за запрошенням")
    this.loginButton = page.getByRole("button", { name: "Увійти в акаунт" })
  }

  async goto(options?: { mockUnauthenticated?: boolean }) {
    if (options?.mockUnauthenticated ?? true) {
      await this.page.route("**/api/**/me", async (route) => {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Unauthorized" }),
        })
      })
    }
    await this.page.goto("/")
  }

  async clickLogin() {
    await this.loginButton.click()
  }
}
