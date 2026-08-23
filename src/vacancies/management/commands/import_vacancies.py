from datetime import date
from pathlib import Path
from typing import Any

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from pydantic import BaseModel, ConfigDict, Field, HttpUrl, ValidationError

from vacancies.models import Company, Source, Vacancy


class SourcePayload(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    code: str = Field(min_length=1, max_length=20)
    name: str = Field(min_length=1, max_length=100)


class VacancyPayload(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    source: SourcePayload
    external_id: str = Field(min_length=1, max_length=50)
    title: str = Field(min_length=1, max_length=200)
    company: str | None = Field(default=None, min_length=1, max_length=200)
    url: HttpUrl | None = Field(default=None, max_length=1000)
    location: str | None = Field(default=None, min_length=1, max_length=500)
    posted_date: date | None = None
    description: str = Field(min_length=1)


class ImportPayload(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    version: int = Field(strict=True, ge=1, le=1)
    vacancies: list[VacancyPayload]


class Command(BaseCommand):
    help = "Import vacancies from a versioned JSON file"

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("path", type=Path)

    def handle(self, *args: Any, **options: Any) -> None:
        try:
            payload = ImportPayload.model_validate_json(options["path"].read_text(encoding="utf-8"))

            with transaction.atomic():
                created_count = 0
                updated_count = 0
                for item in payload.vacancies:
                    source, _ = Source.objects.update_or_create(
                        code=item.source.code,
                        defaults={"name": item.source.name},
                    )
                    company = None
                    if item.company:
                        company, _ = Company.objects.get_or_create(name=item.company)
                    defaults = {
                        "company": company,
                        "title": item.title,
                        "url": str(item.url) if item.url else None,
                        "posted_date": item.posted_date,
                        "description": item.description,
                    }
                    if "location" in item.model_fields_set:
                        defaults["location"] = item.location
                    _, created = Vacancy.objects.update_or_create(
                        source=source,
                        external_id=item.external_id,
                        defaults=defaults,
                    )
                    created_count += created
                    updated_count += not created

                self.stdout.write(f"created={created_count} updated={updated_count}")
        except (OSError, ValidationError) as error:
            raise CommandError(f"Invalid vacancy payload: {error}") from error
