"""Register the Item model with Django admin."""
from django.contrib import admin
from .models import Item


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'price', 'created_by', 'created_at']
    list_filter = ['category', 'created_at']
    search_fields = ['name', 'description']
