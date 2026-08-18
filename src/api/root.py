from ninja import NinjaAPI

from api.health import health_router
from config.api.v1.accounts import accounts_router

api = NinjaAPI(openapi_url=None, docs_url=None, urls_namespace="careerlens-api")
api.add_router("", health_router)
api.add_router("/api/v1", accounts_router)
