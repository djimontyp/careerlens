import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from vacancies.models import Source

User = get_user_model()


def test_sources_require_session() -> None:
    response = Client().get("/api/v1/sources")

    assert response.status_code == 401


@pytest.mark.django_db
def test_sources_list_the_catalogue_by_name_and_are_empty_before_the_first_import() -> None:
    client = Client()
    client.force_login(User.objects.create_user(email="ada@example.com"))

    assert client.get("/api/v1/sources").json() == []

    Source.objects.create(code="djinni", name="Djinni")
    Source.objects.create(code="dou", name="DOU", icon_url="/source-icons/dou.png")

    assert client.get("/api/v1/sources").json() == [
        {"code": "djinni", "name": "Djinni", "icon_url": None},
        {"code": "dou", "name": "DOU", "icon_url": "/source-icons/dou.png"},
    ]
