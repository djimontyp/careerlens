from datetime import date
from typing import Literal

from django.core import signing
from django.core.signing import BadSignature
from django.db.models import F, FilteredRelation, Q, QuerySet
from django.http import HttpRequest
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import Field, Path, Query, Router, Schema, Status
from ninja.errors import HttpError
from pydantic import ValidationError

from api.schemas import CsrfCookie, CsrfHeader, ErrorOut
from vacancies.models import Vacancy, VacancyState
from vacancies.schemas import FeedOut, HiddenIn, HiddenOut, SavedIn, SavedOut, VacancyDetailOut


class FeedQuery(Schema):
    cursor: str | None = Field(None, description="Opaque cursor returned by the previous response.")
    limit: int = Field(20, ge=1, le=100, description="Number of vacancies to return.")


class FeedCursor(Schema):
    version: Literal[1] = 1
    posted_date: date | None
    vacancy_id: int


CURSOR_SALT = "careerlens.feed.cursor"


def decode_feed_cursor(value: str) -> FeedCursor:
    try:
        return FeedCursor.model_validate(signing.loads(value, salt=CURSOR_SALT))
    except BadSignature, ValidationError, TypeError:
        raise HttpError(422, "Invalid cursor.") from None


def encode_feed_cursor(vacancy: Vacancy) -> str:
    return signing.dumps(
        FeedCursor(posted_date=vacancy.posted_date, vacancy_id=vacancy.id).model_dump(mode="json"),
        salt=CURSOR_SALT,
        compress=True,
    )


feed_router = Router(tags=["feed"])


def feed_queryset(request: HttpRequest) -> QuerySet[Vacancy]:
    return (
        Vacancy.objects.select_related("company", "source")
        .alias(own_match=FilteredRelation("matches", condition=Q(matches__user=request.user)))
        .alias(own_state=FilteredRelation("vacancystate", condition=Q(vacancystate__user=request.user)))
        .annotate(
            match_score=F("own_match__score"),
            match_reason=F("own_match__reason"),
            match_evidence=F("own_match__evidence"),
            match_precise=F("own_match__precise"),
            match_scored_at=F("own_match__scored_at"),
            state_saved=F("own_state__saved"),
            state_hidden=F("own_state__hidden"),
            state_seen_at=F("own_state__seen_at"),
        )
    )


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
    vacancies = feed_queryset(request).order_by(F("posted_date").desc(nulls_last=True), "-id")
    if query.cursor:
        cursor = decode_feed_cursor(query.cursor)
        if cursor.posted_date:
            vacancies = vacancies.filter(
                Q(posted_date__lt=cursor.posted_date)
                | Q(posted_date=cursor.posted_date, id__lt=cursor.vacancy_id)
                | Q(posted_date__isnull=True)
            )
        else:
            vacancies = vacancies.filter(posted_date__isnull=True, id__lt=cursor.vacancy_id)

    items = list(vacancies[: query.limit + 1])
    has_more = len(items) > query.limit
    items = items[: query.limit]
    return {
        "items": items,
        "next_cursor": encode_feed_cursor(items[-1]) if has_more else None,
    }


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
    return get_object_or_404(feed_queryset(request), pk=vacancy_id)


@feed_router.post(
    "/feed/{vacancy_id}/saved",
    response={200: SavedOut, 401: ErrorOut, 403: ErrorOut, 404: ErrorOut},
    summary="Set saved state",
)
def set_saved(
    request: HttpRequest,
    payload: SavedIn,
    csrf_cookie: CsrfCookie,
    csrf_header: CsrfHeader,
    vacancy_id: int = Path(..., description="CareerLens vacancy identifier."),
) -> dict[str, bool]:
    """Sets the current user's saved flag idempotently. Requires a valid CSRF token."""
    vacancy = get_object_or_404(Vacancy, pk=vacancy_id)
    VacancyState.objects.update_or_create(
        user=request.user,
        vacancy=vacancy,
        defaults={"saved": payload.saved},
    )
    return {"saved": payload.saved}


@feed_router.post(
    "/feed/{vacancy_id}/hidden",
    response={200: HiddenOut, 401: ErrorOut, 403: ErrorOut, 404: ErrorOut},
    summary="Set hidden state",
)
def set_hidden(
    request: HttpRequest,
    payload: HiddenIn,
    csrf_cookie: CsrfCookie,
    csrf_header: CsrfHeader,
    vacancy_id: int = Path(..., description="CareerLens vacancy identifier."),
) -> dict[str, bool]:
    """Sets the current user's hidden flag idempotently. Requires a valid CSRF token."""
    vacancy = get_object_or_404(Vacancy, pk=vacancy_id)
    VacancyState.objects.update_or_create(
        user=request.user,
        vacancy=vacancy,
        defaults={"hidden": payload.hidden},
    )
    return {"hidden": payload.hidden}


@feed_router.post(
    "/feed/{vacancy_id}/seen",
    response={204: None, 401: ErrorOut, 403: ErrorOut, 404: ErrorOut},
    summary="Mark vacancy seen",
)
def mark_seen(
    request: HttpRequest,
    csrf_cookie: CsrfCookie,
    csrf_header: CsrfHeader,
    vacancy_id: int = Path(..., description="CareerLens vacancy identifier."),
) -> Status[None]:
    """Marks the vacancy seen once for the current user. Requires a valid CSRF token."""
    vacancy = get_object_or_404(Vacancy, pk=vacancy_id)
    state, _ = VacancyState.objects.get_or_create(user=request.user, vacancy=vacancy)
    if state.seen_at is None:
        state.seen_at = timezone.now()
        state.save(update_fields=["seen_at"])
    return Status(204, None)
