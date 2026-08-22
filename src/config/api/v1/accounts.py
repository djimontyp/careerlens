from typing import cast

from django.contrib.auth import logout as django_logout
from django.http import HttpRequest
from django.middleware.csrf import get_token
from ninja import CookieEx, HeaderEx, P, Router, Status

from accounts.models import User
from accounts.schemas import MeOut
from api.schemas import ErrorOut

accounts_router = Router(tags=["accounts"])


@accounts_router.get(
    "/me",
    response={200: MeOut, 401: ErrorOut},
    summary="Current session user",
    openapi_extra={
        "responses": {
            200: {
                "headers": {
                    "Set-Cookie": {
                        "description": "Ensures the CSRF cookie is available for subsequent state-changing requests.",
                        "schema": {"type": "string"},
                        "example": "csrftoken=token; Path=/; SameSite=Lax",
                    }
                }
            },
            401: {"content": {"application/json": {"example": {"detail": "Unauthorized"}}}},
        }
    },
)
def me(request: HttpRequest) -> dict[str, int | str | None]:
    """
    Returns the profile of the currently authenticated user.

    Also ensures the CSRF token is available: the response carries a
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
        "avatar_url": user.avatar_url or None,
    }


@accounts_router.post(
    "/logout",
    response={204: None, 401: ErrorOut, 403: ErrorOut},
    summary="Log out",
    openapi_extra={
        "responses": {
            204: {
                "headers": {
                    "Set-Cookie": {
                        "description": "Expires the Django session cookie.",
                        "schema": {"type": "string"},
                        "example": "sessionid=; Max-Age=0; Path=/; SameSite=Lax",
                    }
                }
            },
            401: {"content": {"application/json": {"example": {"detail": "Unauthorized"}}}},
            403: {"content": {"application/json": {"example": {"detail": "CSRF check Failed"}}}},
        },
    },
)
def logout(
    request: HttpRequest,
    csrf_cookie: CookieEx[str, P(alias="csrftoken", description="CSRF cookie issued by GET /api/v1/me.")],
    csrf_header: HeaderEx[str, P(alias="X-CSRFToken", description="Value matching the csrftoken cookie.")],
) -> Status[None]:
    """
    Terminates the current authenticated session and clears the session cookie.

    Requires the `X-CSRFToken` header matching the `csrftoken` cookie value.
    """
    django_logout(request)
    return Status(204, None)
