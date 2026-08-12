from pathlib import Path
from typing import Any

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field, SecretStr, model_validator


def resolve_secret_file(data: object, field_name: str) -> object:
    if not isinstance(data, dict):
        return data

    values = data.copy()
    file_field_name = f"{field_name}_file"
    secret_file = values.pop(file_field_name, None)
    if secret_file is None:
        return values
    if field_name in values:
        raise ValueError(f"only one of {field_name} and {file_field_name} may be set")
    if not isinstance(secret_file, str):
        raise ValueError(f"{file_field_name} must be a string path")

    try:
        values[field_name] = Path(secret_file).read_text(encoding="utf-8").rstrip("\r\n")
    except OSError as error:
        raise ValueError(f"{file_field_name} cannot be read") from error
    return values


class SettingsModel(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        frozen=True,
        hide_input_in_errors=True,
        validate_default=True,
    )


class DjangoSettings(SettingsModel):
    debug: bool = False
    secret_key: SecretStr
    allowed_hosts: tuple[str, ...]

    @model_validator(mode="before")
    @classmethod
    def resolve_secret_key_file(cls, data: Any) -> Any:
        return resolve_secret_file(data, "secret_key")


class CoreSettings(SettingsModel):
    site_url: AnyHttpUrl = AnyHttpUrl("http://localhost:9000")

    @property
    def site_url_value(self) -> str:
        return str(self.site_url).rstrip("/")


class PostgresDatabaseSettings(SettingsModel):
    database: str = Field(min_length=1)
    user: str = Field(min_length=1)
    password: SecretStr = Field(min_length=1)
    host: str = Field(min_length=1)
    port: int = Field(default=5432, ge=1, le=65535)

    @model_validator(mode="before")
    @classmethod
    def resolve_password_file(cls, data: Any) -> Any:
        return resolve_secret_file(data, "password")

    @property
    def django_config(self) -> dict[str, str | int]:
        return {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": self.database,
            "USER": self.user,
            "PASSWORD": self.password.get_secret_value(),
            "HOST": self.host,
            "PORT": self.port,
        }
