from django.urls import URLPattern, URLResolver, include, path

from api import api

urlpatterns: list[URLPattern | URLResolver] = [
    path("", include("accounts.urls")),
    path("", api.urls),
]
