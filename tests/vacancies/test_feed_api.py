from datetime import date

import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from vacancies.models import Company, Source, Vacancy

User = get_user_model()


def test_feed_requires_session() -> None:
    response = Client().get("/api/v1/feed")

    assert response.status_code == 401
    assert response.json() == {"detail": "Unauthorized"}


@pytest.mark.django_db
def test_feed_returns_stable_cursor_pages_with_nullable_fields() -> None:
    source = Source.objects.create(code="dou", name="DOU")
    company = Company.objects.create(name="Acme")
    vacancies = [
        Vacancy.objects.create(
            source=source,
            company=company,
            external_id="old",
            title="Python Developer",
            url="https://example.com/old",
            location="Kyiv",
            posted_date=date(2026, 8, 20),
            description="Old",
        ),
        Vacancy.objects.create(
            source=source,
            external_id="unknown-date",
            title="Django Developer",
            url=None,
            location=None,
            posted_date=None,
            description="Unknown date",
        ),
        Vacancy.objects.create(
            source=source,
            company=company,
            external_id="newer-first",
            title="Senior Python Developer",
            url="https://example.com/newer-first",
            location="Remote",
            posted_date=date(2026, 8, 21),
            description="Newer first",
        ),
        Vacancy.objects.create(
            source=source,
            company=company,
            external_id="newer-second",
            title="Backend Engineer",
            url="https://example.com/newer-second",
            location="Lviv",
            posted_date=date(2026, 8, 21),
            description="Newer second",
        ),
    ]
    client = Client()
    client.force_login(User.objects.create_user(email="ada@example.com"))

    first = client.get("/api/v1/feed", {"limit": 2})

    assert first.status_code == 200
    first_body = first.json()
    assert [item["id"] for item in first_body["items"]] == [vacancies[3].id, vacancies[2].id]
    assert first_body["next_cursor"]

    second = client.get("/api/v1/feed", {"limit": 2, "cursor": first_body["next_cursor"]})

    assert second.status_code == 200
    second_body = second.json()
    assert [item["id"] for item in second_body["items"]] == [vacancies[0].id, vacancies[1].id]
    assert second_body["items"][-1]["company"] is None
    assert second_body["items"][-1]["url"] is None
    assert second_body["next_cursor"] is None


@pytest.mark.django_db
def test_feed_rejects_invalid_cursor() -> None:
    client = Client()
    client.force_login(User.objects.create_user(email="ada@example.com"))

    response = client.get("/api/v1/feed", {"cursor": "not-a-signed-cursor"})

    assert response.status_code == 422
    assert response.json() == {"detail": "Invalid cursor."}


@pytest.mark.django_db
def test_feed_cursor_continues_within_null_dates() -> None:
    source = Source.objects.create(code="telegram", name="Telegram")
    vacancies = [
        Vacancy.objects.create(
            source=source,
            external_id=str(index),
            title=f"Vacancy {index}",
            posted_date=None,
            description="Description",
        )
        for index in range(3)
    ]
    client = Client()
    client.force_login(User.objects.create_user(email="ada@example.com"))

    first = client.get("/api/v1/feed", {"limit": 2}).json()
    second = client.get("/api/v1/feed", {"limit": 2, "cursor": first["next_cursor"]}).json()

    assert [item["id"] for item in first["items"]] == [vacancies[2].id, vacancies[1].id]
    assert [item["id"] for item in second["items"]] == [vacancies[0].id]
    assert second["next_cursor"] is None
