import pytest
from django.apps import apps
from django.db import connection


@pytest.mark.django_db
def test_vacancy_inserted_outside_orm_without_description_format_is_source_text() -> None:
    source_model = apps.get_model("vacancies", "Source")
    vacancy_model = apps.get_model("vacancies", "Vacancy")
    source = source_model.objects.create(code="dou", name="DOU")

    with connection.cursor() as cursor:
        cursor.execute(
            "INSERT INTO vacancies_vacancy "
            "(source_id, external_id, company_id, title, url, location, posted_date, description, "
            "is_deftech, scraped_at, source_updated_at) "
            "VALUES (%s, %s, NULL, %s, NULL, NULL, NULL, %s, FALSE, NOW(), NULL)",
            [source.pk, "371869", "ML Engineer", "Plain text description"],
        )

    assert vacancy_model.objects.get(source=source, external_id="371869").description_format == "source"
