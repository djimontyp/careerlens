import pytest
from django.contrib.auth import get_user_model

from interests.matching import normalize_tokens, word_boundary_pattern
from interests.models import Interest
from vacancies.models import Source, Vacancy

User = get_user_model()


@pytest.mark.parametrize(
    ("values", "expected"),
    [
        (["python", " go "], ["python", "go"]),
        (["python", "", "  ", "Python", "PYTHON"], ["python"]),
        (["data   science"], ["data science"]),
        (["Розробник", "розробник"], ["Розробник"]),
        ([], []),
    ],
)
def test_normalize_tokens_trims_collapses_and_dedupes_case_insensitively(
    values: list[str], expected: list[str]
) -> None:
    assert normalize_tokens(values) == expected


@pytest.mark.parametrize(
    ("tokens", "expected"),
    [
        (["go"], r"(^|[^[:alnum:]])go([^[:alnum:]]|$)"),
        ([".NET"], r"\.NET([^[:alnum:]]|$)"),
        (["C++"], r"(^|[^[:alnum:]])C\+\+"),
        (["a|b"], r"(^|[^[:alnum:]])a\|b([^[:alnum:]]|$)"),
        (["go", "C++"], r"(^|[^[:alnum:]])go([^[:alnum:]]|$)|(^|[^[:alnum:]])C\+\+"),
    ],
)
def test_word_boundary_pattern_escapes_and_bounds_alphanumeric_edges(tokens: list[str], expected: str) -> None:
    assert word_boundary_pattern(tokens) == expected


def test_word_boundary_pattern_rejects_empty_token_list() -> None:
    with pytest.raises(ValueError):
        word_boundary_pattern([])


def make_vacancy(source: Source, title: str, description: str = "Description") -> Vacancy:
    return Vacancy.objects.create(source=source, external_id=title, title=title, description=description)


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("keywords", "matching", "not_matching"),
    [
        (["go"], ["Go developer", "Go/Golang engineer"], ["Google Ads manager", "Golang dev", "Django developer"]),
        (["java"], ["Java backend"], ["JavaScript frontend"]),
        (["C++"], ["C++ developer", "C++11 expert", "Objective-C++ dev"], ["MC++ thing"]),
        (["C#"], ["C# developer", "C#/.NET engineer"], ["Vitamin CSharp"]),
        ([".NET"], [".NET developer", "ASP.NET Core developer"], ["dot.network guy"]),
        (["node.js"], ["Node.js developer"], ["node.jsx wizard"]),
        (["data science"], ["Senior Data Science lead"], ["Data Sciences teacher"]),
        (["front-end"], ["Front-end developer"], ["Frontend developer"]),
        (["розробник"], ["Розробник Python", "менеджер-розробник", "РОЗРОБНИК"], ["Розробника Python", "Тестувальник"]),
        (["зір"], ["комп’ютерний зір"], ["зіркова кар’єра"]),
        (["a.*b"], ["a.*b literal"], ["a XYZ b"]),
        (["a|b"], ["a|b dev"], ["a dev", "b dev"]),
        (["go", "C++"], ["Go developer", "C++11 expert"], ["Google Ads manager", "MC++ thing"]),
    ],
)
def test_keywords_match_whole_words_case_insensitively(
    keywords: list[str], matching: list[str], not_matching: list[str]
) -> None:
    source = Source.objects.create(code="dou", name="DOU")
    interest = Interest.objects.create(
        user=User.objects.create_user(email="ada@example.com"), name="x", keywords=keywords
    )
    expected = {make_vacancy(source, title).id for title in matching}
    for title in not_matching:
        make_vacancy(source, title)

    assert set(Vacancy.objects.filter(interest.vacancy_filter()).values_list("id", flat=True)) == expected


@pytest.mark.django_db
def test_keywords_match_in_description_but_stop_words_only_in_title() -> None:
    source = Source.objects.create(code="dou", name="DOU")
    user = User.objects.create_user(email="ada@example.com")
    interest = Interest.objects.create(user=user, name="x", keywords=["python"], stop_words=["senior"])
    in_description = make_vacancy(source, "Backend role", "We use Python daily")
    senior_in_title = make_vacancy(source, "Senior Python developer")
    senior_in_description = make_vacancy(source, "Python developer", "You will work with senior engineers")

    matched = set(Vacancy.objects.filter(interest.vacancy_filter()).values_list("id", flat=True))

    assert matched == {in_description.id, senior_in_description.id}
    assert senior_in_title.id not in matched


@pytest.mark.django_db
def test_sources_narrow_the_match_and_empty_sources_mean_all() -> None:
    dou = Source.objects.create(code="dou", name="DOU")
    djinni = Source.objects.create(code="djinni", name="Djinni")
    user = User.objects.create_user(email="ada@example.com")
    everywhere = Interest.objects.create(user=user, name="all", keywords=["python"])
    only_dou = Interest.objects.create(user=user, name="dou", keywords=["python"])
    only_dou.sources.set([dou])
    on_dou = make_vacancy(dou, "Python developer")
    on_djinni = make_vacancy(djinni, "Python engineer")

    assert set(Vacancy.objects.filter(everywhere.vacancy_filter()).values_list("id", flat=True)) == {
        on_dou.id,
        on_djinni.id,
    }
    assert set(Vacancy.objects.filter(only_dou.vacancy_filter()).values_list("id", flat=True)) == {on_dou.id}


@pytest.mark.django_db
def test_queryset_filter_ors_interests_and_is_fail_closed_when_empty() -> None:
    source = Source.objects.create(code="dou", name="DOU")
    user = User.objects.create_user(email="ada@example.com")
    Interest.objects.create(user=user, name="py", keywords=["python"])
    Interest.objects.create(user=user, name="go", keywords=["go"], is_active=False)
    python = make_vacancy(source, "Python developer")
    make_vacancy(source, "Go developer")
    make_vacancy(source, "Rust developer")

    active_scope = Interest.objects.for_user(user).active().vacancy_filter()
    assert set(Vacancy.objects.filter(active_scope).values_list("id", flat=True)) == {python.id}
    assert not Vacancy.objects.filter(Interest.objects.none().vacancy_filter()).exists()


@pytest.mark.django_db
def test_vacancy_filter_tolerates_a_queryset_that_already_prefetched_sources() -> None:
    source = Source.objects.create(code="dou", name="DOU")
    user = User.objects.create_user(email="ada@example.com")
    Interest.objects.create(user=user, name="py", keywords=["python"])
    python = make_vacancy(source, "Python developer")

    scope = Interest.objects.for_user(user).with_sources().vacancy_filter()

    assert set(Vacancy.objects.filter(scope).values_list("id", flat=True)) == {python.id}
