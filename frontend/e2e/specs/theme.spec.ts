import { expect, test } from "../fixtures"

test.describe("Тема оформлення", () => {
  test("циклічний перемикач змінює тему (system -> light -> dark)", async ({
    loginPage,
  }) => {
    await loginPage.goto()

    // 1. Початковий стан: системна тема
    await expect(loginPage.themeToggle).toHaveAttribute(
      "aria-label",
      "Системна тема",
    )

    // 2. Перший клік: перехід у світлу тему
    await loginPage.toggleTheme()
    await expect(loginPage.themeToggle).toHaveAttribute(
      "aria-label",
      "Світла тема",
    )
    await expect(loginPage.html).not.toHaveClass(/dark/)

    // 3. Другий клік: перехід у темну тему
    await loginPage.toggleTheme()
    await expect(loginPage.themeToggle).toHaveAttribute(
      "aria-label",
      "Темна тема",
    )
    await expect(loginPage.html).toHaveClass(/dark/)
  })
})
