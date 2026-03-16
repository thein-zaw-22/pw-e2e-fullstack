"""
Root URL configuration.
All API endpoints are under /api/ prefix.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Django admin panel
    path('admin/', admin.site.urls),
    # User-related API endpoints (login, logout, profile, etc.)
    path('api/users/', include('users.urls')),
    # Item-related API endpoints (CRUD for products)
    path('api/items/', include('items.urls')),
]

# Serve uploaded media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
