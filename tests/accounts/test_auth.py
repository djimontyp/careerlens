import time

import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import Client
from workos import RateLimitExceededError, ServerError, WorkOSError
from workos.user_management import AuthenticateResponse

from accounts.backends import WorkOSBackend
from accounts.models import WorkOSIdentity

User = get_user_model()


def auth_response(
    *,
    subject: str = "user_123",
    email: str = "ada@example.com",
    email_verified: bool = True,
) -> AuthenticateResponse:
    return AuthenticateResponse.from_dict(
        {
            "user": {
                "object": "user",
                "id": subject,
                "email": email,
                "first_name": "Ada",
                "last_name": "Lovelace",
                "profile_picture_url": None,
                "email_verified": email_verified,
                "external_id": None,
                "last_sign_in_at": None,
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z",
            },
            "access_token": "access_token",
            "refresh_token": "refresh_token",
        }
    )


class FakeUserManagement:
    def __init__(self, response: AuthenticateResponse) -> None:
        self.response = response

    def authenticate_with_code(self, *, code: str) -> AuthenticateResponse:
        assert code == "valid_code"
        return self.response


class FakeWorkOSClient:
    def __init__(self, response: AuthenticateResponse) -> None:
        self.user_management = FakeUserManagement(response)


def install_response(monkeypatch: pytest.MonkeyPatch, response: AuthenticateResponse) -> None:
    monkeypatch.setattr("accounts.backends.WorkOSClient", lambda **kwargs: FakeWorkOSClient(response))


@pytest.mark.django_db
def test_verified_workos_user_is_created_and_linked(monkeypatch: pytest.MonkeyPatch) -> None:
    install_response(monkeypatch, auth_response())

    user = WorkOSBackend().authenticate(request=None, code="valid_code")

    assert user.email == "ada@example.com"
    assert user.first_name == "Ada"
    assert user.last_name == "Lovelace"
    assert WorkOSIdentity.objects.get(user=user).subject == "user_123"


@pytest.mark.django_db
def test_unverified_workos_user_creates_nothing(monkeypatch: pytest.MonkeyPatch) -> None:
    install_response(monkeypatch, auth_response(email_verified=False))

    assert WorkOSBackend().authenticate(request=None, code="valid_code") is None
    assert User.objects.count() == 0
    assert WorkOSIdentity.objects.count() == 0


@pytest.mark.django_db
def test_existing_email_is_not_linked_automatically(monkeypatch: pytest.MonkeyPatch) -> None:
    existing = User.objects.create_user(email="ada@example.com")
    install_response(monkeypatch, auth_response())

    assert WorkOSBackend().authenticate(request=None, code="valid_code") is None
    assert User.objects.get() == existing
    assert WorkOSIdentity.objects.count() == 0


@pytest.mark.django_db
def test_existing_subject_is_the_canonical_identity(monkeypatch: pytest.MonkeyPatch) -> None:
    existing = User.objects.create_user(email="old@example.com")
    WorkOSIdentity.objects.create(user=existing, subject="user_123")
    install_response(monkeypatch, auth_response(email="new@example.com"))

    user = WorkOSBackend().authenticate(request=None, code="valid_code")

    assert user == existing
    assert User.objects.count() == 1
    assert WorkOSIdentity.objects.count() == 1


@pytest.mark.django_db
def test_login_stores_state_and_builds_authorization_url(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, str] = {}

    def authorization_url(backend: WorkOSBackend, redirect_uri: str, state: str) -> str:
        captured.update(redirect_uri=redirect_uri, state=state)
        return f"https://auth.workos.com/authorize?state={state}"

    monkeypatch.setattr(WorkOSBackend, "authorization_url", authorization_url)
    client = Client()

    response = client.get("/login/")

    assert response.status_code == 302
    assert response["Location"] == f"https://auth.workos.com/authorize?state={captured['state']}"
    assert captured["redirect_uri"] == "http://testserver/callback/"
    assert client.session["workos_oauth"]["state"] == captured["state"]
    assert isinstance(client.session["workos_oauth"]["created_at"], float)


def store_oauth_state(client: Client, *, state: str = "valid_state", created_at: float | None = None) -> str:
    session = client.session
    session["workos_oauth"] = {"state": state, "created_at": created_at if created_at is not None else time.time()}
    session.save()
    return session.session_key


@pytest.mark.django_db
def test_callback_consumes_state_once(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[str] = []

    def authenticate(request, code: str):
        calls.append(code)
        return None

    monkeypatch.setattr("accounts.views.authenticate", authenticate, raising=False)
    client = Client()
    store_oauth_state(client)

    first = client.get("/callback/?state=valid_state&code=valid_code")
    second = client.get("/callback/?state=valid_state&code=valid_code")

    assert first.status_code == 400
    assert second.status_code == 400
    assert calls == ["valid_code"]


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("state", "created_at"),
    (("wrong_state", None), ("valid_state", 0.0)),
)
def test_callback_rejects_wrong_or_expired_state(
    monkeypatch: pytest.MonkeyPatch,
    state: str,
    created_at: float | None,
) -> None:
    called = False

    def authenticate(request, code: str):
        nonlocal called
        called = True

    monkeypatch.setattr("accounts.views.authenticate", authenticate, raising=False)
    client = Client()
    store_oauth_state(client, created_at=created_at)

    response = client.get(f"/callback/?state={state}&code=valid_code")

    assert response.status_code == 400
    assert called is False


@pytest.mark.django_db
def test_successful_callback_rotates_session_and_logs_in(monkeypatch: pytest.MonkeyPatch) -> None:
    user = User.objects.create_user(email="ada@example.com")

    def authenticate(request, code: str):
        assert code == "valid_code"
        user.backend = "accounts.backends.WorkOSBackend"
        return user

    monkeypatch.setattr("accounts.views.authenticate", authenticate, raising=False)
    client = Client()
    previous_session_key = store_oauth_state(client)

    response = client.get("/callback/?state=valid_state&code=valid_code")

    assert response.status_code == 302
    assert response["Location"] == settings.LOGIN_REDIRECT_URL
    assert client.session.session_key != previous_session_key
    assert int(client.session["_auth_user_id"]) == user.pk


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("error", "status"),
    ((RateLimitExceededError("rate"), 429), (ServerError("down"), 503), (WorkOSError("bad"), 400)),
)
def test_callback_maps_workos_errors(
    monkeypatch: pytest.MonkeyPatch,
    error: WorkOSError,
    status: int,
) -> None:
    def authenticate(request, code: str):
        raise error

    monkeypatch.setattr("accounts.views.authenticate", authenticate, raising=False)
    client = Client()
    store_oauth_state(client)

    response = client.get("/callback/?state=valid_state&code=valid_code")

    assert response.status_code == status
    assert "_auth_user_id" not in client.session
