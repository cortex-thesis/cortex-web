"""Django settings for the Cortex application."""
from pathlib import Path
import os
import sys
import socket
import ipaddress

import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "django-insecure-development-only")
DEBUG = os.environ.get("DJANGO_DEBUG", "true").lower() == "true"
ALLOWED_HOSTS = [host.strip() for host in os.environ.get(
    "DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,testserver"
).split(",") if host.strip()]
CSRF_TRUSTED_ORIGINS = [
    origin.strip() for origin in os.environ.get(
        "DJANGO_CSRF_TRUSTED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",") if origin.strip()
]

# Vite preserves the browser Host/Origin on LAN API requests.
if DEBUG:
    try:
        local_addresses = socket.gethostbyname_ex(socket.gethostname())[2]
    except OSError:
        local_addresses = []
    for address in local_addresses:
        if ipaddress.ip_address(address).is_private and address not in ALLOWED_HOSTS:
            ALLOWED_HOSTS.append(address)

if not DEBUG and SECRET_KEY == "django-insecure-development-only":
    raise RuntimeError("DJANGO_SECRET_KEY must be set when DEBUG is false.")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "web",
    "offline_sync",
]

MIDDLEWARE = [
    "offline_sync.middleware.InitializationMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "web.middleware.ClassSessionPresenceMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "cortex.urls"
TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [BASE_DIR / "templates"],
    "APP_DIRS": True,
    "OPTIONS": {
        "context_processors": [
            "django.template.context_processors.request",
            "django.contrib.auth.context_processors.auth",
            "django.contrib.messages.context_processors.messages",
        ],
    },
}]
WSGI_APPLICATION = "cortex.wsgi.application"
ASGI_APPLICATION = "cortex.asgi.application"

DATABASE_URL = os.environ.get("DATABASE_URL")
TEMPLATE_ONLY = os.environ.get("CORTEX_TEMPLATE_ONLY", "false").lower() == "true"

def _postgres_database_from_environment():
    """Build a PostgreSQL config without embedding credentials in source."""
    if not os.environ.get("DB_HOST"):
        return None
    sslmode = os.environ.get("DB_SSLMODE", "require")
    return {
        "ENGINE": "cortex.db_backends.postgresql",
        "NAME": os.environ.get("DB_NAME", "postgres"),
        "USER": os.environ.get("DB_USER", "postgres"),
        "PASSWORD": os.environ.get("DB_PASSWORD", ""),
        "HOST": os.environ["DB_HOST"],
        "PORT": os.environ.get("DB_PORT", "5432"),
        "CONN_MAX_AGE": int(os.environ.get("DATABASE_CONN_MAX_AGE", "120")),
        "CONN_HEALTH_CHECKS": os.environ.get("DATABASE_CONN_HEALTH_CHECKS", "true").lower() == "true",
        "OPTIONS": {
            "sslmode": sslmode,
            "connect_timeout": 10,
            "prepare_threshold": None,
            "options": f"-c search_path={os.environ.get('DB_SEARCH_PATH', 'public')}",
        },
    }

if "test" in sys.argv and not os.environ.get("CORTEX_TEST_POSTGRES"):
    DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
elif not TEMPLATE_ONLY and _postgres_database_from_environment():
    DATABASES = {"default": _postgres_database_from_environment()}
elif DATABASE_URL and not TEMPLATE_ONLY:
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            # Reuse the Supabase pooler connection instead of paying for a
            # new TCP/TLS/PostgreSQL handshake on every API request.
            conn_max_age=int(os.environ.get("DATABASE_CONN_MAX_AGE", "120")),
            conn_health_checks=os.environ.get("DATABASE_CONN_HEALTH_CHECKS", "true").lower() == "true",
            ssl_require=os.environ.get("DB_SSLMODE", "require") == "require",
        )
    }
    DATABASES["default"]["ENGINE"] = "cortex.db_backends.postgresql"
    # Compatible with Supabase's transaction-mode connection pooler.
    DATABASES["default"].setdefault("OPTIONS", {}).update({
        "prepare_threshold": None,
        "connect_timeout": 10,
        "sslmode": os.environ.get("DB_SSLMODE", "require"),
        "options": f"-c search_path={os.environ.get('DB_SEARCH_PATH', 'django,public')}",
    })
elif TEMPLATE_ONLY:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            # Keep local migration state between management commands and
            # across the development server's auto-reloads.
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
else:
    # Local development fallback when no hosted database is configured.
    if not DEBUG:
        raise RuntimeError("DATABASE_URL must be set to the Supabase PostgreSQL connection string in production.")
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# Keep cloud credentials server-side. Requests never fall back to the cloud in
# offline mode: only the worker uses this alias.
OFFLINE_SYNC_ENABLED = os.environ.get("CORTEX_OFFLINE_SYNC", "false").lower() == "true" and "test" not in sys.argv
OFFLINE_SYNC_INTERVAL = max(5, int(os.environ.get("CORTEX_SYNC_INTERVAL", "300")))
if OFFLINE_SYNC_ENABLED and "test" not in sys.argv:
    if TEMPLATE_ONLY or DATABASES["default"]["ENGINE"] == "django.db.backends.sqlite3":
        raise RuntimeError("Offline sync requires Supabase DB_* or DATABASE_URL and CORTEX_TEMPLATE_ONLY=false.")
    DATABASES["cloud"] = DATABASES["default"]
    DATABASES["cloud"]["CONN_MAX_AGE"] = 0
    # A full replica cycle reads every shared table. Supabase poolers can need
    # more than a few seconds to establish a connection or return larger
    # snapshots, especially after an idle project resumes. Keep the limits
    # bounded, but allow enough time for legitimate team synchronization.
    cloud_connect_timeout = max(5, int(os.environ.get("CORTEX_CLOUD_CONNECT_TIMEOUT", "15")))
    cloud_statement_timeout = max(5000, int(os.environ.get("CORTEX_CLOUD_STATEMENT_TIMEOUT_MS", "60000")))
    cloud_lock_timeout = max(2000, int(os.environ.get("CORTEX_CLOUD_LOCK_TIMEOUT_MS", "10000")))
    DATABASES["cloud"]["OPTIONS"]["connect_timeout"] = cloud_connect_timeout
    DATABASES["cloud"]["OPTIONS"]["options"] += (
        f" -c statement_timeout={cloud_statement_timeout} -c lock_timeout={cloud_lock_timeout}"
    )
    local_database = Path(os.environ.get("CORTEX_LOCAL_DATABASE", BASE_DIR / ".runtime" / "offline.sqlite3"))
    local_database.parent.mkdir(parents=True, exist_ok=True)
    DATABASES["default"] = {
        "ENGINE": "django.db.backends.sqlite3", "NAME": local_database,
        "OPTIONS": {"timeout": 10, "transaction_mode": "IMMEDIATE"},
    }
DATABASE_ROUTERS = ["offline_sync.router.SyncRouter"]

AUTH_PASSWORD_VALIDATORS = []
if not DEBUG:
    AUTH_PASSWORD_VALIDATORS = [
        {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
        {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 12}},
        {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    ]

SESSION_COOKIE_HTTPONLY = True
SESSION_ENGINE = "django.contrib.sessions.backends.signed_cookies"
CSRF_COOKIE_HTTPONLY = False
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_REFERRER_POLICY = "same-origin"
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
EEG_RAW_RETENTION_DAYS = int(os.environ.get("EEG_RAW_RETENTION_DAYS", "30"))
EEG_PROCESSED_RETENTION_DAYS = int(os.environ.get("EEG_PROCESSED_RETENTION_DAYS", "90"))
ARCHIVED_MEDIA_RETENTION_DAYS = int(os.environ.get("ARCHIVED_MEDIA_RETENTION_DAYS", "30"))
if not DEBUG:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Manila"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATICFILES_DIRS = [BASE_DIR / "frontend_dist"] if (BASE_DIR / "frontend_dist").exists() else []
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# EEG signal data is intentionally separate from both PostgreSQL and MEDIA_ROOT.
EEG_DATA_ROOT = Path(os.environ.get("EEG_DATA_ROOT", BASE_DIR / "local-data"))
EEG_RAW_SUBDIR = os.environ.get("EEG_RAW_SUBDIR", "raw")
EEG_PROCESSED_SUBDIR = os.environ.get("EEG_PROCESSED_SUBDIR", "processed")
EEG_MODEL_SUBDIR = os.environ.get("EEG_MODEL_SUBDIR", "models")
EEG_TEMP_SUBDIR = os.environ.get("EEG_TEMP_SUBDIR", "temp")

SUPABASE_STORAGE_ENDPOINT = os.environ.get("SUPABASE_STORAGE_ENDPOINT")
if SUPABASE_STORAGE_ENDPOINT and "test" not in sys.argv:
    storage_access_key = os.environ.get("SUPABASE_STORAGE_ACCESS_KEY")
    storage_secret_key = os.environ.get("SUPABASE_STORAGE_SECRET_KEY")
    storage_bucket = os.environ.get("SUPABASE_STORAGE_BUCKET", "private-content")
    if not storage_access_key or not storage_secret_key:
        raise RuntimeError("Supabase Storage access and secret keys are required when SUPABASE_STORAGE_ENDPOINT is set.")
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3.S3Storage",
            "OPTIONS": {
                "access_key": storage_access_key,
                "secret_key": storage_secret_key,
                "bucket_name": storage_bucket,
                "endpoint_url": SUPABASE_STORAGE_ENDPOINT,
                "region_name": os.environ.get("SUPABASE_STORAGE_REGION"),
                "signature_version": "s3v4",
                "addressing_style": "path",
                "default_acl": None,
                "querystring_auth": True,
                "file_overwrite": False,
            },
        },
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    }
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

if OFFLINE_SYNC_ENABLED:
    if SUPABASE_STORAGE_ENDPOINT and "test" not in sys.argv:
        from botocore.config import Config
        STORAGES["cloud_media"] = STORAGES["default"]
        STORAGES["cloud_media"]["OPTIONS"]["client_config"] = Config(
            connect_timeout=3, read_timeout=10, retries={"max_attempts": 1},
            signature_version="s3v4", s3={"addressing_style": "path"},
        )
    else:
        STORAGES = {"staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"}}
    STORAGES["default"] = {"BACKEND": "django.core.files.storage.FileSystemStorage"}
