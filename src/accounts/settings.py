from typing import Annotated, Any

from pydantic import AfterValidator, AnyHttpUrl, Field, SecretStr, model_validator

from config.settings.domains import SettingsModel, resolve_secret_file


def require_client_id_prefix(value: str | None) -> str | None:
    if value and not value.startswith("client_"):
        raise ValueError("APP__AUTH__WORKOS__CLIENT_ID must start with 'client_'")
    return value


def require_api_key_prefix(value: SecretStr | None) -> SecretStr | None:
    if value and not value.get_secret_value().startswith("sk_"):
        raise ValueError("APP__AUTH__WORKOS__API_KEY must start with 'sk_'")
    return value


WorkOSClientID = Annotated[str | None, AfterValidator(require_client_id_prefix)]
WorkOSAPIKey = Annotated[SecretStr | None, AfterValidator(require_api_key_prefix)]


class WorkOSAuthSettings(SettingsModel):
    enabled: bool = False
    client_id: WorkOSClientID = None
    api_key: WorkOSAPIKey = None
    redirect_uri: AnyHttpUrl | None = None

    @model_validator(mode="before")
    @classmethod
    def resolve_api_key_file(cls, data: Any) -> Any:
        return resolve_secret_file(data, "api_key")

    @model_validator(mode="after")
    def require_enabled_values(self) -> WorkOSAuthSettings:
        if not self.enabled:
            return self
        required = {
            "CLIENT_ID": self.client_id,
            "API_KEY": self.api_key,
            "REDIRECT_URI": self.redirect_uri,
        }
        for name, value in required.items():
            if value is None:
                raise ValueError(f"APP__AUTH__WORKOS__{name} is required when WorkOS authentication is enabled")
        return self

    @property
    def redirect_uri_value(self) -> str:
        return str(self.redirect_uri) if self.redirect_uri else ""


class AuthSettings(SettingsModel):
    workos: WorkOSAuthSettings = Field(default_factory=WorkOSAuthSettings)
