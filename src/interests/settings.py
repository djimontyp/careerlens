from pydantic import Field

from config.settings.domains import SettingsModel


class InterestsSettings(SettingsModel):
    max_per_user: int = Field(default=10, ge=1, le=100)
