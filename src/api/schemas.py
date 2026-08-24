from ninja import CookieEx, HeaderEx, P, Schema
from pydantic import ConfigDict, Field


class ErrorOut(Schema):
    model_config = ConfigDict(json_schema_extra={"examples": [{"detail": "Unauthorized"}]})

    detail: str = Field(description="Human-readable reason the request was rejected.")


CsrfCookie = CookieEx[str, P(alias="csrftoken", description="CSRF cookie issued by GET /api/v1/me.")]
CsrfHeader = HeaderEx[str, P(alias="X-CSRFToken", description="Value matching the csrftoken cookie.")]
