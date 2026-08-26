from collections.abc import Callable

from django.conf import settings
from django.contrib.auth import login
from django.http import HttpRequest, HttpResponseBase

from accounts.models import User


class DevAutoLoginMiddleware:
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponseBase]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponseBase:
        if settings.DEV_AUTOLOGIN and not request.user.is_authenticated:
            user, _ = User.objects.get_or_create(email="dev@local", defaults={"first_name": "Dev"})
            login(request, user, backend="accounts.backends.WorkOSBackend")
        return self.get_response(request)
