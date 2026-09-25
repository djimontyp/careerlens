import pytest
from django.contrib.auth import get_user_model
from django.test import Client, override_settings

from interests.models import Interest
from vacancies.models import Source

User = get_user_model()


def logged_in(email: str = "ada@example.com", *, csrf: bool = False) -> tuple[Client, object]:
    user = User.objects.create_user(email=email)
    client = Client(enforce_csrf_checks=csrf)
    client.force_login(user)
    return client, user


def csrf_headers(client: Client) -> dict[str, str]:
    client.get("/api/v1/me")
    return {"X-CSRFToken": client.cookies["csrftoken"].value}


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("get", "/api/v1/interests"),
        ("post", "/api/v1/interests"),
        ("patch", "/api/v1/interests/1"),
        ("delete", "/api/v1/interests/1"),
    ],
)
def test_interest_operations_require_session(method: str, path: str) -> None:
    response = getattr(Client(), method)(path)

    assert response.status_code == 401
    assert response.json() == {"detail": "Unauthorized"}


@pytest.mark.django_db
def test_create_returns_the_interest_with_sources_and_list_shows_only_own_interests() -> None:
    Source.objects.create(code="dou", name="DOU", icon_url="/source-icons/dou.png")
    client, user = logged_in()
    other = User.objects.create_user(email="grace@example.com")
    Interest.objects.create(user=other, name="Private interest", keywords=["secret"])
    headers = csrf_headers(client)

    created = client.post(
        "/api/v1/interests",
        data={"name": "", "keywords": ["Python", " django "], "stop_words": ["senior"], "sources": ["dou"]},
        content_type="application/json",
        headers=headers,
    )
    listed = client.get("/api/v1/interests")

    assert created.status_code == 201
    body = created.json()
    assert body["name"] == "Python, django"
    assert body["keywords"] == ["Python", "django"]
    assert body["stop_words"] == ["senior"]
    assert body["sources"] == [{"code": "dou", "name": "DOU", "icon_url": "/source-icons/dou.png"}]
    assert body["is_active"] is True
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()["items"]] == [body["id"]]
    assert listed.json()["limit"] == 10
    assert "Private" not in listed.content.decode()


@pytest.mark.django_db
def test_create_validation_errors_use_the_ninja_list_shape_with_field_locations() -> None:
    client, _ = logged_in()
    headers = csrf_headers(client)

    empty = client.post("/api/v1/interests", data={"keywords": [" "]}, content_type="application/json", headers=headers)
    overlap = client.post(
        "/api/v1/interests",
        data={"keywords": ["python"], "stop_words": ["Python"]},
        content_type="application/json",
        headers=headers,
    )
    unknown_source = client.post(
        "/api/v1/interests",
        data={"keywords": ["python"], "sources": ["nope"]},
        content_type="application/json",
        headers=headers,
    )
    too_many_sources = client.post(
        "/api/v1/interests",
        data={"keywords": ["python"], "sources": [f"s{index}" for index in range(31)]},
        content_type="application/json",
        headers=headers,
    )

    assert empty.status_code == 422
    assert empty.json()["detail"][0]["loc"] == ["body", "payload", "keywords"]
    assert overlap.status_code == 422
    assert overlap.json()["detail"][0]["loc"] == ["body", "payload", "stop_words"]
    assert overlap.json()["detail"][0]["ctx"]["error"] == "Keywords and stop words overlap: Python"
    assert unknown_source.status_code == 422
    assert unknown_source.json()["detail"] == [
        {
            "type": "value_error",
            "loc": ["body", "payload", "sources"],
            "msg": "Value error, Unknown source codes: nope",
            "ctx": {"error": "Unknown source codes: nope"},
        }
    ]
    assert too_many_sources.status_code == 422
    assert too_many_sources.json()["detail"][0]["loc"] == ["body", "payload", "sources"]
    assert Interest.objects.count() == 0


@pytest.mark.django_db
@override_settings(INTERESTS_MAX_PER_USER=1)
def test_create_beyond_the_limit_returns_409_and_the_list_reports_the_limit() -> None:
    client, _ = logged_in()
    headers = csrf_headers(client)
    client.post("/api/v1/interests", data={"keywords": ["python"]}, content_type="application/json", headers=headers)

    rejected = client.post(
        "/api/v1/interests", data={"keywords": ["go"]}, content_type="application/json", headers=headers
    )

    assert rejected.status_code == 409
    assert rejected.json() == {"detail": "Interest limit reached."}
    assert client.get("/api/v1/interests").json()["limit"] == 1
    assert Interest.objects.count() == 1


@pytest.mark.django_db
def test_patch_updates_partially_and_reports_overlap_with_stored_keywords() -> None:
    client, user = logged_in()
    headers = csrf_headers(client)
    interest = Interest.objects.create(user=user, name="x", keywords=["python", "go"])

    paused = client.patch(
        f"/api/v1/interests/{interest.id}", data={"is_active": False}, content_type="application/json", headers=headers
    )
    overlap = client.patch(
        f"/api/v1/interests/{interest.id}",
        data={"stop_words": ["GO"]},
        content_type="application/json",
        headers=headers,
    )
    empty = client.patch(f"/api/v1/interests/{interest.id}", data={}, content_type="application/json", headers=headers)
    bad_id = client.patch(
        "/api/v1/interests/abc", data={"is_active": True}, content_type="application/json", headers=headers
    )
    unknown_source = client.patch(
        f"/api/v1/interests/{interest.id}",
        data={"is_active": True, "sources": ["nope"]},
        content_type="application/json",
        headers=headers,
    )

    assert paused.status_code == 200
    assert paused.json()["is_active"] is False
    assert paused.json()["keywords"] == ["python", "go"]
    assert overlap.status_code == 422
    assert overlap.json()["detail"][0]["loc"] == ["body", "payload", "stop_words"]
    assert empty.status_code == 422
    assert empty.json()["detail"][0]["loc"] == ["body", "payload"]
    assert bad_id.status_code == 422
    assert bad_id.json()["detail"][0]["loc"] == ["path", "interest_id"]
    # Proves nothing was written for the failed request; save() is never reached, so this is not a rollback test.
    assert unknown_source.status_code == 422
    assert unknown_source.json()["detail"][0]["loc"] == ["body", "payload", "sources"]
    assert unknown_source.json()["detail"][0]["ctx"]["error"] == "Unknown source codes: nope"
    interest.refresh_from_db()
    assert interest.is_active is False


@pytest.mark.django_db
def test_other_users_interests_answer_404_and_stay_unchanged() -> None:
    owner = User.objects.create_user(email="grace@example.com")
    interest = Interest.objects.create(user=owner, name="x", keywords=["python"])
    client, _ = logged_in()
    headers = csrf_headers(client)

    patched = client.patch(
        f"/api/v1/interests/{interest.id}", data={"is_active": False}, content_type="application/json", headers=headers
    )
    deleted = client.delete(f"/api/v1/interests/{interest.id}", headers=headers)

    assert patched.status_code == 404
    assert deleted.status_code == 404
    interest.refresh_from_db()
    assert interest.is_active is True


@pytest.mark.django_db
def test_mutations_require_csrf_and_delete_returns_204() -> None:
    client, user = logged_in(csrf=True)
    interest = Interest.objects.create(user=user, name="x", keywords=["python"])

    rejected_post = client.post("/api/v1/interests", data={"keywords": ["go"]}, content_type="application/json")
    rejected_patch = client.patch(
        f"/api/v1/interests/{interest.id}", data={"is_active": False}, content_type="application/json"
    )
    rejected_delete = client.delete(f"/api/v1/interests/{interest.id}")
    headers = csrf_headers(client)
    deleted = client.delete(f"/api/v1/interests/{interest.id}", headers=headers)

    assert (rejected_post.status_code, rejected_patch.status_code, rejected_delete.status_code) == (403, 403, 403)
    assert deleted.status_code == 204
    assert deleted.content == b""
    assert not Interest.objects.filter(pk=interest.id).exists()
