# Backend tests

- Cover CareerLens contracts and regressions, not Django, Ninja, Pydantic, PostgreSQL or stdlib internals.
- Use the real PostgreSQL test database. Each test owns its state and passes independently and in any order.
- Prefer an observable HTTP, persistence or authorization outcome over assertions about calls and implementation details.
- Keep mocks at external boundaries. Before mocking WorkOS, verify the installed public SDK contract and construct SDK values through its public APIs.
- Preserve the authentication invariants: verified identity, canonical subject, no implicit email linking, OAuth state validation, session establishment and CSRF-protected logout.
- Add one focused failing test for the current risk, confirm the failure reason, then implement the minimum passing change.
- Run a focused test with `just test <path-or-node-id>`; before completion run `just test` and the relevant project checks.
