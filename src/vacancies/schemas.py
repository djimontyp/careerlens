from datetime import date
from typing import Any

from ninja import Schema
from pydantic import ConfigDict, Field, HttpUrl


class SourceOut(Schema):
    code: str = Field(description="Stable source code.")
    name: str = Field(description="Human-readable source name.")


class VacancyOut(Schema):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "id": 42,
                    "title": "Python Developer",
                    "company": "Acme",
                    "location": "Remote",
                    "posted_date": "2026-08-21",
                    "source": {"code": "dou", "name": "DOU"},
                    "url": "https://example.com/jobs/42",
                }
            ]
        }
    )

    id: int = Field(description="CareerLens vacancy identifier.")
    title: str = Field(description="Vacancy title.")
    company: str | None = Field(description="Company name, or null when unavailable.")
    location: str | None = Field(description="Vacancy location, or null when unavailable.")
    posted_date: date | None = Field(description="Source publication date, or null when unavailable.")
    source: SourceOut = Field(description="Vacancy source.")
    url: HttpUrl | None = Field(description="Original vacancy URL, or null when unavailable.")

    @staticmethod
    def resolve_company(obj: Any) -> str | None:
        return obj.company.name if obj.company else None


class FeedOut(Schema):
    items: list[VacancyOut] = Field(description="Vacancies in stable newest-first order.")
    next_cursor: str | None = Field(description="Opaque cursor for the next page, or null at the end.")
