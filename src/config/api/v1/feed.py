from typing import cast

from django.http import HttpRequest
from ninja import Field, Path, Query, Router, Schema
from ninja.errors import HttpError

from accounts.models import User
from api.schemas import CsrfCookie, CsrfHeader, ErrorOut
from vacancies.models import Vacancy, VacancyState
from vacancies.schemas import FeedOut, VacancyDetailOut, VacancyStateIn, VacancyStateOut
from vacancies.services import FeedMode, InvalidFeedCursor, VacancyFeedService, VacancyStateService


class FeedQuery(Schema):
    mode: FeedMode = Field("active", description="User-specific feed mode.")
    cursor: str | None = Field(None, description="Opaque cursor returned by the previous response.")
    limit: int = Field(20, ge=1, le=100, description="Number of vacancies to return.")


feed_router = Router(tags=["feed"])


@feed_router.get(
    "/feed",
    response={200: FeedOut, 401: ErrorOut, 422: ErrorOut},
    summary="List vacancies",
    openapi_extra={
        "responses": {
            200: {
                "content": {
                    "application/json": {
                        "example": {
                            "items": [
                                {
                                    "id": 42,
                                    "title": "Python Developer",
                                    "company": "Acme",
                                    "location": "Remote",
                                    "posted_date": "2026-08-21",
                                    "scraped_at": "2026-08-21T10:30:00Z",
                                    "source_updated_at": "2026-08-21T11:45:00Z",
                                    "is_deftech": True,
                                    "source": {
                                        "code": "dou",
                                        "name": "DOU",
                                        "icon_url": "/source-icons/dou.png",
                                    },
                                    "url": "https://example.com/jobs/42",
                                    "saved": True,
                                    "hidden": False,
                                    "seen": True,
                                    "has_note": True,
                                    "application_submitted_at": "2026-08-22T09:30:00Z",
                                    "match": {
                                        "score": 86,
                                        "reason": "Strong Python and Django overlap.",
                                        "evidence": {
                                            "items": [
                                                {
                                                    "type": "strong",
                                                    "label": "Python",
                                                    "explanation": "Five years of experience.",
                                                }
                                            ],
                                            "evidence_coverage": 0.86,
                                        },
                                        "precise": True,
                                        "scored_at": "2026-08-21T12:00:00Z",
                                    },
                                }
                            ],
                            "next_cursor": None,
                        }
                    }
                }
            },
            401: {"content": {"application/json": {"example": {"detail": "Unauthorized"}}}},
        }
    },
)
def feed(request: HttpRequest, query: Query[FeedQuery]) -> dict[str, object]:
    """Returns vacancies in stable newest-first order."""
    try:
        page = VacancyFeedService(cast(User, request.user)).list(
            mode=query.mode,
            cursor=query.cursor,
            limit=query.limit,
        )
    except InvalidFeedCursor:
        raise HttpError(422, "Invalid cursor.") from None
    return {"items": page.items, "next_cursor": page.next_cursor}


@feed_router.get(
    "/feed/{vacancy_id}",
    response={200: VacancyDetailOut, 401: ErrorOut, 404: ErrorOut},
    summary="Get vacancy detail",
)
def feed_detail(
    request: HttpRequest,
    vacancy_id: int = Path(..., description="CareerLens vacancy identifier."),
) -> Vacancy:
    """Returns one vacancy with its source description and the current user's match."""
    try:
        return VacancyFeedService(cast(User, request.user)).get(vacancy_id)
    except Vacancy.DoesNotExist:
        raise HttpError(404, "Not Found") from None


@feed_router.patch(
    "/feed/{vacancy_id}/state",
    response={200: VacancyStateOut, 401: ErrorOut, 403: ErrorOut, 404: ErrorOut, 422: ErrorOut},
    summary="Update vacancy state",
)
def set_state(
    request: HttpRequest,
    payload: VacancyStateIn,
    csrf_cookie: CsrfCookie,
    csrf_header: CsrfHeader,
    vacancy_id: int = Path(..., description="CareerLens vacancy identifier."),
) -> VacancyState:
    """Partially updates the current user's vacancy state."""
    try:
        return VacancyStateService(cast(User, request.user)).patch(
            vacancy_id,
            saved=payload.saved,
            hidden=payload.hidden,
            seen=payload.seen,
        )
    except Vacancy.DoesNotExist:
        raise HttpError(404, "Not Found") from None
