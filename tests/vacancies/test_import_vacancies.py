import json
from io import StringIO
from pathlib import Path

import pytest
from django.apps import apps
from django.core.management import CommandError, call_command

DEMO_FIXTURE = Path(__file__).parents[2] / "src/vacancies/fixtures/demo_vacancies.json"


@pytest.mark.django_db
def test_import_vacancies_is_idempotent_and_updates_existing_records() -> None:
    vacancy_model = apps.get_model("vacancies", "Vacancy")
    first_output = StringIO()

    call_command("import_vacancies", DEMO_FIXTURE, stdout=first_output)

    assert first_output.getvalue().strip() == "created=4 updated=0"
    assert vacancy_model.objects.count() == 4
    vacancy = vacancy_model.objects.get(source__code="dou", external_id="demo-001")
    vacancy.title = "Stale title"
    vacancy.save(update_fields=["title"])
    second_output = StringIO()

    call_command("import_vacancies", DEMO_FIXTURE, stdout=second_output)

    vacancy.refresh_from_db()
    assert second_output.getvalue().strip() == "created=0 updated=4"
    assert vacancy_model.objects.count() == 4
    assert vacancy.title == "Python/Django Backend Engineer"
    assert vacancy_model.objects.get(source__code="telegram").url is None
    assert vacancy_model.objects.get(external_id="demo-004").company is None


@pytest.mark.django_db
def test_import_vacancies_rolls_back_invalid_payload(tmp_path: Path) -> None:
    vacancy_model = apps.get_model("vacancies", "Vacancy")
    payload = {
        "version": 1,
        "vacancies": [
            {
                "source": {"code": "dou", "name": "DOU"},
                "external_id": "valid",
                "title": "Backend Engineer",
                "company": "Demo Systems",
                "url": "https://example.test/jobs/valid",
                "posted_date": "2026-08-20",
                "description": "Build a Django service.",
            },
            {
                "source": {"code": "djinni", "name": "Djinni"},
                "external_id": "invalid",
                "title": 42,
                "company": None,
                "url": None,
                "posted_date": "2026-08-19",
                "description": "Build an API.",
            },
        ],
    }
    fixture = tmp_path / "invalid.json"
    fixture.write_text(json.dumps(payload), encoding="utf-8")

    with pytest.raises(CommandError, match="title"):
        call_command("import_vacancies", fixture)

    assert vacancy_model.objects.count() == 0


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("version", "posted_date", "error"),
    [(True, None, "version"), (1, "", "posted_date")],
)
def test_import_vacancies_rejects_ambiguous_scalars(
    tmp_path: Path,
    version: object,
    posted_date: object,
    error: str,
) -> None:
    payload = {
        "version": version,
        "vacancies": [
            {
                "source": {"code": "dou", "name": "DOU"},
                "external_id": "example",
                "title": "Backend Engineer",
                "company": None,
                "url": None,
                "posted_date": posted_date,
                "description": "Build a Django service.",
            }
        ],
    }
    fixture = tmp_path / "ambiguous.json"
    fixture.write_text(json.dumps(payload), encoding="utf-8")

    with pytest.raises(CommandError, match=error):
        call_command("import_vacancies", fixture)


@pytest.mark.django_db
def test_import_vacancies_rejects_url_longer_than_model_field(tmp_path: Path) -> None:
    payload = {
        "version": 1,
        "vacancies": [
            {
                "source": {"code": "dou", "name": "DOU"},
                "external_id": "example",
                "title": "Backend Engineer",
                "company": None,
                "url": f"https://example.test/{'a' * 1000}",
                "posted_date": None,
                "description": "Build a Django service.",
            }
        ],
    }
    fixture = tmp_path / "long-url.json"
    fixture.write_text(json.dumps(payload), encoding="utf-8")

    with pytest.raises(CommandError, match="url"):
        call_command("import_vacancies", fixture)
