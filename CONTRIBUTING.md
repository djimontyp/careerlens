# Contributing

This repository keeps its working contract in [AGENTS.md](AGENTS.md) and the scoped
instructions it links. These apply to human and assisted changes alike; personal
agent plugins are not prerequisites. Commands live in `justfile`; CI lives in
[ci.yml](.github/workflows/ci.yml). Do not maintain competing checklists.

## Work in an isolated scope

Confirm the branch, existing diff and runtime targets before changing anything.
Preserve unrelated edits. For linked worktrees, `just worktree-setup` creates local
configuration; ports and Compose resources must also be isolated. To run a command
with the example and worktree configuration without reading the owner's `.env`, use
`bash scripts/dev-env.sh --no-owner-env <command>`. Never print environment secrets.

Agree on the intended behavior and significant design decisions, then finish the
approved slice without asking repeatedly about routine fixes. New scope, destructive
actions, live collection and publication require their own authorization. A request
to prepare a release is not a request to commit, push or deploy it.

For restoration work, distinguish committed reference behavior from dirty local
experiments. Record the retained behavior and deliberate differences in a concise
feature document.

## Run checks that prove the change

Use the Python version in `.python-version` and the tool versions declared in CI.
Install locked dependencies with `uv sync --frozen` and `npm ci --prefix frontend`.
For browser tests, run `npx playwright install --with-deps chromium` from `frontend/`.
Story tests start their own browser runtime; a dev server or live provider is not
required.

Start with a focused regression, then run the relevant full gates for delivery:

| Changed boundary | Evidence |
| --- | --- |
| Python, API, auth or persistence | `just test <path-or-node-id>`, then `just test`; `just typecheck` |
| API schema | `just api-schema`; review `openapi.json` and test actual HTTP responses, including changed errors |
| UI state, interaction or accessibility | `just frontend-test`; inspect relevant stories at desktop/mobile sizes |
| Frontend compilation | `npm run build --prefix frontend` |
| Code and delivery configuration | `just check` (includes workflow and Compose validation) |
| Production settings or container contract | `just deploy-check`; `just container-test` |

Backend tests use real PostgreSQL, not the development application database. Provision
the dedicated `careerlens_test` database and role with the test-only credentials in
CI/`justfile`; the role must be able to create the temporary pytest database. Set
`APP__DATABASE__HOST` and `APP__DATABASE__PORT` for that isolated server when needed.
Verification recipes explicitly disable debug and dev-autologin even if the calling
shell enables them. They do not load owner secrets.

CI runs publication checks, code checks, backend tests, frontend unit/browser tests,
the frontend build and deployment/container checks. Real provider login and visual
acceptance remain explicit manual checks, not implied by green automation.

## Keep the harness small and trustworthy

Use pytest for backend contracts and Storybook/Vitest Browser for rendered states.
Add E2E only when a real SPA–Django boundary needs it. Keep mocks at external
boundaries and aligned with real responses. For async mutations, review the affected
timeline across delayed responses, navigation and errors, not just the happy path.

Every added test or rule should name a failure it prevents. Prefer one focused
regression to a new framework or a blanket coverage target. Do not test prose or
mirror configuration text. Documentation-only changes need link/contract review,
not unrelated database and browser suites. Stop when the scoped risk is covered;
broaden checks only for a new finding or the release gate.

Keep public docs portable: no machine-specific paths, private screenshots, credentials,
personal data or local agent configuration. `scripts/verify_publication.sh` checks
tracked-path boundaries and scans content/history for secrets. It intentionally
requires an independent Git checkout, not a linked worktree with a shared object
store; run it on the approved publication checkout or in CI. Do not weaken the guard
to make a worktree pass. Never present an unrun publication check as passed.

A handoff should state what changed, the exact checks and outcomes, and any remaining
manual check or blocker. Separate preparation, commit, push and deployment status.
Store durable behavior in linked feature docs, not repeated transcripts or stale
test totals in `AGENTS.md`.
