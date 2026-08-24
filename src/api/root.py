from ninja import NinjaAPI
from ninja.security import SessionAuth

from api.health import health_router
from config.api.v1.accounts import accounts_router
from config.api.v1.feed import feed_router

api = NinjaAPI(
    auth=SessionAuth(),
    title="CareerLens API",
    description="Session-authenticated HTTP API for the CareerLens web application.",
    version="1.0.0",
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    urls_namespace="careerlens-api",
    openapi_extra={
        "tags": [
            {"name": "accounts", "description": "Current-user session and account operations."},
            {"name": "feed", "description": "Vacancy feed operations."},
            {"name": "health", "description": "Public service health probes."},
        ]
    },
)
api.add_router("", health_router)
api.add_router("/api/v1", accounts_router)
api.add_router("/api/v1", feed_router)
