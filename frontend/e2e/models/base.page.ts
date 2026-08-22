import type { Locator, Page } from "@playwright/test"

export class BasePage {
  readonly html: Locator
  readonly themeToggle: Locator

  constructor(public readonly page: Page) {
    this.html = page.locator("html")
    this.themeToggle = page.getByRole("button", { name: /змінити тему|тема/i })
  }

  async isDarkMode(): Promise<boolean> {
    const classAttr = (await this.html.getAttribute("class")) || ""
    return classAttr.includes("dark")
  }

  async toggleTheme() {
    await this.themeToggle.click()
  }
}
