import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.http import HttpResponse
from django.test import Client
from django.test.utils import CaptureQueriesContext

from interests.models import Interest
from vacancies.models import Source, Vacancy, VacancyApplication, VacancyState

User = get_user_model()


def vacancy(source: Source, title: str, description: str = "Description") -> Vacancy:
    return Vacancy.objects.create(source=source, external_id=title, title=title, description=description)


def ids(response: HttpResponse) -> list[int]:
    return [item["id"] for item in response.json()["items"]]


@pytest.mark.django_db
def test_active_feed_shows_matches_saved_and_applied_but_never_hidden(django_assert_num_queries: object) -> None:
    dou = Source.objects.create(code="dou", name="DOU")
    djinni = Source.objects.create(code="djinni", name="Djinni")
    user = User.objects.create_user(email="ada@example.com")
    interest = Interest.objects.create(
        user=user, name="py", keywords=["python", "django"], stop_words=["senior", "lead"]
    )
    interest.sources.set([dou])
    Interest.objects.create(user=user, name="oss", keywords=["haskell", "elixir"])
    match = vacancy(dou, "Python developer")
    wrong_source = vacancy(djinni, "Python engineer")
    stopped = vacancy(dou, "Senior Python developer")
    saved_off_scope = vacancy(djinni, "Rust developer")
    applied_off_scope = vacancy(djinni, "Go developer")
    hidden_match = vacancy(dou, "Python backend")
    vacancy(dou, "Java developer")
    VacancyState.objects.create(user=user, vacancy=saved_off_scope, saved=True)
    VacancyApplication.objects.create(user=user, vacancy=applied_off_scope)
    VacancyState.objects.create(user=user, vacancy=hidden_match, hidden=True)
    client = Client()
    client.force_login(user)

    with django_assert_num_queries(5), CaptureQueriesContext(connection) as queries:
        response = client.get("/api/v1/feed")

    assert set(ids(response)) == {match.id, saved_off_scope.id, applied_off_scope.id}
    assert wrong_source.id not in ids(response) and stopped.id not in ids(response)
    feed_sql = next(
        query["sql"]
        for query in queries.captured_queries
        if "vacancies_vacancy" in query["sql"] and "~*" in query["sql"]
    )
    # 3 for the scoped interest (title, description, NOT stop-words) + 2 for the second
    # active interest (title, description, no stop words). One regex per keyword would
    # instead give (2*2+2) + (2*2) == 10, so this fails on that regression.
    assert feed_sql.count("~*") == 5


@pytest.mark.django_db
def test_without_active_interests_only_saved_and_applied_remain(django_assert_num_queries: object) -> None:
    dou = Source.objects.create(code="dou", name="DOU")
    user = User.objects.create_user(email="ada@example.com")
    Interest.objects.create(user=user, name="paused", keywords=["python"], is_active=False)
    vacancy(dou, "Python developer")
    saved = vacancy(dou, "Saved one")
    VacancyState.objects.create(user=user, vacancy=saved, saved=True)
    client = Client()
    client.force_login(user)

    with django_assert_num_queries(4):
        response = client.get("/api/v1/feed")

    assert ids(response) == [saved.id]


@pytest.mark.django_db
def test_other_users_interests_do_not_widen_my_feed() -> None:
    dou = Source.objects.create(code="dou", name="DOU")
    user = User.objects.create_user(email="ada@example.com")
    other = User.objects.create_user(email="grace@example.com")
    Interest.objects.create(user=other, name="go", keywords=["go"])
    Interest.objects.create(user=user, name="py", keywords=["python"])
    mine = vacancy(dou, "Python developer")
    vacancy(dou, "Go developer")
    client = Client()
    client.force_login(user)

    assert ids(client.get("/api/v1/feed")) == [mine.id]


@pytest.mark.django_db
def test_saved_and_hidden_modes_detail_and_state_ignore_the_interest_scope() -> None:
    dou = Source.objects.create(code="dou", name="DOU")
    user = User.objects.create_user(email="ada@example.com")
    Interest.objects.create(user=user, name="py", keywords=["python"])
    off_scope = vacancy(dou, "Go developer")
    VacancyState.objects.create(user=user, vacancy=off_scope, saved=True, hidden=False)
    hidden_off_scope = vacancy(dou, "Rust developer")
    VacancyState.objects.create(user=user, vacancy=hidden_off_scope, hidden=True)
    client = Client()
    client.force_login(user)

    assert ids(client.get("/api/v1/feed", {"mode": "saved"})) == [off_scope.id]
    assert ids(client.get("/api/v1/feed", {"mode": "hidden"})) == [hidden_off_scope.id]
    assert client.get(f"/api/v1/feed/{hidden_off_scope.id}").status_code == 200
    plain = vacancy(dou, "Elixir developer")
    client.get("/api/v1/me")
    patched = client.patch(
        f"/api/v1/feed/{plain.id}/state",
        data={"saved": True},
        content_type="application/json",
        headers={"X-CSRFToken": client.cookies["csrftoken"].value},
    )
    assert patched.status_code == 200
    assert plain.id in ids(client.get("/api/v1/feed"))


@pytest.mark.django_db
def test_cursor_pages_stay_disjoint_under_the_interest_scope() -> None:
    dou = Source.objects.create(code="dou", name="DOU")
    user = User.objects.create_user(email="ada@example.com")
    Interest.objects.create(user=user, name="py", keywords=["python"])
    expected = [vacancy(dou, f"Python developer {index}").id for index in range(5)]
    for index in range(5):
        vacancy(dou, f"Go developer {index}")
    client = Client()
    client.force_login(user)

    first = client.get("/api/v1/feed", {"limit": 2}).json()
    second = client.get("/api/v1/feed", {"limit": 2, "cursor": first["next_cursor"]}).json()
    third = client.get("/api/v1/feed", {"limit": 2, "cursor": second["next_cursor"]}).json()
    seen = [item["id"] for page in (first, second, third) for item in page["items"]]

    assert sorted(seen) == sorted(expected)
    assert len(seen) == len(set(seen))
    assert third["next_cursor"] is None
