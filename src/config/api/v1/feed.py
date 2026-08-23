from typing import cast

from django.db.models import F, QuerySet
from django.http import HttpRequest
from ninja import Field, Query, Router, Schema
from ninja.pagination import PageNumberPagination

from api.schemas import ErrorOut
from vacancies.models import Vacancy
from vacancies.schemas import FeedOut


class FeedPagination(PageNumberPagination):
    class Input(Schema):
        page: int = Field(1, ge=1, description="One-based page number.")
        page_size: int | None = Field(None, ge=1, description="Items per page, capped at 100.")


feed_router = Router(tags=["feed"])


@feed_router.get(
    "/feed",
    response={200: FeedOut, 401: ErrorOut},
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
                                    "source": {"code": "dou", "name": "DOU"},
                                    "url": "https://example.com/jobs/42",
                                }
                            ],
                            "count": 1,
                        }
                    }
                }
            },
            401: {"content": {"application/json": {"example": {"detail": "Unauthorized"}}}},
        }
    },
)
def feed(request: HttpRequest, pagination: Query[FeedPagination.Input]) -> dict[str, object]:
    """Returns vacancies in stable newest-first order."""
    vacancies: QuerySet[Vacancy] = Vacancy.objects.select_related("company", "source").order_by(
        F("posted_date").desc(nulls_last=True),
        "-id",
    )
    return cast(
        dict[str, object],
        FeedPagination(page_size=20, max_page_size=100).paginate_queryset(
            vacancies,
            cast(PageNumberPagination.Input, pagination),
            request,
        ),
    )
