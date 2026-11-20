from ninja.errors import ValidationError


def body_validation_error(field: str, message: str) -> ValidationError:
    """Builds the same 422 payload Pydantic produces for a body field, so clients see one shape."""
    return ValidationError(
        [
            {
                "type": "value_error",
                "loc": ["body", "payload", field],
                "msg": f"Value error, {message}",
                "ctx": {"error": message},
            }
        ]
    )
