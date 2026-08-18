set dotenv-load := false

_default:
    @just --list --unsorted

fmt:
    uv run ruff check --fix .
    uv run ruff format .

check:
    uv run ruff check .
    uv run ruff format --check .

typecheck:
    env \
        APP__ENVIRONMENT=production \
        APP__DJANGO__SECRET_KEY=typecheck-only-secret-key-with-at-least-32-characters \
        APP__DJANGO__ALLOWED_HOSTS='["app.example.invalid"]' \
        APP__CORE__SITE_URL=https://app.example.invalid \
        APP__AUTH__WORKOS__ENABLED=true \
        APP__AUTH__WORKOS__CLIENT_ID=client_typecheck \
        APP__AUTH__WORKOS__API_KEY=sk_typecheck \
        APP__AUTH__WORKOS__REDIRECT_URI=https://app.example.invalid/callback/ \
        APP__DATABASE__DATABASE=careerlens_typecheck \
        APP__DATABASE__USER=careerlens_typecheck \
        APP__DATABASE__PASSWORD=typecheck-only-password \
        APP__DATABASE__HOST=db.invalid \
        uv run mypy

deploy-check:
    env \
        APP__ENVIRONMENT=production \
        APP__DJANGO__SECRET_KEY=deploy-check-only-secret-G7vQ2mN8xP4rT9kL6sW3cY5hF1jD0bA8uZ \
        APP__DJANGO__ALLOWED_HOSTS='["app.example.invalid"]' \
        APP__CORE__SITE_URL=https://app.example.invalid \
        APP__AUTH__WORKOS__ENABLED=true \
        APP__AUTH__WORKOS__CLIENT_ID=client_deploy_check \
        APP__AUTH__WORKOS__API_KEY=sk_deploy_check \
        APP__AUTH__WORKOS__REDIRECT_URI=https://app.example.invalid/callback/ \
        APP__DATABASE__DATABASE=careerlens_deploy_check \
        APP__DATABASE__USER=careerlens_deploy_check \
        APP__DATABASE__PASSWORD=deploy-check-only-password \
        APP__DATABASE__HOST=db.invalid \
        uv run python src/manage.py check --deploy --fail-level WARNING

test *args:
    env \
        APP__ENVIRONMENT=test \
        APP__DJANGO__SECRET_KEY=test-only-secret-key-with-at-least-32-characters \
        APP__DJANGO__ALLOWED_HOSTS='["testserver"]' \
        APP__AUTH__WORKOS__ENABLED=true \
        APP__AUTH__WORKOS__CLIENT_ID=client_test \
        APP__AUTH__WORKOS__API_KEY=sk_test \
        APP__AUTH__WORKOS__REDIRECT_URI=http://testserver/callback/ \
        APP__DATABASE__DATABASE=careerlens_test \
        APP__DATABASE__USER=careerlens_test \
        APP__DATABASE__PASSWORD=test-only-password \
        APP__DATABASE__HOST=db.invalid \
        uv run pytest {{ args }}

container-test:
    bash tests/deploy/verify_container_test.sh
