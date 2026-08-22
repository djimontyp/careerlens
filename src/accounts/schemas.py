from typing import Annotated

from ninja import Schema
from pydantic import ConfigDict, Field, HttpUrl


class MeOut(Schema):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "id": 1,
                    "email": "john.doe@example.com",
                    "first_name": "John",
                    "last_name": "Doe",
                    "avatar_url": "https://images.example.com/john.jpg",
                }
            ]
        }
    )

    id: int = Field(description="CareerLens user identifier.")
    email: Annotated[str, Field(description="Verified sign-in email address.", json_schema_extra={"format": "email"})]
    first_name: str = Field(description="Given name, or an empty string when unavailable.")
    last_name: str = Field(description="Family name, or an empty string when unavailable.")
    avatar_url: HttpUrl | None = Field(description="WorkOS profile image URL, or null when unavailable.")
