from ninja import Schema
from pydantic import ConfigDict, Field


class ErrorOut(Schema):
    model_config = ConfigDict(json_schema_extra={"examples": [{"detail": "Unauthorized"}]})

    detail: str = Field(description="Human-readable reason the request was rejected.")
