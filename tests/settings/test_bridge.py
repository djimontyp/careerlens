import importlib
import socket
import sys
from types import ModuleType
from typing import Never

import psycopg
import pytest

TEST_SECRET = "test-only-secret-key-with-at-least-32-characters"


def forbid_connection(*args: object, **kwargs: object) -> Never:
    raise AssertionError("settings import attempted network or database I/O")


def import_settings(monkeypatch: pytest.MonkeyPatch) -> ModuleType:
    environment = {
        "APP__ENVIRONMENT": "production",
        "APP__DJANGO__SECRET_KEY": TEST_SECRET,
        "APP__DJANGO__ALLOWED_HOSTS": '["app.example.com"]',
        "APP__CORE__SITE_URL": "https://app.example.com",
        "APP__DATABASE__DATABASE": "careerlens",
        "APP__DATABASE__USER": "careerlens",
        "APP__DATABASE__PASSWORD": "production-database-password",
        "APP__DATABASE__HOST": "db.invalid",
    }
    for name, value in environment.items():
        monkeypatch.setenv(name, value)
    monkeypatch.setattr(socket, "create_connection", forbid_connection)
    monkeypatch.setattr(psycopg, "connect", forbid_connection)
    sys.modules.pop("config.settings.django", None)
    return importlib.import_module("config.settings.django")


def test_bridge_maps_validated_configuration(monkeypatch: pytest.MonkeyPatch) -> None:
    module = import_settings(monkeypatch)

    assert module.DEBUG is False
    assert module.SECRET_KEY == TEST_SECRET
    assert module.ALLOWED_HOSTS == ["app.example.com"]
    assert module.SITE_URL == "https://app.example.com"
    assert module.DATABASES["default"] == {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "careerlens",
        "USER": "careerlens",
        "PASSWORD": "production-database-password",
        "HOST": "db.invalid",
        "PORT": 5432,
    }


def test_bridge_enables_production_transport_security(monkeypatch: pytest.MonkeyPatch) -> None:
    module = import_settings(monkeypatch)

    assert "django.middleware.clickjacking.XFrameOptionsMiddleware" in module.MIDDLEWARE
    assert module.SESSION_COOKIE_SECURE is True
    assert module.CSRF_COOKIE_SECURE is True
    assert module.SECURE_SSL_REDIRECT is True
    assert module.SECURE_PROXY_SSL_HEADER == ("HTTP_X_FORWARDED_PROTO", "https")
    assert module.SECURE_CONTENT_TYPE_NOSNIFF is True
    assert module.X_FRAME_OPTIONS == "DENY"
