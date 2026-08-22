# Frontend tests

- Storybook stories are the canonical source for component states, user interactions, responsive behavior and accessibility. Run them with Storybook/Vitest Browser; Playwright is the browser provider, not a second test source. Treat an accessibility violation as a failing test.
- Stub only the API boundary and keep method, path, status, headers and body aligned with `openapi.json` and the real Django contract.
- Use semantic roles, labels and visible names. Wait for observable states; fixed sleeps and timeout inflation are forbidden.
- Keep Playwright Test specs for application flows that cross the SPA-Django boundary; do not duplicate Storybook component, theme or accessibility assertions there.
- Keep Playwright UI available for interactive development, locator inspection, browser manipulation and debugging; using the tool does not make a mocked browser check integration evidence.
- Do not automate real WorkOS credentials or provider redirects in CI. Verify that path with the explicit release smoke check.
- Add page objects, shared fixtures, browser projects or retained artifacts only when current repetition or diagnosis requires them.
- Run Storybook tests with `npx vitest --project=storybook`; run selected E2E with `npm run test:e2e -- <path-or-grep>`.
