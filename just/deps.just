# Backend dependency management (uv per AGENTS.md rules)
[group('deps')]
deps-backend-add PKG *args:
    uv add --no-sync "{{ PKG }}" {{ args }}

alias deps-py-add := deps-backend-add

[group('deps')]
deps-backend-add-dev PKG *args:
    uv add --dev --no-sync "{{ PKG }}" {{ args }}

alias deps-py-add-dev := deps-backend-add-dev

[group('deps')]
deps-backend-add-test PKG *args:
    uv add --group test --no-sync "{{ PKG }}" {{ args }}

alias deps-py-add-test := deps-backend-add-test

[group('deps')]
deps-backend-rm PKG *args:
    uv remove --no-sync "{{ PKG }}" {{ args }}

alias deps-py-rm := deps-backend-rm

[group('deps')]
deps-backend-sync:
    uv sync --frozen

alias deps-py-sync := deps-backend-sync

# Frontend dependency management (npm)
[group('deps')]
deps-frontend-add PKG *args:
    cd frontend && npm install {{ PKG }} {{ args }}

alias deps-js-add := deps-frontend-add

[group('deps')]
deps-frontend-add-dev PKG *args:
    cd frontend && npm install -D {{ PKG }} {{ args }}

alias deps-js-add-dev := deps-frontend-add-dev

[group('deps')]
deps-frontend-rm PKG *args:
    cd frontend && npm uninstall {{ PKG }} {{ args }}

alias deps-js-rm := deps-frontend-rm

[group('deps')]
deps-frontend-update:
    cd frontend && npm update

alias deps-js-update := deps-frontend-update

# Inspect dependency trees and check for outdated packages
[group('deps')]
deps-check:
    uv tree
    cd frontend && npm outdated || true
