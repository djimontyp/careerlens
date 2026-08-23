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
def test_feed_returns_stable_pages_with_nullable_fields() -> None:
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

    first = client.get("/api/v1/feed", {"page": 1, "page_size": 2})
    second = client.get("/api/v1/feed", {"page": 2, "page_size": 2})

    assert first.status_code == 200
    assert first.json() == {
        "items": [
            {
                "id": vacancies[3].id,
                "title": "Backend Engineer",
                "company": "Acme",
                "location": "Lviv",
                "posted_date": "2026-08-21",
                "source": {"code": "dou", "name": "DOU"},
                "url": "https://example.com/newer-second",
            },
            {
                "id": vacancies[2].id,
                "title": "Senior Python Developer",
                "company": "Acme",
                "location": "Remote",
                "posted_date": "2026-08-21",
                "source": {"code": "dou", "name": "DOU"},
                "url": "https://example.com/newer-first",
            },
        ],
        "count": 4,
    }
    assert second.json() == {
        "items": [
            {
                "id": vacancies[0].id,
                "title": "Python Developer",
                "company": "Acme",
                "location": "Kyiv",
                "posted_date": "2026-08-20",
                "source": {"code": "dou", "name": "DOU"},
                "url": "https://example.com/old",
            },
            {
                "id": vacancies[1].id,
                "title": "Django Developer",
                "company": None,
                "location": None,
                "posted_date": None,
                "source": {"code": "dou", "name": "DOU"},
                "url": None,
            },
        ],
        "count": 4,
    }
