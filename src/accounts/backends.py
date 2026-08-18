from django.conf import settings
from django.contrib.auth.backends import BaseBackend
from django.db import transaction
from django.http import HttpRequest
from workos import WorkOSClient

from accounts.models import User, WorkOSIdentity


class WorkOSBackend(BaseBackend):
    def authenticate(
        self,
        request: HttpRequest | None,
        code: str | None = None,
        **kwargs: object,
    ) -> User | None:
        if not code:
            return None
        response = self.client().user_management.authenticate_with_code(code=code)
        workos_user = response.user
        subject = workos_user.id.strip()
        email = workos_user.email.strip().lower()
        if not subject or not email or not workos_user.email_verified:
            return None

        identity = WorkOSIdentity.objects.select_related("user").filter(subject=subject).first()
        if identity:
            return identity.user if identity.user.is_active else None
        if User.objects.filter(email__iexact=email).exists():
            return None

        with transaction.atomic():
            user = User.objects.create_user(
                email=email,
                first_name=workos_user.first_name or "",
                last_name=workos_user.last_name or "",
            )
            WorkOSIdentity.objects.create(user=user, subject=subject)
        return user

    def get_user(self, user_id: int) -> User | None:
        return User.objects.filter(pk=user_id).first()

    def authorization_url(self, redirect_uri: str, state: str) -> str:
        return self.client().user_management.get_authorization_url(
            provider="authkit",
            redirect_uri=redirect_uri,
            state=state,
        )

    def client(self) -> WorkOSClient:
        return WorkOSClient(api_key=settings.WORKOS_API_KEY, client_id=settings.WORKOS_CLIENT_ID)
