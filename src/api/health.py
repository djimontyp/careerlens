import logging
from typing import Literal

from django.db import DatabaseError, connection
from django.http import HttpRequest
from ninja import Router, Schema, Status

logger = logging.getLogger(__name__)

health_router = Router()


class HealthResponse(Schema):
    status: Literal["ok", "error"]


@health_router.get("/health", auth=None, response={200: HealthResponse, 503: HealthResponse}, url_name="health")
def health(request: HttpRequest) -> HealthResponse | Status[HealthResponse]:
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except DatabaseError:
        logger.exception("Health dependency check failed")
        return Status(503, HealthResponse(status="error"))

    return HealthResponse(status="ok")
