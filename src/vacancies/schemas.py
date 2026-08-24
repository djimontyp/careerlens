from datetime import date, datetime
from typing import Any, Literal

from ninja import Schema
from pydantic import ConfigDict, Field, HttpUrl


class SourceOut(Schema):
    code: str = Field(description="Stable source code.")
    name: str = Field(description="Human-readable source name.")
    icon_url: str | None = Field(description="Source icon URL, or null when unavailable.")


class MatchEvidenceItemOut(Schema):
    type: Literal["strong", "partial", "gaps", "unknown"] = Field(description="Evidence category.")
    label: str = Field(description="Short evidence label.")
    explanation: str = Field(description="Evidence explanation, or an empty string when unavailable.")


class MatchEvidenceOut(Schema):
    items: list[MatchEvidenceItemOut] = Field(description="Structured evidence supporting the match result.")
    evidence_coverage: float = Field(ge=0, le=1, description="Share of requirements covered by evidence.")


class MatchOut(Schema):
    score: int = Field(ge=0, le=100, description="Personal match percentage.")
    reason: str = Field(description="Short explanation of the score.")
    evidence: MatchEvidenceOut = Field(description="Structured evidence supporting the score.")
    precise: bool = Field(description="Whether the score meets the precise-match evidence contract.")
    scored_at: datetime = Field(description="Time when this result was produced.")


class SavedIn(Schema):
    model_config = ConfigDict(json_schema_extra={"examples": [{"saved": True}]})

    saved: bool = Field(description="Whether the vacancy is saved.")


class SavedOut(Schema):
    model_config = ConfigDict(json_schema_extra={"examples": [{"saved": True}]})

    saved: bool = Field(description="Confirmed saved state.")


class HiddenIn(Schema):
    model_config = ConfigDict(json_schema_extra={"examples": [{"hidden": True}]})

    hidden: bool = Field(description="Whether the vacancy is hidden.")


class HiddenOut(Schema):
    model_config = ConfigDict(json_schema_extra={"examples": [{"hidden": True}]})

    hidden: bool = Field(description="Confirmed hidden state.")


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
                    "saved": True,
                    "hidden": False,
                    "seen": True,
                    "match": {
                        "score": 86,
                        "reason": "Strong Python and Django overlap.",
                        "evidence": {
                            "items": [
                                {
                                    "type": "strong",
                                    "label": "Python",
                                    "explanation": "Five years of experience.",
                                }
                            ],
                            "evidence_coverage": 0.86,
                        },
                        "precise": True,
                        "scored_at": "2026-08-21T12:00:00Z",
                    },
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
    match: MatchOut | None = Field(description="Current user's match result, or null when not scored.")
    saved: bool = Field(description="Whether the current user saved the vacancy.")
    hidden: bool = Field(description="Whether the current user hid the vacancy.")
    seen: bool = Field(description="Whether the current user opened the vacancy.")

    @staticmethod
    def resolve_company(obj: Any) -> str | None:
        return obj.company.name if obj.company else None

    @staticmethod
    def resolve_is_deftech(obj: Any) -> bool:
        return obj.is_deftech or bool(obj.company and obj.company.is_deftech)

    @staticmethod
    def resolve_match(obj: Any) -> dict[str, Any] | None:
        if obj.match_score is None:
            return None
        return {
            "score": obj.match_score,
            "reason": obj.match_reason,
            "evidence": obj.match_evidence,
            "precise": obj.match_precise,
            "scored_at": obj.match_scored_at,
        }

    @staticmethod
    def resolve_saved(obj: Any) -> bool:
        return bool(obj.state_saved)

    @staticmethod
    def resolve_hidden(obj: Any) -> bool:
        return bool(obj.state_hidden)

    @staticmethod
    def resolve_seen(obj: Any) -> bool:
        return obj.state_seen_at is not None


class FeedOut(Schema):
    items: list[VacancyOut] = Field(description="Vacancies in stable newest-first order.")
    next_cursor: str | None = Field(description="Opaque cursor for the next page, or null at the end.")


class VacancyDetailOut(VacancyOut):
    description: str = Field(description="Vacancy description safe for direct text rendering.")
    description_status: Literal["markdown", "source"] = Field(description="Description representation.")

    @staticmethod
    def resolve_description_status(obj: Any) -> Literal["source"]:
        return "source"
