from accounts.providers.base import AuthProvider
from accounts.providers.workos import WorkOSProvider

AUTH_PROVIDERS: tuple[AuthProvider, ...] = (WorkOSProvider(),)


def active_url_providers(*, workos_enabled: bool) -> tuple[AuthProvider, ...]:
    return AUTH_PROVIDERS if workos_enabled else ()


def login_url(*, workos_enabled: bool) -> str | None:
    providers = active_url_providers(workos_enabled=workos_enabled)
    return providers[0].login_url if providers else None
