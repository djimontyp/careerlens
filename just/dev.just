dev_compose := "docker compose --env-file .env -f deploy/compose/dev.yml"

# Start local dev stack with Docker Compose Watch (hot reload & sync)
dev *args:
    {{ dev_compose }} up --watch --force-recreate app {{ args }}

# Run Docker Compose Watch for active file sync and dependency rebuilds
dev-watch *args:
    {{ dev_compose }} watch {{ args }}

# Stop local dev stack
dev-down *args:
    {{ dev_compose }} down {{ args }}

# Apply database migrations in dev stack
dev-migrate:
    {{ dev_compose }} run --rm app python src/manage.py migrate --noinput
