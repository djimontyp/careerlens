from django.urls import URLPattern, URLResolver, path

from api import api

urlpatterns: list[URLPattern | URLResolver] = [
    path("", api.urls),
]
