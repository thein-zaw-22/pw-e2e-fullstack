"""
Serializers for item (product) data.
Converts between Python objects and JSON for the API.
"""
from rest_framework import serializers
from .models import Item


class ItemSerializer(serializers.ModelSerializer):
    """Serializer for item data, includes the creator's email for display."""

    # Show the creator's email as a read-only field
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)

    class Meta:
        model = Item
        fields = [
            'id', 'name', 'description', 'category', 'price',
            'attachment', 'created_by', 'created_by_email',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_by_email', 'created_at', 'updated_at']
