dev_compose := "bash scripts/dev-compose.sh"

# Start local dev stack with Docker Compose Watch (hot reload & sync)
[group('dev')]
dev *args:
    {{ dev_compose }} up --watch --force-recreate app {{ args }}

# Run Docker Compose Watch for active file sync and dependency rebuilds
[group('dev')]
dev-watch *args:
    {{ dev_compose }} watch {{ args }}

# Stop local dev stack
[group('dev')]
dev-down *args:
    {{ dev_compose }} down {{ args }}

# Apply database migrations in dev stack
[group('dev')]
dev-migrate:
    {{ dev_compose }} run --rm app python src/manage.py migrate --noinput

# Set up an isolated Git worktree environment
[group('worktree')]
worktree-setup:
    bash scripts/worktree-setup.sh

# Remove an isolated Git worktree's Docker resources
[group('worktree')]
worktree-archive:
    bash scripts/worktree-archive.sh
