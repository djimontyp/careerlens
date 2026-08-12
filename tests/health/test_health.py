from contextlib import nullcontext
from typing import Never

import pytest
from django.db import OperationalError, connection
from django.test import Client
from django.urls import resolve


class AvailableDatabaseCursor:
    def execute(self, query: str) -> None:
        pass


def unavailable_database_cursor() -> Never:
    raise OperationalError("internal-database-host:5432 unavailable")


def test_health_is_served_by_ninja_api() -> None:
    assert resolve("/health").namespace == "careerlens-api"


def test_health_returns_ok_when_database_is_available(client: Client, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(connection, "cursor", lambda: nullcontext(AvailableDatabaseCursor()))

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_hides_database_failure(client: Client, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(connection, "cursor", unavailable_database_cursor)
    client.raise_request_exception = False

    response = client.get("/health")

    assert response.status_code == 503
    assert response.json() == {"status": "error"}
    assert b"internal-database-host" not in response.content
