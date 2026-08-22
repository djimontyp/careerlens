from ninja import NinjaAPI
from ninja.security import SessionAuth

from api.health import health_router
from config.api.v1.accounts import accounts_router

api = NinjaAPI(
    auth=SessionAuth(),
    title="CareerLens API",
    description="Session-authenticated HTTP API for the CareerLens web application.",
    version="1.0.0",
    openapi_url=None,
    docs_url=None,
    urls_namespace="careerlens-api",
    openapi_extra={
        "tags": [
            {"name": "accounts", "description": "Current-user session and account operations."},
            {"name": "health", "description": "Public service health probes."},
        ]
    },
)
api.add_router("", health_router)
api.add_router("/api/v1", accounts_router)
