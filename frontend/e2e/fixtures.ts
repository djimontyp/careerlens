import { test as base } from "@playwright/test"
import { AppPage } from "./models/app.page"
import { LoginPage } from "./models/login.page"

type PageObjects = {
  loginPage: LoginPage
  appPage: AppPage
}

export const test = base.extend<PageObjects>({
  loginPage: async ({ page }, provide) => {
    await provide(new LoginPage(page))
  },
  appPage: async ({ page }, provide) => {
    await provide(new AppPage(page))
  },
})

export { expect } from "@playwright/test"
