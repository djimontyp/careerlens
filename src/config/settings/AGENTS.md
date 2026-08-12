# Django settings

- `AppSettings` is the only `BaseSettings` and the only process-environment reader.
- Nested domains inherit from `SettingsModel` and remain immutable.
- Use canonical `APP__*` names with `__` between every nested level.
- Secrets use `SecretStr`; validation errors name canonical variables without values.
- `APP__…_FILE` is valid only for secret fields and points to a Docker secret file; do not export its content back into process environment.
- Derived and normalized values belong to typed models.
- `django.py` only maps prepared values explicitly to uppercase Django settings.
- Do not use dynamic exports, compatibility aliases, dotenv paths, container detection, or import-time I/O.
- Package `__init__.py` files remain markers without initialization or side effects.
- Settings tests cover real production invariants and bridge behavior, not Pydantic or Django internals.
