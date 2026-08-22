# CareerLens

## Scoped instructions

- `deploy/AGENTS.md` — production container, network, secrets and deployment verification contracts.
- `src/config/settings/AGENTS.md` — Django settings architecture, environment and secret-loading contracts.

Before changing either scope, read its `AGENTS.md`. After the change, re-read it and update instructions made stale by the change.

## Python dependencies

`pyproject.toml` is the dependency source of truth. `uv.lock` is the generated exact resolution.

### Groups

- `[project].dependencies` contains only packages imported or executed by the production application.
- `test` contains only test execution packages such as pytest and its plugins.
- `dev` contains local formatting, linting and type-checking tools and includes `test` through `{ include-group = "test" }`.
- `[project.optional-dependencies]` is only for installable optional product capabilities. Do not use it for development tools.
- `[build-system].requires` is only for packages required to build a distributable package.
- Do not create a new group until it has a real command or deployment consumer.

### Commands

- Add production dependencies with `uv add "package>=lower,<upper"`.
- Add test dependencies with `uv add --group test "package>=lower,<upper"`.
- Add development dependencies with `uv add --dev "package>=lower,<upper"`.
- Change an existing constraint by running the corresponding `uv add` command again.
- Remove dependencies only with `uv remove`, `uv remove --group test` or `uv remove --dev`.
- Never edit dependency arrays or `uv.lock` manually. Tool configuration in `pyproject.toml` is edited directly.
- Group composition such as `{ include-group = "test" }` is configuration and may be edited directly; package entries may not.

### Version policy

- Use a verified lower bound and an upper compatibility bound. The lockfile pins the exact installed version.
- Exact pins require a verified SDK contract, a security response or a documented upstream regression.
- Major upgrades are separate reviewed changes with contract and test verification.

### Change workflow

1. Run `uv add` or `uv remove` with `--no-sync` so uv validates the complete dependency graph and updates `pyproject.toml` plus `uv.lock` without mutating the environment.
2. Review the direct dependency and transitive graph changes.
3. Commit handwritten manifest and tool-configuration changes separately from `uv.lock`.
4. Before the lockfile commit, show `uv tree`, the `uv.lock` checksum and the resolved package diff.
5. Run `uv sync --frozen` for development and CI verification.
6. Run `uv sync --frozen --no-dev` for the production image.

`uv add --frozen` is not the normal dependency workflow because it skips resolution. Use it only for a reviewed manifest-only recovery after an independent successful resolution.

## API contracts

- On API changes, update `openapi.json` via `just api-schema` to keep the schema up to date.
- Every operation must fully describe inputs, types, examples, tags, success and error responses, authentication and relevant headers or cookies. The generated schema must match `openapi.json`.

## Authentication security

- Ninja API is fail-closed: a policy test must allow `auth=None` only for explicitly allowlisted public operations; each user-owned endpoint still requires its own cross-user denial test.
- Deactivating a user must invalidate existing Django sessions on their next request. Authentication backends must never restore inactive users.
- Every endpoint that reads or mutates user-owned data must scope its queryset to `request.user` and include a cross-user denial test. Authentication alone does not prevent BOLA.
- Invite-only access is enforced by WorkOS with public signup disabled. Do not duplicate invitations locally without a product-specific access policy.

## Testing

- For test selection, test plans, coverage matrices or harness review, use `designing-test-strategy` when available.
- Every test must cover a named product, security or regression risk with an observable oracle. Use the lowest level that can prove it; do not repeat the same assertion across layers.
- Backend, API, session, CSRF, security and domain contracts belong in pytest. Rendered component states, interactions and accessibility belong in Storybook/Vitest Browser.
- Use Playwright E2E only for a real SPA-Django boundary that lower levels cannot prove. When selected, apply `playwright-best-practices` to its implementation.
- Keep the real WorkOS redirect and environment flow as an explicit manual smoke check unless a deterministic isolated provider environment exists.
- Add infrastructure, helpers, matrices and coverage targets only for a current risk or demonstrated repetition.
- Scoped rules live in `tests/AGENTS.md` and `frontend/AGENTS.md`.
