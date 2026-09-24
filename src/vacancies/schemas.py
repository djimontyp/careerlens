from datetime import date, datetime
from typing import Any, Literal, cast

from django.utils import timezone
from ninja import Schema
from pydantic import ConfigDict, Field, HttpUrl, field_validator, model_validator


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


class VacancyStateIn(Schema):
    model_config = ConfigDict(json_schema_extra={"examples": [{"saved": True}, {"hidden": False}, {"seen": True}]})

    saved: bool | None = Field(None, description="New saved state when supplied.")
    hidden: bool | None = Field(None, description="New hidden state when supplied.")
    seen: Literal[True] | None = Field(None, description="Marks the vacancy as seen; this cannot be reverted.")

    @model_validator(mode="after")
    def require_change(self) -> VacancyStateIn:
        if self.saved is None and self.hidden is None and self.seen is None:
            raise ValueError("At least one state field is required")
        return self


class VacancyStateOut(Schema):
    model_config = ConfigDict(json_schema_extra={"examples": [{"saved": True, "hidden": False, "seen": True}]})

    saved: bool = Field(description="Confirmed saved state.")
    hidden: bool = Field(description="Confirmed hidden state.")
    seen: bool = Field(description="Whether the vacancy has been opened.")

    @staticmethod
    def resolve_seen(obj: Any) -> bool:
        return obj.seen_at is not None


class VacancyNoteIn(Schema):
    model_config = ConfigDict(json_schema_extra={"examples": [{"note": "Ask about the on-call rotation."}]})

    note: str = Field(
        max_length=4096,
        description="The current user's private note, up to 4096 characters. An empty value removes the note.",
    )


class VacancyNoteOut(Schema):
    model_config = ConfigDict(json_schema_extra={"examples": [{"note": "Ask about the on-call rotation."}]})

    note: str = Field(description="The current user's saved private note, or an empty string after removal.")


MIN_APPLICATION_SUBMITTED_AT = date(2000, 1, 1)


class VacancyApplicationIn(Schema):
    model_config = ConfigDict(
        json_schema_extra={"examples": [{"submitted_at": "2026-08-22", "cover_letter": "My motivation."}]}
    )

    submitted_at: date = Field(
        description="Calendar date when the current user submitted the application; "
        "not earlier than 2000-01-01 and not later than today in Europe/Kyiv."
    )
    cover_letter: str = Field(
        "",
        max_length=4096,
        description="Optional private copy of the submitted cover letter, up to 4096 characters.",
    )

    @field_validator("submitted_at")
    @classmethod
    def reject_out_of_range_dates(cls, value: date) -> date:
        if value < MIN_APPLICATION_SUBMITTED_AT:
            raise ValueError(f"Submission date cannot be earlier than {MIN_APPLICATION_SUBMITTED_AT.isoformat()}.")
        if value > timezone.localdate():
            raise ValueError("Submission date cannot be in the future.")
        return value


class VacancyApplicationOut(Schema):
    model_config = ConfigDict(
        json_schema_extra={"examples": [{"submitted_at": "2026-08-22", "cover_letter": "My motivation."}]}
    )

    submitted_at: date = Field(description="Calendar date when the current user submitted the application.")
    cover_letter: str = Field(description="The current user's private cover letter copy.")


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
                    "has_note": True,
                    "application_submitted_at": "2026-08-22",
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
    has_note: bool = Field(description="Whether the current user has a note for the vacancy.")
    application_submitted_at: date | None = Field(
        description="Calendar date, in the project's local time zone, when the current user submitted an "
        "application, or null when not submitted."
    )

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

    @staticmethod
    def resolve_has_note(obj: Any) -> bool:
        return obj.note_id is not None

    @staticmethod
    def resolve_application_submitted_at(obj: Any) -> date | None:
        if obj.application_submitted_at is None:
            return None
        return timezone.localtime(obj.application_submitted_at).date()


class FeedOut(Schema):
    items: list[VacancyOut] = Field(description="Vacancies in stable newest-first order.")
    next_cursor: str | None = Field(description="Opaque cursor for the next page, or null at the end.")


class VacancyDetailOut(VacancyOut):
    description: str = Field(description="Complete vacancy description supplied by the source or stored as Markdown.")
    description_status: Literal["markdown", "source"] = Field(
        description="Stored description representation: Markdown or unformatted source text."
    )
    note: str = Field(description="The current user's private note, or an empty string when none exists.")
    application: VacancyApplicationOut | None = Field(
        description="The current user's application record, or null when the vacancy has not been marked as applied."
    )

    @staticmethod
    def resolve_description_status(obj: Any) -> Literal["markdown", "source"]:
        return cast(Literal["markdown", "source"], obj.description_format)

    @staticmethod
    def resolve_note(obj: Any) -> str:
        return obj.note_text or ""

    @staticmethod
    def resolve_application(obj: Any) -> dict[str, Any] | None:
        if obj.application_submitted_at is None:
            return None
        return {
            "submitted_at": timezone.localtime(obj.application_submitted_at).date(),
            "cover_letter": obj.application_cover_letter or "",
        }
