import { expect, test } from "../fixtures"

test.describe("Автентифікація", () => {
  test("неавторизований користувач бачить сторінку входу з бейджем запрошення", async ({
    loginPage,
  }) => {
    await loginPage.goto()

    await expect(loginPage.heading).toBeVisible()
    await expect(loginPage.subtitle).toBeVisible()
    await expect(loginPage.inviteBadge).toBeVisible()
    await expect(loginPage.loginButton).toBeVisible()
    await expect(loginPage.loginButton).toHaveAttribute("href", "/login/")
  })
})
