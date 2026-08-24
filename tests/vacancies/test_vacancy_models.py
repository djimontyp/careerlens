import pytest
from django.apps import apps
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.db.models import ProtectedError


@pytest.mark.django_db
def test_source_code_is_unique() -> None:
    source_model = apps.get_model("vacancies", "Source")
    source_model.objects.create(code="robota", name="Robota.ua")

    with pytest.raises(IntegrityError):
        source_model.objects.create(code="robota", name="Other Robota")


@pytest.mark.django_db
def test_company_name_is_unique() -> None:
    company_model = apps.get_model("vacancies", "Company")
    company_model.objects.create(name="CareerLens")

    with pytest.raises(IntegrityError):
        company_model.objects.create(name="CareerLens")


@pytest.mark.django_db
def test_vacancy_uses_catalog_foreign_keys_and_external_identity() -> None:
    company_model = apps.get_model("vacancies", "Company")
    source_model = apps.get_model("vacancies", "Source")
    vacancy_model = apps.get_model("vacancies", "Vacancy")
    source = source_model.objects.create(code="robota", name="Robota.ua")
    company = company_model.objects.create(name="CareerLens")
    vacancy_model.objects.create(
        source=source,
        external_id="123",
        title="Backend Engineer",
        company=company,
        url="https://example.com/jobs/123",
        description="Build the backend.",
    )
    other_source = source_model.objects.create(code="djinni", name="Djinni")
    vacancy_model.objects.create(
        source=other_source,
        external_id="123",
        title="Backend Engineer",
        company=company,
        url="https://example.com/jobs/124",
        description="Build the backend.",
    )
    vacancy_model.objects.create(
        source=source,
        external_id="456",
        title="Backend Engineer",
        company=company,
        url="https://example.com/jobs/456",
        description="Build the backend.",
    )

    with pytest.raises(IntegrityError):
        vacancy_model.objects.create(
            source=source,
            external_id="123",
            title="Other Backend Engineer",
            company=company,
            url="https://example.com/jobs/456",
            description="Another description.",
        )


@pytest.mark.django_db
def test_source_is_protected_and_company_deletion_clears_vacancy() -> None:
    company_model = apps.get_model("vacancies", "Company")
    source_model = apps.get_model("vacancies", "Source")
    vacancy_model = apps.get_model("vacancies", "Vacancy")
    source = source_model.objects.create(code="robota", name="Robota.ua")
    company = company_model.objects.create(name="CareerLens")
    vacancy = vacancy_model.objects.create(
        source=source,
        external_id="123",
        title="Backend Engineer",
        company=company,
        url="https://example.com/jobs/123",
        description="Build the backend.",
    )

    with pytest.raises(ProtectedError):
        source.delete()

    company.delete()
    vacancy.refresh_from_db()

    assert vacancy.company_id is None


@pytest.mark.django_db
def test_vacancy_state_is_unique_per_user_and_vacancy() -> None:
    source_model = apps.get_model("vacancies", "Source")
    vacancy_model = apps.get_model("vacancies", "Vacancy")
    vacancy_state_model = apps.get_model("vacancies", "VacancyState")
    user = get_user_model().objects.create_user(email="ada@example.com")
    source = source_model.objects.create(code="robota", name="Robota.ua")
    vacancy = vacancy_model.objects.create(
        source=source,
        external_id="123",
        title="Backend Engineer",
        url="https://example.com/jobs/123",
        description="Build the backend.",
    )
    vacancy_state_model.objects.create(user=user, vacancy=vacancy)
    other_user = get_user_model().objects.create_user(email="grace@example.com")
    other_vacancy = vacancy_model.objects.create(
        source=source,
        external_id="456",
        title="Other Backend Engineer",
        url="https://example.com/jobs/456",
        description="Build the backend.",
    )
    vacancy_state_model.objects.create(user=other_user, vacancy=vacancy)
    vacancy_state_model.objects.create(user=user, vacancy=other_vacancy)

    with pytest.raises(IntegrityError):
        vacancy_state_model.objects.create(user=user, vacancy=vacancy)


@pytest.mark.django_db
def test_vacancy_state_allows_saved_and_hidden_together() -> None:
    source_model = apps.get_model("vacancies", "Source")
    vacancy_model = apps.get_model("vacancies", "Vacancy")
    vacancy_state_model = apps.get_model("vacancies", "VacancyState")
    user = get_user_model().objects.create_user(email="ada@example.com")
    source = source_model.objects.create(code="robota", name="Robota.ua")
    vacancy = vacancy_model.objects.create(
        source=source,
        external_id="123",
        title="Backend Engineer",
        url="https://example.com/jobs/123",
        description="Build the backend.",
    )

    state = vacancy_state_model.objects.create(user=user, vacancy=vacancy, saved=True, hidden=True)

    assert state.saved is True
    assert state.hidden is True


@pytest.mark.django_db
def test_vacancy_allows_missing_url() -> None:
    source_model = apps.get_model("vacancies", "Source")
    vacancy_model = apps.get_model("vacancies", "Vacancy")
    source = source_model.objects.create(code="telegram", name="Telegram")
    vacancy = vacancy_model.objects.create(
        source=source,
        external_id="123",
        title="Backend Engineer",
        url=None,
        description="Build the backend.",
    )

    vacancy.refresh_from_db()

    assert vacancy.url is None


@pytest.mark.django_db
def test_catalog_and_state_models_have_meaningful_strings() -> None:
    company_model = apps.get_model("vacancies", "Company")
    source_model = apps.get_model("vacancies", "Source")
    vacancy_model = apps.get_model("vacancies", "Vacancy")
    vacancy_state_model = apps.get_model("vacancies", "VacancyState")
    user = get_user_model().objects.create_user(email="ada@example.com")
    source = source_model.objects.create(code="robota", name="Robota.ua")
    company = company_model.objects.create(name="CareerLens")
    vacancy = vacancy_model.objects.create(
        source=source,
        external_id="123",
        title="Backend Engineer",
        company=company,
        url="https://example.com/jobs/123",
        description="Build the backend.",
    )
    state = vacancy_state_model.objects.create(user=user, vacancy=vacancy)

    assert str(source) == "Robota.ua"
    assert str(company) == "CareerLens"
    assert str(vacancy) == "robota:123"
    assert str(state) == f"VacancyState({state.pk})"


@pytest.mark.django_db
@pytest.mark.parametrize("score", [-1, 101])
def test_vacancy_match_rejects_scores_outside_percentage_range(score: int) -> None:
    source = apps.get_model("vacancies", "Source").objects.create(code="dou", name="DOU")
    vacancy = apps.get_model("vacancies", "Vacancy").objects.create(
        source=source,
        external_id=str(score),
        title="Python Developer",
        description="Build the backend.",
    )
    match = apps.get_model("vacancies", "VacancyMatch")(
        user=get_user_model().objects.create_user(email=f"user-{score}@example.com"),
        vacancy=vacancy,
        score=score,
    )

    with pytest.raises(ValidationError):
        match.full_clean()
