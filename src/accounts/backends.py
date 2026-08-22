import logging

from django.conf import settings
from django.contrib.auth.backends import BaseBackend
from django.db import transaction
from django.http import HttpRequest
from workos import WorkOSClient

from accounts.models import User, WorkOSIdentity

logger = logging.getLogger(__name__)


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
        if not subject:
            logger.warning("WorkOS authentication rejected: subject is missing")
            return None
        if not email:
            logger.warning("WorkOS authentication rejected: reason=missing_email")
            return None
        if not workos_user.email_verified:
            logger.warning("WorkOS authentication rejected: reason=email_not_verified")
            return None

        identity = WorkOSIdentity.objects.select_related("user").filter(subject=subject).first()
        if identity:
            user = identity.user
            if not user.is_active:
                logger.warning("WorkOS authentication rejected: reason=inactive_user")
                return None
            avatar_url = workos_user.profile_picture_url or ""
            if user.avatar_url != avatar_url:
                user.avatar_url = avatar_url
                user.save(update_fields=["avatar_url"])
            return user
        if User.objects.filter(email__iexact=email).exists():
            logger.warning("WorkOS authentication rejected: reason=email_already_exists")
            return None

        with transaction.atomic():
            user = User.objects.create_user(
                email=email,
                first_name=workos_user.first_name or "",
                last_name=workos_user.last_name or "",
                avatar_url=workos_user.profile_picture_url or "",
            )
            WorkOSIdentity.objects.create(user=user, subject=subject)
        return user

    def get_user(self, user_id: int) -> User | None:
        return User.objects.filter(pk=user_id, is_active=True).first()

    def authorization_url(self, redirect_uri: str, state: str) -> str:
        return self.client().user_management.get_authorization_url(
            provider="authkit",
            redirect_uri=redirect_uri,
            state=state,
        )

    def client(self) -> WorkOSClient:
        return WorkOSClient(api_key=settings.WORKOS_API_KEY, client_id=settings.WORKOS_CLIENT_ID)
