import logging
from typing import Literal

from django.db import DatabaseError, connection
from django.http import HttpRequest
from ninja import Router, Schema, Status
from pydantic import ConfigDict

logger = logging.getLogger(__name__)

health_router = Router()


class HealthResponse(Schema):
    model_config = ConfigDict(json_schema_extra={"examples": [{"status": "ok"}]})

    status: Literal["ok", "error"]


@health_router.get(
    "/health",
    auth=None,
    response={200: HealthResponse, 503: HealthResponse},
    url_name="health",
    summary="Health check probe",
    description=(
        "Unauthenticated probe for load balancers and uptime monitors. "
        "Returns 200 when the application and dependencies are healthy, "
        "503 when unavailable."
    ),
)
def health(request: HttpRequest) -> HealthResponse | Status[HealthResponse]:
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except DatabaseError:
        logger.exception("Health dependency check failed")
        return Status(503, HealthResponse(status="error"))

    return HealthResponse(status="ok")
