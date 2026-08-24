from datetime import date, datetime
from pathlib import Path
from typing import Any

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from pydantic import BaseModel, ConfigDict, Field, HttpUrl, ValidationError

from vacancies.models import Company, Source, Vacancy, VacancyMatch

SOURCE_ICON_URLS = {
    "rabota": "/source-icons/rabota.png",
    "work": "/source-icons/work.png",
    "dou": "/source-icons/dou.png",
    "djinni": "/source-icons/djinni.png",
    "remoteok": "/source-icons/remoteok.png",
    "remotive": "/source-icons/remotive.png",
    "wwr": "/source-icons/wwr.png",
    "jooble": "/source-icons/jooble.png",
    "jobsua": "/source-icons/jobsua.png",
}


class SourcePayload(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    code: str = Field(min_length=1, max_length=20)
    name: str = Field(min_length=1, max_length=100)
    icon_url: str | None = Field(default=None, min_length=1, max_length=1000)


class MatchPayload(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    score: int = Field(ge=0, le=100)
    reason: str = ""
    evidence: dict[str, Any] = Field(default_factory=dict)
    precise: bool = False
    scored_at: datetime


class VacancyPayload(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    source: SourcePayload
    external_id: str = Field(min_length=1, max_length=50)
    title: str = Field(min_length=1, max_length=200)
    company: str | None = Field(default=None, min_length=1, max_length=200)
    company_is_deftech: bool = False
    is_deftech: bool = False
    url: HttpUrl | None = Field(default=None, max_length=1000)
    location: str | None = Field(default=None, min_length=1, max_length=500)
    posted_date: date | None = None
    scraped_at: datetime | None = None
    source_updated_at: datetime | None = None
    description: str = Field(min_length=1)
    match: MatchPayload | None = None


class ImportPayload(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    version: int = Field(strict=True, ge=1, le=1)
    vacancies: list[VacancyPayload]


class Command(BaseCommand):
    help = "Import vacancies from a versioned JSON file"

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("path", type=Path)
        parser.add_argument("--user-email")

    def handle(self, *args: Any, **options: Any) -> None:
        try:
            payload = ImportPayload.model_validate_json(options["path"].read_text(encoding="utf-8"))
            has_matches = any(item.match for item in payload.vacancies)
            if has_matches and not options["user_email"]:
                raise CommandError("--user-email is required when the payload contains matches")
            user = None
            if has_matches:
                user = get_user_model().objects.filter(email__iexact=options["user_email"]).first()
                if user is None:
                    raise CommandError("User not found")

            with transaction.atomic():
                created_count = 0
                updated_count = 0
                for item in payload.vacancies:
                    source_defaults: dict[str, str | None] = {
                        "name": item.source.name,
                        "icon_url": item.source.icon_url or SOURCE_ICON_URLS.get(item.source.code),
                    }
                    source, _ = Source.objects.update_or_create(
                        code=item.source.code,
                        defaults=source_defaults,
                    )
                    company = None
                    if item.company:
                        company_defaults = {}
                        if "company_is_deftech" in item.model_fields_set:
                            company_defaults["is_deftech"] = item.company_is_deftech
                        company, _ = Company.objects.update_or_create(
                            name=item.company,
                            defaults=company_defaults,
                        )
                    defaults = {
                        "company": company,
                        "title": item.title,
                        "url": str(item.url) if item.url else None,
                        "posted_date": item.posted_date,
                        "description": item.description,
                    }
                    if "location" in item.model_fields_set:
                        defaults["location"] = item.location
                    if "is_deftech" in item.model_fields_set:
                        defaults["is_deftech"] = item.is_deftech
                    if item.scraped_at is not None:
                        defaults["scraped_at"] = item.scraped_at
                    if "source_updated_at" in item.model_fields_set:
                        defaults["source_updated_at"] = item.source_updated_at
                    vacancy, created = Vacancy.objects.update_or_create(
                        source=source,
                        external_id=item.external_id,
                        defaults=defaults,
                    )
                    if item.match and user:
                        VacancyMatch.objects.update_or_create(
                            user=user,
                            vacancy=vacancy,
                            defaults=item.match.model_dump(),
                        )
                    created_count += created
                    updated_count += not created

                self.stdout.write(f"created={created_count} updated={updated_count}")
        except (OSError, ValidationError) as error:
            raise CommandError(f"Invalid vacancy payload: {error}") from error
