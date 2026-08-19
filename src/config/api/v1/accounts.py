from typing import cast

from django.contrib.auth import logout as django_logout
from django.http import HttpRequest
from django.middleware.csrf import get_token
from ninja import Router, Status
from ninja.security import SessionAuth

from accounts.models import User
from accounts.schemas import MeOut

accounts_router = Router(tags=["accounts"], auth=SessionAuth())


@accounts_router.get("/me", response=MeOut, summary="Current session user")
def me(request: HttpRequest) -> dict[str, int | str]:
    """
    Returns the profile of the currently authenticated user.

    Also rotates the CSRF token: the response carries an updated
    `Set-Cookie: csrftoken` header that clients must store and echo back
    as `X-CSRFToken` on subsequent state-changing requests.
    """
    get_token(request)
    user = cast(User, request.user)
    return {
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
    }


@accounts_router.post("/logout", response={204: None}, summary="Log out")
def logout(request: HttpRequest) -> Status[None]:
    """
    Terminates the current authenticated session and clears the session cookie.

    Requires the `X-CSRFToken` header matching the `csrftoken` cookie value.
    """
    django_logout(request)
    return Status(204, None)
