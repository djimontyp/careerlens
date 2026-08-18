from typing import Protocol

from django.urls import URLPattern


class AuthProvider(Protocol):
    name: str
    login_url: str

    def url_patterns(self) -> list[URLPattern]: ...
