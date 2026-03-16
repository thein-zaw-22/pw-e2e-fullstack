"""
Custom user model for the demo app.
Uses email as the login field instead of a username.
Includes a role field to distinguish admin and regular users.
"""
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class CustomUserManager(BaseUserManager):
    """Manager for creating users with email as the unique identifier."""

    def create_user(self, email, password=None, **extra_fields):
        """Create and save a regular user with the given email and password."""
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """Create and save a superuser (admin) with the given email and password."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model that uses email instead of username.
    Each user has a role: 'admin' or 'user'.
    """

    # Role choices - admin has full access, user has limited access
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('user', 'User'),
    ]

    email = models.EmailField(unique=True, help_text='User email address (used for login)')
    first_name = models.CharField(max_length=100, blank=True, help_text='First name')
    last_name = models.CharField(max_length=100, blank=True, help_text='Last name')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='user', help_text='User role')
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True, help_text='Profile picture')
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    # Use email as the login field
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    def __str__(self):
        return self.email

    @property
    def full_name(self):
        """Return the user's full name."""
        return f'{self.first_name} {self.last_name}'.strip() or self.email
