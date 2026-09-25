# Frontend

## State

- Durable UI preferences live in a versioned Zustand store; primitives do not access storage.
- Vacancy note drafts and pending writes belong to the session-scoped feature store, not the Sheet/editor lifecycle. Keep private drafts out of persistent browser storage. Reopening an editor must reuse its pending operation and recover errors.
- Confirmed note/application changes update shared feed metadata. A GET may refresh cached values only if those fields have not changed since the request started.

## UI changes

- Use the existing components and spacing, color and motion tokens. Preserve approved layout decisions; inspect the rendered result in Storybook at relevant desktop and mobile sizes before claiming visual completion.
- Keep reference comparisons and intentional departures in the feature documentation, not only in chat. A screenshot or old implementation is evidence to inspect, not an instruction to copy everything.

## Tests

- Storybook stories are the canonical source for component states, user interactions, responsive behavior and accessibility. Run them with Storybook/Vitest Browser; Playwright is the browser provider, not a second test source. Treat an accessibility violation as a failing test.
- Stub only the API boundary and keep method, path, status, headers and body aligned with `openapi.json` and the real Django contract.
- For changes to async editing, cover the relevant failure timeline: delayed responses, close/reopen, error/retry or stale reads must not lose drafts or overwrite newer values. Test the affected timeline, not a generic matrix on every component.
- Each story owns its mocks and shared state and cleans up pending work. Use registered viewport names and assert the effective size when responsive behavior is the test's premise.
- Use semantic roles, labels and visible names. Wait for observable states; fixed sleeps and timeout inflation are forbidden.
- Keep Playwright Test specs for application flows that cross the SPA-Django boundary; do not duplicate Storybook component, theme or accessibility assertions there.
- Keep Playwright UI available for interactive development, locator inspection, browser manipulation and debugging; using the tool does not make a mocked browser check integration evidence.
- Do not automate real WorkOS credentials or provider redirects in CI. Verify that path with the explicit release smoke check.
- Add page objects, shared fixtures, browser projects or retained artifacts only when current repetition or diagnosis requires them.
- Run Storybook tests with `npx vitest --project=storybook`; run `npm run test:unit` for `node:test` coverage; run selected E2E with `npm run test:e2e -- <path-or-grep>`.

## Forms

- Compose forms from the shadcn `Field` primitives and wire `aria-describedby` and `aria-invalid` on the control by hand; the base-nova `Field` does not do it.
- Map API 422 issues to fields by `loc[2]`; anything without a known field falls back to a form-level `role="alert"` message.
- Client-side token normalisation mirrors the server (`parseTokens` ↔ `normalize_tokens`) and is covered by `node:test`.
- Stories that exercise mutations set the `csrftoken` cookie in `beforeEach` and assert method, path, headers and body.
