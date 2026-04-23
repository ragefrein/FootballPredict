"""
Django settings for EPL Predictor API
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "change-me-in-production-use-env-var"
)

DEBUG = os.environ.get("DEBUG", "True") == "True"

ALLOWED_HOSTS = os.environ.get(
    "ALLOWED_HOSTS",
    "localhost,127.0.0.1"
).split(",")

# ── INSTALLED APPS ─────────────────────────────
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "rest_framework",
    "corsheaders",

    "epl_api",
]

# ── MIDDLEWARE ────────────────────────────────
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",

    "django.contrib.sessions.middleware.SessionMiddleware",        # 🔥 WAJIB
    "corsheaders.middleware.CorsMiddleware",

    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",

    "django.contrib.auth.middleware.AuthenticationMiddleware",     # 🔥 WAJIB
    "django.contrib.messages.middleware.MessageMiddleware",        # 🔥 WAJIB

    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# ── URL CONFIG ────────────────────────────────
ROOT_URLCONF = "core.urls"

# ── TEMPLATES (WAJIB untuk admin & auth) ─────
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",          # 🔥 WAJIB
                "django.contrib.auth.context_processors.auth",          # 🔥 WAJIB
                "django.contrib.messages.context_processors.messages",  # 🔥 WAJIB
            ],
        },
    }
]

# ── WSGI ─────────────────────────────────────
WSGI_APPLICATION = "core.wsgi.application"

# ── DATABASE (WAJIB walaupun pakai Understat) ─
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# ── STATIC FILES ─────────────────────────────
STATIC_URL = "/static/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ── DJANGO REST FRAMEWORK ────────────────────
REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/minute",
    },
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
}

# ── CORS ─────────────────────────────────────
CORS_ALLOWED_ORIGINS = os.environ.get(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
).split(",")

CORS_ALLOW_METHODS = ["GET", "POST", "OPTIONS"]
CORS_ALLOW_HEADERS = ["accept", "content-type", "authorization"]

# ── CACHE ────────────────────────────────────
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "TIMEOUT": 300,
    }
}

# ── UNDERSTAT CONFIG ─────────────────────────
UNDERSTAT_CACHE_TIMEOUT = int(
    os.environ.get("UNDERSTAT_CACHE_TIMEOUT", "300")
)

SUPPORTED_LEAGUES = [
    "EPL",
    "La_Liga",
    "Bundesliga",
    "Serie_A",
    "Ligue_1",
    "RFPL",
]

CURRENT_SEASONS = {
    "EPL":        "2025",
    "La_Liga":    "2025",
    "Bundesliga": "2025",
    "Serie_A":    "2025",
    "Ligue_1":    "2025",
    "RFPL":       "2025",
}