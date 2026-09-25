from django.db.models import QuerySet
from django.http import HttpRequest
from ninja import Router

from api.schemas import ErrorOut
from vacancies.models import Source
from vacancies.schemas import SourceOut

sources_router = Router(tags=["sources"])


@sources_router.get(
    "/sources",
    response={200: list[SourceOut], 401: ErrorOut},
    summary="List vacancy sources",
    openapi_extra={
        "responses": {
            200: {
                "content": {
                    "application/json": {
                        "example": [{"code": "dou", "name": "DOU", "icon_url": "/source-icons/dou.png"}]
                    }
                }
            },
            401: {"content": {"application/json": {"example": {"detail": "Unauthorized"}}}},
        }
    },
)
def sources(request: HttpRequest) -> QuerySet[Source]:
    """Returns the vacancy source catalogue ordered by name."""
    return Source.objects.catalog()
