"""
Django settings for the demo product management app.
Uses environment variables for configuration so the same code works
in development, Docker, and production.
"""
import os
from pathlib import Path

# Base directory of the project (one level up from this file)
BASE_DIR = Path(__file__).resolve().parent.parent

# Secret key - CHANGE THIS in production!
SECRET_KEY = os.environ.get('SECRET_KEY', 'demo-secret-key-not-for-production')

# Debug mode - turn OFF in production
DEBUG = os.environ.get('DEBUG', 'True').lower() in ('true', '1', 'yes')

# Which hosts can access the app
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# All installed apps - Django built-ins + our custom apps
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party apps
    'rest_framework',            # Django REST Framework for building APIs
    'rest_framework.authtoken',  # Token-based authentication
    'corsheaders',               # Allow frontend to call our API
    # Our custom apps
    'app',
    'users',
    'items',
]

# Middleware - runs on every request/response
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # CORS must be before CommonMiddleware
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# URL configuration entry point
ROOT_URLCONF = 'config.urls'

# Template settings (needed for Django admin)
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# WSGI application
WSGI_APPLICATION = 'config.wsgi.application'

# Database configuration
# Uses PostgreSQL if DB_HOST is set, otherwise falls back to SQLite
DB_HOST = os.environ.get('DB_HOST', '')

if DB_HOST:
    # PostgreSQL - used in Docker and production
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME', 'demo_app'),
            'USER': os.environ.get('DB_USER', 'postgres'),
            'PASSWORD': os.environ.get('DB_PASSWORD', 'postgres'),
            'HOST': DB_HOST,
            'PORT': os.environ.get('DB_PORT', '5434'),
        }
    }
else:
    # SQLite - for simple local development without Docker
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Use our custom user model instead of Django's default
AUTH_USER_MODEL = 'users.CustomUser'

# Password validation rules
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
]

# Django REST Framework settings
REST_FRAMEWORK = {
    # Use token authentication for API requests
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    # Require authentication by default (can override per view)
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

# CORS settings - allow the frontend to call our API
CORS_ALLOWED_ORIGINS = os.environ.get(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:3000,http://localhost:5173'
).split(',')

# Also allow credentials (cookies, auth headers)
CORS_ALLOW_CREDENTIALS = True

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files (user uploads like avatars and attachments)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
