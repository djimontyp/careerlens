from pydantic import Field

from config.settings.domains import SettingsModel


class InterestsSettings(SettingsModel):
    max_per_user: int = Field(
        default=10,
        ge=1,
        le=16,
        description=(
            "Maximum interests one user may keep, active or paused. Every active interest adds two distinct "
            "regular expressions to the feed query (keywords and stop words), and PostgreSQL caches only 32 "
            "compiled expressions per connection, so 16 interests is the ceiling before feed time degrades."
        ),
    )
