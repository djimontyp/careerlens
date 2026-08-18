from django.urls import URLPattern, path


class WorkOSProvider:
    name = "workos"
    login_url = "/login/"

    def url_patterns(self) -> list[URLPattern]:
        from accounts.views import CallbackView, LoginView

        return [
            path("login/", LoginView.as_view(), name="login"),
            path("callback/", CallbackView.as_view(), name="callback"),
        ]
