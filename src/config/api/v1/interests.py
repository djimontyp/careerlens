from typing import cast

from django.conf import settings
from django.http import HttpRequest
from ninja import Path, Router, Status
from ninja.errors import HttpError

from accounts.models import User
from api.errors import body_validation_error
from api.schemas import CsrfCookie, CsrfHeader, ErrorOut, ValidationErrorOut
from interests.models import Interest
from interests.schemas import InterestIn, InterestListOut, InterestOut, InterestPatchIn
from interests.services import InterestLimitReached, InterestService, TokenOverlap, UnknownSourceCodes

interests_router = Router(tags=["interests"])

UNAUTHORIZED = {"content": {"application/json": {"example": {"detail": "Unauthorized"}}}}
FORBIDDEN = {"content": {"application/json": {"example": {"detail": "CSRF check Failed"}}}}
NOT_FOUND = {"content": {"application/json": {"example": {"detail": "Not Found"}}}}
LIMIT_REACHED = {"content": {"application/json": {"example": {"detail": "Interest limit reached."}}}}


@interests_router.get(
    "/interests",
    response={200: InterestListOut, 401: ErrorOut},
    summary="List interests",
    openapi_extra={"responses": {401: UNAUTHORIZED}},
)
def list_interests(request: HttpRequest) -> dict[str, object]:
    """Returns the current user's interests, active first and newest first, with the per-user limit."""
    return {
        "items": InterestService(cast(User, request.user)).list(),
        "limit": settings.INTERESTS_MAX_PER_USER,
    }


@interests_router.post(
    "/interests",
    response={201: InterestOut, 401: ErrorOut, 403: ErrorOut, 409: ErrorOut, 422: ValidationErrorOut},
    summary="Create interest",
    openapi_extra={"responses": {401: UNAUTHORIZED, 403: FORBIDDEN, 409: LIMIT_REACHED}},
)
def create_interest(
    request: HttpRequest,
    payload: InterestIn,
    csrf_cookie: CsrfCookie,
    csrf_header: CsrfHeader,
) -> Status:
    """Creates an interest for the current user; the name is derived from the keywords when omitted."""
    try:
        interest = InterestService(cast(User, request.user)).create(
            name=payload.name,
            keywords=payload.keywords,
            stop_words=payload.stop_words,
            source_codes=payload.sources,
        )
    except InterestLimitReached:
        raise HttpError(409, "Interest limit reached.") from None
    except UnknownSourceCodes as error:
        raise body_validation_error("sources", str(error)) from None
    return Status(201, interest)


@interests_router.patch(
    "/interests/{interest_id}",
    response={200: InterestOut, 401: ErrorOut, 403: ErrorOut, 404: ErrorOut, 422: ValidationErrorOut},
    summary="Update interest",
    openapi_extra={"responses": {401: UNAUTHORIZED, 403: FORBIDDEN, 404: NOT_FOUND}},
)
def update_interest(
    request: HttpRequest,
    payload: InterestPatchIn,
    csrf_cookie: CsrfCookie,
    csrf_header: CsrfHeader,
    interest_id: int = Path(..., description="Interest identifier."),
) -> Interest:
    """Partially updates the current user's interest, including pausing and resuming it."""
    try:
        return InterestService(cast(User, request.user)).update(
            interest_id,
            name=payload.name,
            keywords=payload.keywords,
            stop_words=payload.stop_words,
            source_codes=payload.sources,
            is_active=payload.is_active,
        )
    except Interest.DoesNotExist:
        raise HttpError(404, "Not Found") from None
    except UnknownSourceCodes as error:
        raise body_validation_error("sources", str(error)) from None
    except TokenOverlap as error:
        raise body_validation_error("stop_words", str(error)) from None


@interests_router.delete(
    "/interests/{interest_id}",
    response={204: None, 401: ErrorOut, 403: ErrorOut, 404: ErrorOut, 422: ValidationErrorOut},
    summary="Delete interest",
    openapi_extra={"responses": {401: UNAUTHORIZED, 403: FORBIDDEN, 404: NOT_FOUND}},
)
def delete_interest(
    request: HttpRequest,
    csrf_cookie: CsrfCookie,
    csrf_header: CsrfHeader,
    interest_id: int = Path(..., description="Interest identifier."),
) -> Status:
    """Deletes the current user's interest; saved and applied vacancies are not affected."""
    try:
        InterestService(cast(User, request.user)).delete(interest_id)
    except Interest.DoesNotExist:
        raise HttpError(404, "Not Found") from None
    return Status(204, None)
