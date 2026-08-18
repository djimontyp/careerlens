import pytest
from django.contrib.auth import get_user_model
from django.test import Client

User = get_user_model()


def test_me_requires_session() -> None:
    response = Client().get("/api/v1/me")

    assert response.status_code == 401
    assert response.json() == {"detail": "Unauthorized"}


@pytest.mark.django_db
def test_me_returns_user_and_sets_csrf_cookie() -> None:
    user = User.objects.create_user(email="ada@example.com", first_name="Ada", last_name="Lovelace")
    client = Client()
    client.force_login(user)

    response = client.get("/api/v1/me")

    assert response.status_code == 200
    assert response.json() == {
        "id": user.id,
        "email": "ada@example.com",
        "first_name": "Ada",
        "last_name": "Lovelace",
    }
    assert client.cookies["csrftoken"].value


@pytest.mark.django_db
def test_api_logout_requires_csrf_and_clears_session() -> None:
    user = User.objects.create_user(email="ada@example.com")
    client = Client(enforce_csrf_checks=True)
    client.force_login(user)

    rejected = client.post("/api/v1/logout")
    authenticated = client.get("/api/v1/me")
    csrf_token = client.cookies["csrftoken"].value
    accepted = client.post("/api/v1/logout", headers={"X-CSRFToken": csrf_token})
    anonymous = client.get("/api/v1/me")

    assert rejected.status_code == 403
    assert authenticated.status_code == 200
    assert accepted.status_code == 204
    assert anonymous.status_code == 401


@pytest.mark.django_db
def test_public_logout_is_post_only_and_requires_csrf() -> None:
    user = User.objects.create_user(email="ada@example.com")
    client = Client(enforce_csrf_checks=True)
    client.force_login(user)
    client.get("/api/v1/me")
    csrf_token = client.cookies["csrftoken"].value

    wrong_method = client.get("/logout/")
    rejected = client.post("/logout/")
    accepted = client.post("/logout/", headers={"X-CSRFToken": csrf_token})

    assert wrong_method.status_code == 405
    assert rejected.status_code == 403
    assert accepted.status_code == 302
    assert accepted["Location"] == "/"
    assert "_auth_user_id" not in client.session
