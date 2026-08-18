from copy import deepcopy
from pathlib import Path

import pytest
from pydantic import ValidationError

from accounts.settings import WorkOSAuthSettings
from config.settings.runtime import AppSettings

PRODUCTION_SECRET = "production-secret-key-with-at-least-32-characters"
PRODUCTION_PASSWORD = "production-database-password"

MINIMUM_PRODUCTION = {
    "environment": "production",
    "django": {
        "secret_key": PRODUCTION_SECRET,
        "allowed_hosts": ("app.example.com",),
    },
    "core": {"site_url": "https://app.example.com"},
    "auth": {
        "workos": {
            "enabled": True,
            "client_id": "client_test",
            "api_key": "sk_test",
            "redirect_uri": "https://app.example.com/callback/",
        }
    },
    "database": {
        "database": "careerlens",
        "user": "careerlens",
        "password": PRODUCTION_PASSWORD,
        "host": "db.internal",
    },
}


def test_reads_nested_environment_variables(monkeypatch: pytest.MonkeyPatch) -> None:
    environment = {
        "APP__ENVIRONMENT": "production",
        "APP__DJANGO__SECRET_KEY": PRODUCTION_SECRET,
        "APP__DJANGO__ALLOWED_HOSTS": '["app.example.com"]',
        "APP__CORE__SITE_URL": "https://app.example.com/",
        "APP__AUTH__WORKOS__ENABLED": "true",
        "APP__AUTH__WORKOS__CLIENT_ID": "client_test",
        "APP__AUTH__WORKOS__API_KEY": "sk_test",
        "APP__AUTH__WORKOS__REDIRECT_URI": "https://app.example.com/callback/",
        "APP__DATABASE__DATABASE": "careerlens",
        "APP__DATABASE__USER": "careerlens",
        "APP__DATABASE__PASSWORD": PRODUCTION_PASSWORD,
        "APP__DATABASE__HOST": "db.internal",
        "APP__DATABASE__PORT": "5433",
    }
    for name, value in environment.items():
        monkeypatch.setenv(name, value)

    settings = AppSettings(_env_file=None)

    assert settings.core.site_url_value == "https://app.example.com"
    assert settings.database.port == 5433


def test_reads_secrets_from_files_without_secret_environment_values(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("APP__DJANGO__SECRET_KEY", raising=False)
    monkeypatch.delenv("APP__DATABASE__PASSWORD", raising=False)
    monkeypatch.delenv("APP__AUTH__WORKOS__API_KEY", raising=False)
    django_secret_file = tmp_path / "django_secret_key"
    django_secret_file.write_text(PRODUCTION_SECRET + "\n", encoding="utf-8")
    database_password_file = tmp_path / "database_password"
    database_password_file.write_text(PRODUCTION_PASSWORD + "\n", encoding="utf-8")
    workos_api_key_file = tmp_path / "workos_api_key"
    workos_api_key_file.write_text("sk_test\n", encoding="utf-8")

    environment = {
        "APP__ENVIRONMENT": "production",
        "APP__DJANGO__SECRET_KEY_FILE": str(django_secret_file),
        "APP__DJANGO__ALLOWED_HOSTS": '["app.example.com"]',
        "APP__CORE__SITE_URL": "https://app.example.com/",
        "APP__AUTH__WORKOS__ENABLED": "true",
        "APP__AUTH__WORKOS__CLIENT_ID": "client_test",
        "APP__AUTH__WORKOS__API_KEY_FILE": str(workos_api_key_file),
        "APP__AUTH__WORKOS__REDIRECT_URI": "https://app.example.com/callback/",
        "APP__DATABASE__DATABASE": "careerlens",
        "APP__DATABASE__USER": "careerlens",
        "APP__DATABASE__PASSWORD_FILE": str(database_password_file),
        "APP__DATABASE__HOST": "db.internal",
    }
    for name, value in environment.items():
        monkeypatch.setenv(name, value)

    settings = AppSettings(_env_file=None)

    assert settings.django.secret_key.get_secret_value() == PRODUCTION_SECRET
    assert settings.database.password.get_secret_value() == PRODUCTION_PASSWORD
    assert settings.auth.workos.api_key.get_secret_value() == "sk_test"


@pytest.mark.parametrize(
    ("domain", "field", "value", "expected_variable"),
    (
        ("django", "debug", True, "APP__DJANGO__DEBUG"),
        ("django", "secret_key", "", "APP__DJANGO__SECRET_KEY"),
        ("django", "allowed_hosts", (), "APP__DJANGO__ALLOWED_HOSTS"),
        ("django", "allowed_hosts", ("*",), "APP__DJANGO__ALLOWED_HOSTS"),
        ("core", "site_url", "http://app.example.com", "APP__CORE__SITE_URL"),
    ),
)
def test_rejects_unsafe_production_configuration(
    domain: str,
    field: str,
    value: object,
    expected_variable: str,
) -> None:
    unsafe = deepcopy(MINIMUM_PRODUCTION)
    unsafe[domain][field] = value

    with pytest.raises(ValidationError, match=expected_variable):
        AppSettings.model_validate(unsafe)


def test_validation_error_does_not_reveal_secret() -> None:
    unsafe = deepcopy(MINIMUM_PRODUCTION)
    unsafe_secret = "secret-value-that-must-not-appear"
    unsafe["django"]["secret_key"] = unsafe_secret
    unsafe["django"]["debug"] = True

    with pytest.raises(ValidationError) as exc_info:
        AppSettings.model_validate(unsafe)

    assert unsafe_secret not in str(exc_info.value)


def test_accepts_enabled_workos_authentication() -> None:
    configured = deepcopy(MINIMUM_PRODUCTION)
    configured["auth"] = {
        "workos": {
            "enabled": True,
            "client_id": "client_test",
            "api_key": "sk_test",
            "redirect_uri": "https://app.example.com/callback/",
        }
    }

    settings = AppSettings.model_validate(configured)

    assert settings.auth.workos.client_id == "client_test"
    assert settings.auth.workos.api_key.get_secret_value() == "sk_test"
    assert settings.auth.workos.redirect_uri_value == "https://app.example.com/callback/"


@pytest.mark.parametrize(
    ("missing", "variable"), (("client_id", "CLIENT_ID"), ("api_key", "API_KEY"), ("redirect_uri", "REDIRECT_URI"))
)
def test_enabled_workos_requires_complete_configuration(missing: str, variable: str) -> None:
    workos = {
        "enabled": True,
        "client_id": "client_test",
        "api_key": "sk_test",
        "redirect_uri": "https://app.example.com/callback/",
    }
    workos.pop(missing)

    with pytest.raises(ValidationError, match=f"APP__AUTH__WORKOS__{variable}"):
        WorkOSAuthSettings.model_validate(workos)


@pytest.mark.parametrize(
    ("field", "value", "variable"),
    (("client_id", "invalid", "CLIENT_ID"), ("api_key", "invalid", "API_KEY")),
)
def test_rejects_invalid_workos_credentials(field: str, value: str, variable: str) -> None:
    configured = deepcopy(MINIMUM_PRODUCTION)
    workos = {
        "enabled": True,
        "client_id": "client_test",
        "api_key": "sk_test",
        "redirect_uri": "https://app.example.com/callback/",
    }
    workos[field] = value
    configured["auth"] = {"workos": workos}

    with pytest.raises(ValidationError, match=f"APP__AUTH__WORKOS__{variable}"):
        AppSettings.model_validate(configured)


def test_production_requires_workos_authentication() -> None:
    configured = deepcopy(MINIMUM_PRODUCTION)
    configured["auth"] = {"workos": {"enabled": False}}

    with pytest.raises(ValidationError, match="APP__AUTH__WORKOS__ENABLED"):
        AppSettings.model_validate(configured)


@pytest.mark.parametrize(
    "redirect_uri",
    (
        "http://app.example.com/callback/",
        "https://other.example.com/callback/",
        "https://app.example.com/auth/callback/",
    ),
)
def test_production_requires_exact_workos_callback(redirect_uri: str) -> None:
    configured = deepcopy(MINIMUM_PRODUCTION)
    configured["auth"]["workos"]["redirect_uri"] = redirect_uri

    with pytest.raises(ValidationError, match="APP__AUTH__WORKOS__REDIRECT_URI"):
        AppSettings.model_validate(configured)
