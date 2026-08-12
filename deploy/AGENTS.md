# Deployment

These rules apply to every file in `deploy/`.

## Scope

- `docker/app.Dockerfile` builds the application image.
- `compose/production.yml` runs the production application and PostgreSQL stack.
- Production Compose contains only `app` and `db`.

## Image and runtime

- Production images target `linux/amd64` and use an immutable digest.
- Production Compose must not use `build:` or a mutable image tag.
- The app is published only on host loopback. PostgreSQL has no host port.
- Keep the app non-root and its root filesystem read-only. Writable paths must be explicit tmpfs or volumes.
- Retain `cap_drop: [ALL]`, `no-new-privileges`, `init`, health checks, restart policy, log rotation and resource limits.
- Resource limits in Compose are production contracts and remain covered by container verification.

## Secrets

- Never place production values in Git, `.env` files, Dockerfile `ARG` or `ENV`, image labels, build cache, artifacts or logs.
- Use Compose secrets mounted under `/run/secrets/`. Containers receive only `*_FILE` pointers, never secret values in their environment.
- `CAREERLENS_SECRETS_DIR` is a unique release directory in host tmpfs `/run`, not a repository path. It remains while the stack runs and is removed only after `docker compose down`.
- Secret files are mode `0400` and readable only by the consuming container user.
- Do not enable shell tracing. Do not run `docker compose config` to stdout with production inputs; `docker compose config --quiet` is allowed.

## Verification

- Run `just container-test` after every change to this directory. It must prove the app and database are healthy, loopback-only, non-root, read-only, capability-restricted and free of raw secret values in `docker inspect`.
- Run the repository quality and publication gates after deployment changes.
