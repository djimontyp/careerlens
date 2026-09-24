from typing import Any

from ninja import CookieEx, HeaderEx, P, Schema
from pydantic import ConfigDict, Field


class ErrorOut(Schema):
    model_config = ConfigDict(json_schema_extra={"examples": [{"detail": "Unauthorized"}]})

    detail: str = Field(description="Human-readable reason the request was rejected.")


class ValidationIssueOut(Schema):
    type: str = Field(description="Machine-readable validation error code, for example string_too_long.")
    loc: list[str | int] = Field(description="Path to the invalid input, including its request source and field name.")
    msg: str = Field(description="Human-readable explanation of the invalid input.")
    ctx: dict[str, Any] | None = Field(
        default=None,
        description="Optional validation context, such as max_length; omitted when the validator supplies no context.",
    )


class ValidationErrorOut(Schema):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "detail": [
                        {
                            "type": "string_too_long",
                            "loc": ["body", "payload", "note"],
                            "msg": "String should have at most 4096 characters",
                            "ctx": {"max_length": 4096},
                        }
                    ]
                }
            ]
        }
    )

    detail: list[ValidationIssueOut] = Field(description="Validation errors identifying why the request was rejected.")


CsrfCookie = CookieEx[str, P(alias="csrftoken", description="CSRF cookie issued by GET /api/v1/me.")]
CsrfHeader = HeaderEx[str, P(alias="X-CSRFToken", description="Value matching the csrftoken cookie.")]
