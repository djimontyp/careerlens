from typing import Literal, Self

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from config.settings.domains import CoreSettings, DjangoSettings, PostgresDatabaseSettings


class AppSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="APP__",
        env_nested_delimiter="__",
        env_ignore_empty=True,
        extra="forbid",
        frozen=True,
        hide_input_in_errors=True,
        validate_default=True,
    )

    environment: Literal["development", "test", "production"]
    django: DjangoSettings
    core: CoreSettings = Field(default_factory=CoreSettings)
    database: PostgresDatabaseSettings

    @model_validator(mode="after")
    def validate_production(self) -> Self:
        if self.environment != "production":
            return self
        if self.django.debug:
            raise ValueError("APP__DJANGO__DEBUG must be false in production")
        if not self.django.secret_key.get_secret_value():
            raise ValueError("APP__DJANGO__SECRET_KEY must not be empty in production")
        if not self.django.allowed_hosts or "*" in self.django.allowed_hosts:
            raise ValueError("APP__DJANGO__ALLOWED_HOSTS must contain explicit production hosts")
        if self.core.site_url.scheme != "https":
            raise ValueError("APP__CORE__SITE_URL must use HTTPS in production")
        return self
