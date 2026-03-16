"""
Serializers for user data.
Serializers convert between Python objects and JSON for the API.
"""
from rest_framework import serializers
from .models import CustomUser


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user profile data (read and update)."""

    # full_name is a read-only computed property
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = CustomUser
        fields = ['id', 'email', 'first_name', 'last_name', 'role', 'avatar', 'full_name', 'created_at']
        read_only_fields = ['id', 'email', 'role', 'created_at']


class LoginSerializer(serializers.Serializer):
    """Serializer for login request - expects email and password."""
    email = serializers.EmailField()
    password = serializers.CharField()


class ForgotPasswordSerializer(serializers.Serializer):
    """Serializer for forgot password request - expects email."""
    email = serializers.EmailField()
