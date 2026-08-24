import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from vacancies.models import Source, Vacancy, VacancyState

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
    user = User.objects.create_user(email="ada@example.com")
    other_user = User.objects.create_user(email="grace@example.com")
    VacancyState.objects.create(user=user, vacancy=vacancy, saved=True, hidden=False)
    VacancyState.objects.create(user=other_user, vacancy=vacancy, saved=False, hidden=True)
    client = Client()
    client.force_login(user)

    with django_assert_num_queries(3):
        response = client.get("/api/v1/feed")

    assert response.status_code == 200
    assert response.json()["items"][0]["saved"] is True
    assert response.json()["items"][0]["hidden"] is False
    assert response.json()["items"][0]["seen"] is False


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
