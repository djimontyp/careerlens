from ninja import Schema
from pydantic import ConfigDict


class MeOut(Schema):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "id": 1,
                    "email": "john.doe@example.com",
                    "first_name": "John",
                    "last_name": "Doe",
                }
            ]
        }
    )

    id: int
    email: str
    first_name: str
    last_name: str
