from django.conf import settings
from django.urls import path

from accounts.providers import active_url_providers
from accounts.views import LogoutView

urlpatterns = [path("logout/", LogoutView.as_view(), name="logout")]
urlpatterns += [
    pattern
    for provider in active_url_providers(workos_enabled=settings.AUTH_WORKOS_ENABLED)
    for pattern in provider.url_patterns()
]
