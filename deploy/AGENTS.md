# Deployment

These rules apply to every file in `deploy/`.

## Scope

- `docker/app.Dockerfile` builds the application image.
- `compose/production.yml` runs the production application and PostgreSQL stack.
- Production Compose runs `app` and `db`; `migrate` is a one-shot service behind the `migration` profile.
- Migration credentials belong only to `db` and `migrate` after runtime role provisioning.
- Runtime overrides use `RUNTIME_DATABASE_USER`, `RUNTIME_DATABASE_PASSWORD` and
  `APP_DATABASE_PASSWORD_ENV=RUNTIME_DATABASE_PASSWORD`; legacy deployments retain their existing credentials.
- `remote_deploy.sh` accepts an optional NUL-delimited suffix: role-split flag, runtime username, runtime password.
- Production workflows use environment variable `RUNTIME_DATABASE_ROLE_SPLIT=true` and secrets
  `APP_RUNTIME_DATABASE_USERNAME` plus `APP_RUNTIME_DATABASE_PASSWORD`.
- After a split-role deployment succeeds, a non-secret server marker refuses later fallback to migration credentials.

## Image and runtime

- Production images target `linux/amd64` and use an immutable digest.
- Production Compose must not use `build:` or a mutable image tag.
- The app is published only on host loopback. PostgreSQL has no host port.
- Keep the app non-root. Compose environment-backed secrets require a writable container root filesystem.
- Retain `cap_drop: [ALL]`, `no-new-privileges`, `init`, health checks, restart policy, log rotation and resource limits.
- Resource limits in Compose are production contracts and remain covered by container verification.

## Secrets

- Never place production values in Git, `.env` files, Dockerfile `ARG` or `ENV`, image labels, build cache, artifacts or logs.
- GitHub Environment `production` is the source of runtime secret values.
- Use Compose secret sources with `environment:` and mount them under `/run/secrets/`. Containers receive only `*_FILE` pointers, never secret values in their environment.
- Deploy through the remote Docker Engine over SSH. Do not create `.env` or persistent secret files on the server.
- Do not enable shell tracing. Do not run `docker compose config` to stdout with production inputs; `docker compose config --quiet` is allowed.

## Verification

- Run `just container-test` after every change to this directory. It must prove the app and database are healthy, loopback-only, non-root, capability-restricted and free of raw secret values in `docker inspect`.
- Run the repository quality and publication gates after deployment changes.
