from ninja import NinjaAPI

from api.health import health_router

api = NinjaAPI(openapi_url=None, docs_url=None, urls_namespace="careerlens-api")
api.add_router("", health_router)
