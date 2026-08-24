from datetime import date, datetime
from typing import Any

from ninja import Schema
from pydantic import ConfigDict, Field, HttpUrl


class SourceOut(Schema):
    code: str = Field(description="Stable source code.")
    name: str = Field(description="Human-readable source name.")
    icon_url: str | None = Field(description="Source icon URL, or null when unavailable.")


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
                    "scraped_at": "2026-08-21T10:30:00Z",
                    "source_updated_at": "2026-08-21T11:45:00Z",
                    "is_deftech": True,
                    "source": {"code": "dou", "name": "DOU", "icon_url": "/source-icons/dou.png"},
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
    scraped_at: datetime = Field(description="Time when CareerLens imported the vacancy.")
    source_updated_at: datetime | None = Field(description="Last source update time, or null when unavailable.")
    is_deftech: bool = Field(description="Whether the vacancy or its company is classified as DefTech.")
    source: SourceOut = Field(description="Vacancy source.")
    url: HttpUrl | None = Field(description="Original vacancy URL, or null when unavailable.")

    @staticmethod
    def resolve_company(obj: Any) -> str | None:
        return obj.company.name if obj.company else None

    @staticmethod
    def resolve_is_deftech(obj: Any) -> bool:
        return obj.is_deftech or bool(obj.company and obj.company.is_deftech)


class FeedOut(Schema):
    items: list[VacancyOut] = Field(description="Vacancies in stable newest-first order.")
    next_cursor: str | None = Field(description="Opaque cursor for the next page, or null at the end.")
