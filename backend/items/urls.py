"""URL routes for item-related API endpoints."""
from django.urls import path
from . import views

urlpatterns = [
    # List all items or create a new one
    path('', views.item_list_create, name='item-list-create'),
    # Get, update, or delete a specific item by ID
    path('<int:pk>/', views.item_detail, name='item-detail'),
]
