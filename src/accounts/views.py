import secrets
import time

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth import login as django_login
from django.contrib.auth import logout as django_logout
from django.http import HttpRequest, HttpResponse
from django.shortcuts import redirect
from django.views import View
from workos import RateLimitExceededError, ServerError, WorkOSError

from accounts.backends import WorkOSBackend


class LoginView(View):
    def get(self, request: HttpRequest) -> HttpResponse:
        state = secrets.token_urlsafe(32)
        request.session["workos_oauth"] = {"state": state, "created_at": time.time()}
        return redirect(WorkOSBackend().authorization_url(settings.WORKOS_REDIRECT_URI, state))


class CallbackView(View):
    state_max_age = 600

    def get(self, request: HttpRequest) -> HttpResponse:
        oauth = request.session.pop("workos_oauth", None)
        state = request.GET.get("state", "")
        if not self.valid_state(oauth, state):
            return HttpResponse("Invalid authentication state", status=400)
        code = request.GET.get("code", "")
        if not code:
            return HttpResponse("Authentication failed", status=400)
        try:
            user = authenticate(request, code=code)
        except RateLimitExceededError:
            return HttpResponse("Too many authentication attempts", status=429)
        except ServerError:
            return HttpResponse("Authentication service unavailable", status=503)
        except WorkOSError:
            return HttpResponse("Authentication failed", status=400)
        if user is None:
            return HttpResponse("Authentication failed", status=400)
        django_login(request, user)
        return redirect(settings.LOGIN_REDIRECT_URL)

    def valid_state(self, oauth: object, state: str) -> bool:
        if not isinstance(oauth, dict):
            return False
        expected = oauth.get("state")
        created_at = oauth.get("created_at")
        if not isinstance(expected, str) or not isinstance(created_at, int | float):
            return False
        age = time.time() - created_at
        return 0 <= age <= self.state_max_age and secrets.compare_digest(expected, state)


class LogoutView(View):
    def post(self, request: HttpRequest) -> HttpResponse:
        django_logout(request)
        return redirect(settings.LOGIN_REDIRECT_URL)
