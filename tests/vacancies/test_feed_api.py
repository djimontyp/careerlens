from datetime import UTC, date, datetime

import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from vacancies.models import Company, Source, Vacancy, VacancyMatch

User = get_user_model()


def test_feed_requires_session() -> None:
    response = Client().get("/api/v1/feed")

    assert response.status_code == 401
    assert response.json() == {"detail": "Unauthorized"}


@pytest.mark.django_db
def test_feed_returns_stable_cursor_pages_with_nullable_fields() -> None:
    source = Source.objects.create(
        code="dou",
        name="DOU",
        icon_url="/source-icons/dou.png",
    )
    company = Company.objects.create(name="Acme", is_deftech=True)
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
            is_deftech=True,
            scraped_at=datetime(2026, 8, 21, 10, 30, tzinfo=UTC),
            source_updated_at=datetime(2026, 8, 21, 11, 45, tzinfo=UTC),
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
    assert first_body["items"][0]["source"]["icon_url"] == "/source-icons/dou.png"
    assert first_body["items"][0]["is_deftech"] is True
    assert first_body["next_cursor"]

    second = client.get("/api/v1/feed", {"limit": 2, "cursor": first_body["next_cursor"]})

    assert second.status_code == 200
    second_body = second.json()
    assert [item["id"] for item in second_body["items"]] == [vacancies[0].id, vacancies[1].id]
    assert second_body["items"][-1]["company"] is None
    assert second_body["items"][-1]["url"] is None
    assert second_body["items"][-1]["is_deftech"] is True
    assert second_body["items"][-1]["scraped_at"] == "2026-08-21T10:30:00Z"
    assert second_body["items"][-1]["source_updated_at"] == "2026-08-21T11:45:00Z"
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


@pytest.mark.django_db
def test_feed_returns_only_the_current_users_match(django_assert_num_queries: object) -> None:
    source = Source.objects.create(code="dou", name="DOU")
    vacancy = Vacancy.objects.create(
        source=source,
        external_id="match",
        title="Python Developer",
        description="Build the backend.",
    )
    unmatched = Vacancy.objects.create(
        source=source,
        external_id="unmatched",
        title="Django Developer",
        description="Maintain the API.",
    )
    user = User.objects.create_user(email="ada@example.com")
    other_user = User.objects.create_user(email="grace@example.com")
    VacancyMatch.objects.create(
        user=user,
        vacancy=vacancy,
        score=86,
        reason="Strong Python overlap.",
        evidence={
            "items": [{"type": "strong", "label": "Python", "explanation": "Five years of experience."}],
            "evidence_coverage": 0.86,
        },
        precise=True,
    )
    VacancyMatch.objects.create(user=other_user, vacancy=unmatched, score=99, reason="Must stay private.")
    client = Client()
    client.force_login(user)

    with django_assert_num_queries(3):
        response = client.get("/api/v1/feed")

    items = {item["id"]: item for item in response.json()["items"]}
    assert items[vacancy.id]["match"] == {
        "score": 86,
        "reason": "Strong Python overlap.",
        "evidence": {
            "items": [{"type": "strong", "label": "Python", "explanation": "Five years of experience."}],
            "evidence_coverage": 0.86,
        },
        "precise": True,
        "scored_at": items[vacancy.id]["match"]["scored_at"],
    }
    assert items[unmatched.id]["match"] is None


@pytest.mark.django_db
def test_feed_detail_returns_description_and_only_the_current_users_match() -> None:
    source = Source.objects.create(code="dou", name="DOU")
    vacancy = Vacancy.objects.create(
        source=source,
        external_id="detail",
        title="Python Developer",
        description="Build the backend.",
    )
    user = User.objects.create_user(email="ada@example.com")
    other_user = User.objects.create_user(email="grace@example.com")
    VacancyMatch.objects.create(
        user=user,
        vacancy=vacancy,
        score=86,
        reason="Strong Python overlap.",
        evidence={
            "items": [{"type": "strong", "label": "Python", "explanation": "Five years of experience."}],
            "evidence_coverage": 0.86,
        },
        precise=True,
    )
    VacancyMatch.objects.create(user=other_user, vacancy=vacancy, score=12, reason="Must stay private.")
    client = Client()
    client.force_login(user)

    response = client.get(f"/api/v1/feed/{vacancy.id}")

    assert response.status_code == 200
    body = response.json()
    assert body["description"] == "Build the backend."
    assert body["description_status"] == "source"
    assert body["match"]["score"] == 86
    assert body["match"]["reason"] == "Strong Python overlap."
