import json
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone

from api.root import api
from api.schemas import ValidationErrorOut
from vacancies.models import Source, Vacancy, VacancyApplication, VacancyNote

User = get_user_model()


def json_request(client: Client, method: str, path: str, payload: dict[str, object], csrf: str | None = None):
    headers = {"X-CSRFToken": csrf} if csrf else {}
    return getattr(client, method)(path, data=json.dumps(payload), content_type="application/json", headers=headers)


@pytest.fixture
def vacancy() -> Vacancy:
    source = Source.objects.create(code="dou", name="DOU")
    return Vacancy.objects.create(
        source=source,
        external_id="detail-resources",
        title="Python Developer",
        description="Build reliable services.",
    )


@pytest.mark.django_db
def test_detail_returns_only_the_current_users_note_and_application(vacancy: Vacancy) -> None:
    user = User.objects.create_user(email="ada@example.com")
    other_user = User.objects.create_user(email="grace@example.com")
    VacancyNote.objects.create(user=user, vacancy=vacancy, text="Ask about on-call")
    VacancyNote.objects.create(user=other_user, vacancy=vacancy, text="Must remain private")
    VacancyApplication.objects.create(
        user=user,
        vacancy=vacancy,
        submitted_at=datetime(2026, 8, 22, 9, 30, tzinfo=UTC),
        cover_letter="My cover letter",
    )
    VacancyApplication.objects.create(
        user=other_user,
        vacancy=vacancy,
        submitted_at=datetime(2026, 8, 23, 10, 0, tzinfo=UTC),
        cover_letter="Must remain private",
    )
    client = Client()
    client.force_login(user)

    response = client.get(f"/api/v1/feed/{vacancy.id}")

    assert response.status_code == 200
    assert response.json()["note"] == "Ask about on-call"
    assert response.json()["application"] == {
        "submitted_at": "2026-08-22",
        "cover_letter": "My cover letter",
    }
    assert "Must remain private" not in response.content.decode()


@pytest.mark.django_db
def test_note_requires_csrf_upserts_and_clears_only_the_current_users_note(vacancy: Vacancy) -> None:
    user = User.objects.create_user(email="ada@example.com")
    other_user = User.objects.create_user(email="grace@example.com")
    other_note = VacancyNote.objects.create(user=other_user, vacancy=vacancy, text="Private")
    client = Client(enforce_csrf_checks=True)
    client.force_login(user)
    path = f"/api/v1/feed/{vacancy.id}/note"

    rejected = json_request(client, "put", path, {"note": "First"})
    client.get("/api/v1/me")
    csrf = client.cookies["csrftoken"].value
    created = json_request(client, "put", path, {"note": "First"}, csrf)
    updated = json_request(client, "put", path, {"note": "Updated"}, csrf)
    cleared = json_request(client, "put", path, {"note": ""}, csrf)
    missing = json_request(client, "put", "/api/v1/feed/999999/note", {"note": "Missing"}, csrf)
    other_note.refresh_from_db()

    assert rejected.status_code == 403
    assert created.status_code == updated.status_code == cleared.status_code == 200
    assert created.json() == {"note": "First"}
    assert updated.json() == {"note": "Updated"}
    assert cleared.json() == {"note": ""}
    assert missing.status_code == 404
    assert VacancyNote.objects.filter(user=user, vacancy=vacancy).exists() is False
    assert other_note.text == "Private"


@pytest.mark.django_db
def test_note_accepts_4096_characters_and_rejects_larger_values(vacancy: Vacancy) -> None:
    user = User.objects.create_user(email="ada@example.com")
    client = Client(enforce_csrf_checks=True)
    client.force_login(user)
    client.get("/api/v1/me")
    csrf = client.cookies["csrftoken"].value
    path = f"/api/v1/feed/{vacancy.id}/note"

    accepted = json_request(client, "put", path, {"note": "x" * 4096}, csrf)
    rejected = json_request(client, "put", path, {"note": "y" * 4097}, csrf)

    assert accepted.status_code == 200
    assert rejected.status_code == 422
    assert VacancyNote.objects.get(user=user, vacancy=vacancy).text == "x" * 4096


@pytest.mark.django_db
def test_application_requires_csrf_upserts_and_deletes_only_the_current_users_record(vacancy: Vacancy) -> None:
    user = User.objects.create_user(email="ada@example.com")
    other_user = User.objects.create_user(email="grace@example.com")
    other_application = VacancyApplication.objects.create(
        user=other_user,
        vacancy=vacancy,
        submitted_at=datetime(2026, 8, 21, 8, 0, tzinfo=UTC),
        cover_letter="Private",
    )
    client = Client(enforce_csrf_checks=True)
    client.force_login(user)
    path = f"/api/v1/feed/{vacancy.id}/application"
    payload = {"submitted_at": "2026-08-22", "cover_letter": "Motivation"}

    rejected = json_request(client, "put", path, payload)
    client.get("/api/v1/me")
    csrf = client.cookies["csrftoken"].value
    created = json_request(client, "put", path, payload, csrf)
    updated = json_request(
        client,
        "put",
        path,
        {"submitted_at": "2026-08-24", "cover_letter": "Updated motivation"},
        csrf,
    )
    deleted = client.delete(path, headers={"X-CSRFToken": csrf})
    missing = client.delete("/api/v1/feed/999999/application", headers={"X-CSRFToken": csrf})
    other_application.refresh_from_db()

    assert rejected.status_code == 403
    assert created.status_code == updated.status_code == 200
    assert created.json() == payload
    assert updated.json() == {"submitted_at": "2026-08-24", "cover_letter": "Updated motivation"}
    assert deleted.status_code == 204
    assert missing.status_code == 404
    assert VacancyApplication.objects.filter(user=user, vacancy=vacancy).exists() is False
    assert other_application.cover_letter == "Private"


@pytest.mark.django_db
def test_application_delete_rejects_non_numeric_vacancy_id_with_documented_validation_response() -> None:
    user = User.objects.create_user(email="ada@example.com")
    client = Client(enforce_csrf_checks=True)
    client.force_login(user)
    client.get("/api/v1/me")
    csrf = client.cookies["csrftoken"].value

    response = client.delete(
        "/api/v1/feed/not-a-number/application",
        headers={"X-CSRFToken": csrf},
    )

    assert response.status_code == 422
    assert (
        ValidationErrorOut.model_validate(response.json()).model_dump(mode="json", exclude_unset=True)
        == response.json()
    )
    schema = api.get_openapi_schema()
    response_schema = schema["paths"]["/api/v1/feed/{vacancy_id}/application"]["delete"]["responses"][422]
    component_name = response_schema["content"]["application/json"]["schema"]["$ref"].rsplit("/", 1)[-1]
    assert schema["components"]["schemas"][component_name]["properties"]["detail"]["type"] == "array"


@pytest.mark.django_db
def test_application_rejects_cover_letters_over_4096_characters(vacancy: Vacancy) -> None:
    user = User.objects.create_user(email="ada@example.com")
    client = Client(enforce_csrf_checks=True)
    client.force_login(user)
    client.get("/api/v1/me")
    csrf = client.cookies["csrftoken"].value

    response = json_request(
        client,
        "put",
        f"/api/v1/feed/{vacancy.id}/application",
        {"submitted_at": "2026-08-22", "cover_letter": "x" * 4097},
        csrf,
    )

    assert response.status_code == 422
    assert VacancyApplication.objects.filter(user=user, vacancy=vacancy).exists() is False


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("resource", "payload", "field", "error_type"),
    [
        ("note", {"note": "x" * 4097}, "note", "string_too_long"),
        ("application", {"submitted_at": "not-a-date"}, "submitted_at", "date_from_datetime_parsing"),
        ("application", {"submitted_at": "2026-08-22", "cover_letter": "x" * 4097}, "cover_letter", "string_too_long"),
    ],
)
def test_invalid_detail_mutations_match_documented_validation_response_and_preserve_data(
    vacancy: Vacancy, resource: str, payload: dict[str, object], field: str, error_type: str
) -> None:
    user = User.objects.create_user(email="ada@example.com")
    note = VacancyNote.objects.create(user=user, vacancy=vacancy, text="Saved note")
    application = VacancyApplication.objects.create(
        user=user,
        vacancy=vacancy,
        submitted_at=datetime(2026, 8, 21, 8, 0, tzinfo=UTC),
        cover_letter="Saved application",
    )
    client = Client(enforce_csrf_checks=True)
    client.force_login(user)
    client.get("/api/v1/me")
    response = json_request(
        client,
        "put",
        f"/api/v1/feed/{vacancy.id}/{resource}",
        payload,
        client.cookies["csrftoken"].value,
    )

    assert response.status_code == 422
    errors = response.json()["detail"]
    assert isinstance(errors, list)
    assert len(errors) == 1
    assert errors[0]["loc"] == ["body", "payload", field]
    assert errors[0]["type"] == error_type
    assert isinstance(errors[0]["msg"], str)
    assert (
        ValidationErrorOut.model_validate(response.json()).model_dump(mode="json", exclude_unset=True)
        == response.json()
    )
    schema = api.get_openapi_schema()
    response_schema = schema["paths"][f"/api/v1/feed/{{vacancy_id}}/{resource}"]["put"]["responses"][422]
    component_name = response_schema["content"]["application/json"]["schema"]["$ref"].rsplit("/", 1)[-1]
    assert schema["components"]["schemas"][component_name]["properties"]["detail"]["type"] == "array"
    note.refresh_from_db()
    application.refresh_from_db()
    assert note.text == "Saved note"
    assert application.cover_letter == "Saved application"
    assert application.submitted_at == datetime(2026, 8, 21, 8, 0, tzinfo=UTC)


@pytest.mark.django_db
def test_application_submitted_at_reports_kyiv_calendar_date_in_feed_and_detail(vacancy: Vacancy) -> None:
    user = User.objects.create_user(email="ada@example.com")
    kyiv_midnight = datetime(2026, 8, 22, 0, 0, tzinfo=ZoneInfo("Europe/Kyiv"))
    assert kyiv_midnight.astimezone(UTC).date().isoformat() == "2026-08-21"
    VacancyApplication.objects.create(user=user, vacancy=vacancy, submitted_at=kyiv_midnight, cover_letter="")
    client = Client()
    client.force_login(user)

    feed_response = client.get("/api/v1/feed")
    detail_response = client.get(f"/api/v1/feed/{vacancy.id}")

    assert feed_response.status_code == 200
    feed_item = next(item for item in feed_response.json()["items"] if item["id"] == vacancy.id)
    assert feed_item["application_submitted_at"] == "2026-08-22"
    assert detail_response.status_code == 200
    assert detail_response.json()["application"]["submitted_at"] == "2026-08-22"


@pytest.mark.django_db
def test_application_rejects_future_dates_without_persisting(vacancy: Vacancy) -> None:
    user = User.objects.create_user(email="ada@example.com")
    client = Client(enforce_csrf_checks=True)
    client.force_login(user)
    client.get("/api/v1/me")
    csrf = client.cookies["csrftoken"].value
    path = f"/api/v1/feed/{vacancy.id}/application"
    tomorrow = (timezone.localdate() + timedelta(days=1)).isoformat()

    response = json_request(client, "put", path, {"submitted_at": tomorrow, "cover_letter": ""}, csrf)

    assert response.status_code == 422
    errors = response.json()["detail"]
    assert isinstance(errors, list)
    assert errors[0]["loc"] == ["body", "payload", "submitted_at"]
    assert (
        ValidationErrorOut.model_validate(response.json()).model_dump(mode="json", exclude_unset=True)
        == response.json()
    )
    assert VacancyApplication.objects.filter(user=user, vacancy=vacancy).exists() is False


@pytest.mark.django_db
@pytest.mark.parametrize("too_early", ["0001-01-01", "1999-12-31"])
def test_application_rejects_dates_before_2000_without_persisting(vacancy: Vacancy, too_early: str) -> None:
    user = User.objects.create_user(email="ada@example.com")
    client = Client(enforce_csrf_checks=True)
    client.force_login(user)
    client.get("/api/v1/me")
    csrf = client.cookies["csrftoken"].value
    path = f"/api/v1/feed/{vacancy.id}/application"

    response = json_request(client, "put", path, {"submitted_at": too_early, "cover_letter": ""}, csrf)

    assert response.status_code == 422
    errors = response.json()["detail"]
    assert isinstance(errors, list)
    assert errors[0]["loc"] == ["body", "payload", "submitted_at"]
    assert (
        ValidationErrorOut.model_validate(response.json()).model_dump(mode="json", exclude_unset=True)
        == response.json()
    )
    assert VacancyApplication.objects.filter(user=user, vacancy=vacancy).exists() is False

    feed_response = client.get("/api/v1/feed")
    assert feed_response.status_code == 200


@pytest.mark.django_db
def test_application_accepts_the_earliest_allowed_date(vacancy: Vacancy) -> None:
    user = User.objects.create_user(email="ada@example.com")
    client = Client(enforce_csrf_checks=True)
    client.force_login(user)
    client.get("/api/v1/me")
    csrf = client.cookies["csrftoken"].value
    path = f"/api/v1/feed/{vacancy.id}/application"

    response = json_request(client, "put", path, {"submitted_at": "2000-01-01", "cover_letter": ""}, csrf)

    assert response.status_code == 200
    assert response.json()["submitted_at"] == "2000-01-01"


@pytest.mark.django_db
def test_application_update_rejects_out_of_range_dates_without_changing_the_stored_record(
    vacancy: Vacancy,
) -> None:
    user = User.objects.create_user(email="ada@example.com")
    client = Client(enforce_csrf_checks=True)
    client.force_login(user)
    client.get("/api/v1/me")
    csrf = client.cookies["csrftoken"].value
    path = f"/api/v1/feed/{vacancy.id}/application"
    application = VacancyApplication.objects.create(
        user=user,
        vacancy=vacancy,
        submitted_at=datetime(2026, 8, 21, 8, 0, tzinfo=UTC),
        cover_letter="Saved application",
    )
    tomorrow = (timezone.localdate() + timedelta(days=1)).isoformat()

    too_early_response = json_request(
        client, "put", path, {"submitted_at": "1999-12-31", "cover_letter": "Should not persist"}, csrf
    )
    future_response = json_request(
        client, "put", path, {"submitted_at": tomorrow, "cover_letter": "Should not persist"}, csrf
    )

    assert too_early_response.status_code == 422
    assert future_response.status_code == 422
    application.refresh_from_db()
    assert application.submitted_at == datetime(2026, 8, 21, 8, 0, tzinfo=UTC)
    assert application.cover_letter == "Saved application"

    feed_response = client.get("/api/v1/feed")
    assert feed_response.status_code == 200


@pytest.mark.django_db
def test_application_accepts_todays_local_date(vacancy: Vacancy) -> None:
    user = User.objects.create_user(email="ada@example.com")
    client = Client(enforce_csrf_checks=True)
    client.force_login(user)
    client.get("/api/v1/me")
    csrf = client.cookies["csrftoken"].value
    path = f"/api/v1/feed/{vacancy.id}/application"
    today = timezone.localdate().isoformat()

    response = json_request(client, "put", path, {"submitted_at": today, "cover_letter": ""}, csrf)

    assert response.status_code == 200
    assert response.json()["submitted_at"] == today
    assert VacancyApplication.objects.get(user=user, vacancy=vacancy).cover_letter == ""
