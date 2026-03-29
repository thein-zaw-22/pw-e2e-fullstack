"""
Root URL configuration.
All API endpoints are under /api/ prefix.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.db import connection


def health_check(request):
    """Health check endpoint for ALB/ECS. Verifies DB connection."""
    try:
        connection.ensure_connection()
        return JsonResponse({'status': 'healthy'}, status=200)
    except Exception as e:
        return JsonResponse({'status': 'unhealthy', 'error': str(e)}, status=503)


urlpatterns = [
    # Health check for load balancer
    path('api/health/', health_check),
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
