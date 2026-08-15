from config.settings.runtime import AppSettings

app_config = AppSettings()

DEBUG = app_config.django.debug
SECRET_KEY = app_config.django.secret_key.get_secret_value()
ALLOWED_HOSTS = list(app_config.django.allowed_hosts)
SITE_URL = app_config.core.site_url_value
DATABASES = {"default": app_config.database.django_config}

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
ASGI_APPLICATION = "config.asgi.application"

LANGUAGE_CODE = "uk"
TIME_ZONE = "Europe/Kyiv"
USE_I18N = True
USE_TZ = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

SESSION_COOKIE_SECURE = app_config.environment == "production"
CSRF_COOKIE_SECURE = app_config.environment == "production"
SECURE_SSL_REDIRECT = app_config.environment == "production"
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

if app_config.environment == "production":
    SECURE_HSTS_SECONDS = 31_536_000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
