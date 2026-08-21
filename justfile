set dotenv-load := false

_default:
    @just --list --unsorted

import 'just/dev.just'

[no-cd]
frontend-dev:
    @cd {{ justfile_directory() }}/frontend && npm run dev -- --host

[no-cd]
frontend-storybook:
    @cd {{ justfile_directory() }}/frontend && npm run storybook -- --no-open

alias storybook := frontend-storybook

# Format Python and frontend code
fmt:
    uv run ruff check --fix .
    uv run ruff format .
    cd frontend && npm run fmt

# Check Python and frontend code formatting and linting
check:
    uv run ruff check .
    uv run ruff format --check .
    cd frontend && npm run lint
    cd frontend && npm run fmt:check

# Export OpenAPI schema of the Ninja API to openapi.json (for Postman import)
api-schema:
    @env \
        APP__ENVIRONMENT=production \
        APP__DJANGO__SECRET_KEY=api-schema-only-secret-key-with-at-least-32-characters \
        APP__DJANGO__ALLOWED_HOSTS='["app.example.invalid"]' \
        APP__CORE__SITE_URL=https://app.example.invalid \
        APP__AUTH__WORKOS__ENABLED=true \
        APP__AUTH__WORKOS__CLIENT_ID=client_api_schema \
        APP__AUTH__WORKOS__API_KEY=sk_api_schema \
        APP__AUTH__WORKOS__REDIRECT_URI=https://app.example.invalid/callback/ \
        APP__DATABASE__DATABASE=careerlens_api_schema \
        APP__DATABASE__USER=careerlens_api_schema \
        APP__DATABASE__PASSWORD=api-schema-only-password \
        APP__DATABASE__HOST=db.invalid \
        PYTHONPATH=src \
        uv run python -c "import django,os,json;os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings.django');django.setup();from api.root import api;open('openapi.json','w').write(json.dumps(api.get_openapi_schema(),indent=2));print('openapi.json updated')"

# Run static type checking with Mypy
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

# Run Django production deployment validation checks
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

# Run test suite with Pytest
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
        APP__DATABASE__HOST="${APP__DATABASE__HOST:-127.0.0.1}" \
        APP__DATABASE__PORT="${APP__DATABASE__PORT:-5432}" \
        uv run pytest {{ args }}

# Verify hardened production container security contracts
container-test:
    bash tests/deploy/verify_container_test.sh
