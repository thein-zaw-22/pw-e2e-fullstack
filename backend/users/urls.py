"""URL routes for user-related API endpoints."""
from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('forgot-password/', views.forgot_password_view, name='forgot-password'),
    path('profile/', views.profile_view, name='profile'),
]
