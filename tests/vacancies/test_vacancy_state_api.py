from datetime import UTC, datetime

import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from vacancies.models import Source, Vacancy, VacancyApplication, VacancyNote, VacancyState

User = get_user_model()


@pytest.mark.django_db
def test_feed_projects_only_the_current_users_state_without_extra_queries(django_assert_num_queries: object) -> None:
    source = Source.objects.create(code="dou", name="DOU")
    vacancy = Vacancy.objects.create(
        source=source,
        external_id="state",
        title="Python Developer",
        description="Build APIs.",
    )
    private_vacancy = Vacancy.objects.create(
        source=source,
        external_id="private-state",
        title="Django Developer",
        description="Maintain APIs.",
    )
    user = User.objects.create_user(email="ada@example.com")
    other_user = User.objects.create_user(email="grace@example.com")
    VacancyState.objects.create(user=user, vacancy=vacancy, saved=True, hidden=False)
    VacancyState.objects.create(user=other_user, vacancy=vacancy, saved=False, hidden=True)
    VacancyNote.objects.create(user=user, vacancy=vacancy, text="Follow up")
    VacancyNote.objects.create(user=other_user, vacancy=vacancy, text="Private note")
    VacancyNote.objects.create(user=other_user, vacancy=private_vacancy, text="Private note")
    VacancyApplication.objects.create(
        user=user,
        vacancy=vacancy,
        cover_letter="Private letter",
        submitted_at=datetime(2026, 8, 22, 9, 30, tzinfo=UTC),
    )
    VacancyApplication.objects.create(
        user=other_user,
        vacancy=private_vacancy,
        cover_letter="Private letter",
    )
    client = Client()
    client.force_login(user)

    with django_assert_num_queries(3):
        response = client.get("/api/v1/feed")

    assert response.status_code == 200
    items = {item["id"]: item for item in response.json()["items"]}
    assert items[vacancy.id]["saved"] is True
    assert items[vacancy.id]["hidden"] is False
    assert items[vacancy.id]["seen"] is False
    assert items[vacancy.id]["has_note"] is True
    assert items[vacancy.id]["application_submitted_at"] == "2026-08-22T09:30:00Z"
    assert items[private_vacancy.id]["has_note"] is False
    assert items[private_vacancy.id]["application_submitted_at"] is None
    assert "Private" not in response.content.decode()


@pytest.mark.django_db
def test_state_mutations_require_csrf_are_idempotent_and_keep_flags_independent() -> None:
    source = Source.objects.create(code="dou", name="DOU")
    vacancy = Vacancy.objects.create(
        source=source,
        external_id="mutations",
        title="Python Developer",
        description="Build APIs.",
    )
    user = User.objects.create_user(email="ada@example.com")
    other_user = User.objects.create_user(email="grace@example.com")
    other_state = VacancyState.objects.create(user=other_user, vacancy=vacancy, saved=False, hidden=False)
    client = Client(enforce_csrf_checks=True)
    client.force_login(user)

    rejected = client.post(
        f"/api/v1/feed/{vacancy.id}/saved",
        data={"saved": True},
        content_type="application/json",
    )
    client.get("/api/v1/me")
    csrf = client.cookies["csrftoken"].value
    headers = {"X-CSRFToken": csrf}
    first_saved = client.post(
        f"/api/v1/feed/{vacancy.id}/saved",
        data={"saved": True},
        content_type="application/json",
        headers=headers,
    )
    second_saved = client.post(
        f"/api/v1/feed/{vacancy.id}/saved",
        data={"saved": True},
        content_type="application/json",
        headers=headers,
    )
    hidden = client.post(
        f"/api/v1/feed/{vacancy.id}/hidden",
        data={"hidden": True},
        content_type="application/json",
        headers=headers,
    )
    first_seen = client.post(f"/api/v1/feed/{vacancy.id}/seen", headers=headers)
    state = VacancyState.objects.get(user=user, vacancy=vacancy)
    seen_at = state.seen_at
    second_seen = client.post(f"/api/v1/feed/{vacancy.id}/seen", headers=headers)
    state.refresh_from_db()
    other_state.refresh_from_db()

    assert rejected.status_code == 403
    assert first_saved.json() == second_saved.json() == {"saved": True}
    assert hidden.json() == {"hidden": True}
    assert first_seen.status_code == second_seen.status_code == 204
    assert state.saved is True
    assert state.hidden is True
    assert state.seen_at == seen_at
    assert other_state.saved is False
    assert other_state.hidden is False


@pytest.mark.django_db
def test_feed_modes_filter_only_the_current_users_state() -> None:
    source = Source.objects.create(code="dou", name="DOU")
    user = User.objects.create_user(email="ada@example.com")
    other_user = User.objects.create_user(email="grace@example.com")
    active, saved, hidden, other_hidden = [
        Vacancy.objects.create(
            source=source,
            external_id=title,
            title=title,
            description="Build APIs.",
        )
        for title in ("active", "saved", "hidden", "other-hidden")
    ]
    VacancyState.objects.create(user=user, vacancy=saved, saved=True)
    VacancyState.objects.create(user=user, vacancy=hidden, hidden=True)
    VacancyState.objects.create(user=other_user, vacancy=other_hidden, hidden=True)
    client = Client()
    client.force_login(user)

    active_ids = {item["id"] for item in client.get("/api/v1/feed", {"mode": "active"}).json()["items"]}
    saved_ids = {item["id"] for item in client.get("/api/v1/feed", {"mode": "saved"}).json()["items"]}
    hidden_ids = {item["id"] for item in client.get("/api/v1/feed", {"mode": "hidden"}).json()["items"]}

    assert active_ids == {active.id, saved.id, other_hidden.id}
    assert saved_ids == {saved.id}
    assert hidden_ids == {hidden.id}


@pytest.mark.django_db
def test_feed_cursor_is_bound_to_its_mode() -> None:
    source = Source.objects.create(code="dou", name="DOU")
    user = User.objects.create_user(email="ada@example.com")
    for index in range(2):
        vacancy = Vacancy.objects.create(
            source=source,
            external_id=str(index),
            title=f"Vacancy {index}",
            description="Build APIs.",
        )
        VacancyState.objects.create(user=user, vacancy=vacancy, saved=True)
    client = Client()
    client.force_login(user)

    cursor = client.get("/api/v1/feed", {"mode": "saved", "limit": 1}).json()["next_cursor"]
    response = client.get("/api/v1/feed", {"mode": "hidden", "limit": 1, "cursor": cursor})

    assert response.status_code == 422
    assert response.json() == {"detail": "Invalid cursor."}
