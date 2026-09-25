from datetime import datetime
from typing import Annotated, Any

from ninja import Schema
from pydantic import ConfigDict, Field, StringConstraints, ValidationInfo, field_validator, model_validator

from interests.matching import normalize_tokens
from interests.models import MAX_NAME_LENGTH, MAX_TOKEN_LENGTH, MAX_TOKENS
from interests.services import TokenOverlap, overlapping_tokens
from vacancies.models import SOURCE_CODE_MAX_LENGTH
from vacancies.schemas import SourceOut

MAX_SOURCES = 30
SourceCode = Annotated[str, Field(min_length=1, max_length=SOURCE_CODE_MAX_LENGTH)]
InterestName = Annotated[str, StringConstraints(strip_whitespace=True, max_length=MAX_NAME_LENGTH)]

INTEREST_EXAMPLE: dict[str, Any] = {
    "id": 7,
    "name": "Python backend",
    "keywords": ["python", "django"],
    "stop_words": ["senior"],
    "sources": [{"code": "dou", "name": "DOU", "icon_url": "/source-icons/dou.png"}],
    "is_active": True,
    "created_at": "2026-09-24T10:00:00Z",
}


def validate_tokens(values: list[str]) -> list[str]:
    tokens = normalize_tokens(values)
    if len(tokens) > MAX_TOKENS:
        raise ValueError(f"At most {MAX_TOKENS} tokens are allowed")
    for token in tokens:
        if len(token) > MAX_TOKEN_LENGTH:
            raise ValueError(f"Token is longer than {MAX_TOKEN_LENGTH} characters: {token}")
        if not any(character.isalnum() for character in token):
            raise ValueError(f"Token must contain a letter or digit: {token}")
    return tokens


def validate_source_codes(values: list[str]) -> list[str]:
    codes: list[str] = []
    for value in values:
        code = value.strip()
        if code and code not in codes:
            codes.append(code)
    return codes


class InterestIn(Schema):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "name": "Python backend",
                    "keywords": ["python", "django"],
                    "stop_words": ["senior"],
                    "sources": ["dou"],
                }
            ]
        },
    )

    name: InterestName = Field("", description="Display name; derived from the first two keywords when empty.")
    keywords: list[str] = Field(
        description=(
            "Whole words matched case-insensitively in the title or description; whitespace is collapsed and "
            f"case-insensitive duplicates removed, then 1 to {MAX_TOKENS} tokens remain, each at most "
            f"{MAX_TOKEN_LENGTH} characters and containing a letter or digit."
        )
    )
    stop_words: list[str] = Field(
        default_factory=list,
        description=(
            "Whole words that exclude a vacancy when found in its title; whitespace is collapsed and "
            f"case-insensitive duplicates removed, then 0 to {MAX_TOKENS} tokens remain, each at most "
            f"{MAX_TOKEN_LENGTH} characters and containing a letter or digit; must not overlap keywords."
        ),
    )
    sources: list[SourceCode] = Field(
        default_factory=list, max_length=MAX_SOURCES, description="Source codes to search; empty means every source."
    )

    @field_validator("keywords")
    @classmethod
    def normalize_keywords(cls, value: list[str]) -> list[str]:
        tokens = validate_tokens(value)
        if not tokens:
            raise ValueError("At least one keyword is required")
        return tokens

    @field_validator("stop_words")
    @classmethod
    def normalize_stop_words(cls, value: list[str], info: ValidationInfo) -> list[str]:
        tokens = validate_tokens(value)
        keywords = info.data.get("keywords")
        if keywords:
            overlap = overlapping_tokens(keywords, tokens)
            if overlap:
                raise TokenOverlap(overlap)
        return tokens

    @field_validator("sources")
    @classmethod
    def normalize_sources(cls, value: list[str]) -> list[str]:
        return validate_source_codes(value)


class InterestPatchIn(Schema):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [{"is_active": False}, {"keywords": ["python", "fastapi"]}, {"name": "", "sources": []}]
        },
    )

    name: InterestName | None = Field(None, description="New display name; empty string re-derives it from keywords.")
    keywords: list[str] | None = Field(
        None,
        description=(
            "Replacement keywords when supplied; whitespace is collapsed and case-insensitive duplicates "
            f"removed, then 1 to {MAX_TOKENS} tokens remain, each at most {MAX_TOKEN_LENGTH} characters and "
            "containing a letter or digit."
        ),
    )
    stop_words: list[str] | None = Field(
        None,
        description=(
            "Replacement stop words when supplied; an empty list clears them. Whitespace is collapsed and "
            f"case-insensitive duplicates removed, then 0 to {MAX_TOKENS} tokens remain, each at most "
            f"{MAX_TOKEN_LENGTH} characters and containing a letter or digit; must not overlap keywords."
        ),
    )
    sources: list[SourceCode] | None = Field(
        None,
        max_length=MAX_SOURCES,
        description="Replacement source codes when supplied; an empty list means every source.",
    )
    is_active: bool | None = Field(None, description="False pauses the interest, true resumes it.")

    @field_validator("keywords")
    @classmethod
    def normalize_keywords(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        tokens = validate_tokens(value)
        if not tokens:
            raise ValueError("At least one keyword is required")
        return tokens

    @field_validator("stop_words")
    @classmethod
    def normalize_stop_words(cls, value: list[str] | None, info: ValidationInfo) -> list[str] | None:
        if value is None:
            return None
        tokens = validate_tokens(value)
        keywords = info.data.get("keywords")
        if keywords:
            overlap = overlapping_tokens(keywords, tokens)
            if overlap:
                raise TokenOverlap(overlap)
        return tokens

    @field_validator("sources")
    @classmethod
    def normalize_sources(cls, value: list[str] | None) -> list[str] | None:
        return validate_source_codes(value) if value is not None else None

    @model_validator(mode="after")
    def require_change(self) -> InterestPatchIn:
        if not self.model_fields_set:
            raise ValueError("At least one field is required")
        return self


class InterestOut(Schema):
    model_config = ConfigDict(json_schema_extra={"examples": [INTEREST_EXAMPLE]})

    id: int = Field(description="Interest identifier.")
    name: str = Field(description="Display name.")
    keywords: list[str] = Field(description="Normalised keywords.")
    stop_words: list[str] = Field(description="Normalised stop words.")
    sources: list[SourceOut] = Field(description="Selected sources; empty means every source.")
    is_active: bool = Field(description="False while the interest is paused.")
    created_at: datetime = Field(description="Creation time.")


class InterestListOut(Schema):
    model_config = ConfigDict(json_schema_extra={"examples": [{"items": [INTEREST_EXAMPLE], "limit": 10}]})

    items: list[InterestOut] = Field(description="Interests of the current user, active first, newest first.")
    limit: int = Field(description="Maximum number of interests one user may keep.")
