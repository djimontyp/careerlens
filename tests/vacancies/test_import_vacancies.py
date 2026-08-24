import json
from io import StringIO
from pathlib import Path

import pytest
from django.apps import apps
from django.contrib.auth import get_user_model
from django.core.management import CommandError, call_command

DEMO_FIXTURE = Path(__file__).parents[2] / "src/vacancies/fixtures/demo_vacancies.json"


@pytest.mark.django_db
def test_import_vacancies_is_idempotent_and_updates_existing_records() -> None:
    vacancy_model = apps.get_model("vacancies", "Vacancy")
    match_model = apps.get_model("vacancies", "VacancyMatch")
    user = get_user_model().objects.create_user(email="demo@example.com")
    first_output = StringIO()

    call_command("import_vacancies", DEMO_FIXTURE, user_email=user.email, stdout=first_output)

    assert first_output.getvalue().strip() == "created=4 updated=0"
    assert vacancy_model.objects.count() == 4
    assert list(match_model.objects.order_by("vacancy__external_id").values_list("score", "precise")) == [
        (92, True),
        (68, True),
        (34, False),
    ]
    vacancy = vacancy_model.objects.get(source__code="dou", external_id="demo-001")
    vacancy.title = "Stale title"
    vacancy.save(update_fields=["title"])
    second_output = StringIO()

    call_command("import_vacancies", DEMO_FIXTURE, user_email=user.email, stdout=second_output)

    vacancy.refresh_from_db()
    assert second_output.getvalue().strip() == "created=0 updated=4"
    assert vacancy_model.objects.count() == 4
    assert vacancy.title == "Python/Django Backend Engineer"
    assert vacancy.location == "Remote, Ukraine"
    assert vacancy.company.is_deftech is False
    assert vacancy.is_deftech is True
    assert vacancy.scraped_at.isoformat() == "2026-08-20T10:30:00+00:00"
    assert vacancy.source_updated_at.isoformat() == "2026-08-21T08:15:00+00:00"
    assert vacancy.source.icon_url == "/source-icons/dou.png"
    assert vacancy_model.objects.get(source__code="djinni").source.icon_url == "/source-icons/djinni.png"
    agency_vacancy = vacancy_model.objects.get(source__code="djinni")
    assert agency_vacancy.company.is_deftech is True
    assert agency_vacancy.is_deftech is False
    assert vacancy_model.objects.get(source__code="telegram").url is None
    vacancy_without_company = vacancy_model.objects.get(external_id="demo-004")
    assert vacancy_without_company.company is None
    assert vacancy_without_company.location is None


@pytest.mark.django_db
def test_import_vacancies_preserves_fields_omitted_by_legacy_v1(tmp_path: Path) -> None:
    vacancy_model = apps.get_model("vacancies", "Vacancy")
    user = get_user_model().objects.create_user(email="demo@example.com")
    call_command("import_vacancies", DEMO_FIXTURE, user_email=user.email)
    payload = json.loads(DEMO_FIXTURE.read_text(encoding="utf-8"))
    for vacancy in payload["vacancies"]:
        vacancy.pop("location")
        vacancy.pop("company_is_deftech", None)
        vacancy.pop("is_deftech")
        vacancy.pop("scraped_at")
        vacancy.pop("source_updated_at")
        vacancy.pop("match", None)
    legacy_fixture = tmp_path / "legacy-v1.json"
    legacy_fixture.write_text(json.dumps(payload), encoding="utf-8")

    call_command("import_vacancies", legacy_fixture)

    vacancy = vacancy_model.objects.get(source__code="dou", external_id="demo-001")
    assert vacancy.location == "Remote, Ukraine"
    assert vacancy.is_deftech is True
    assert vacancy.source_updated_at is not None
    assert vacancy_model.objects.get(source__code="djinni").company.is_deftech is True


@pytest.mark.django_db
def test_import_vacancies_requires_an_explicit_user_for_demo_matches() -> None:
    with pytest.raises(CommandError, match="--user-email"):
        call_command("import_vacancies", DEMO_FIXTURE)

    assert apps.get_model("vacancies", "Vacancy").objects.count() == 0


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
