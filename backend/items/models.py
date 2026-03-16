"""
Item (product) model for the demo app.
Each item has a name, description, category, price, and optional attachment.
Items are created by users and track when they were created and last updated.
"""
from django.db import models
from django.conf import settings


class Item(models.Model):
    """A product item in the demo inventory system."""

    # Category choices for organizing items
    CATEGORY_CHOICES = [
        ('electronics', 'Electronics'),
        ('clothing', 'Clothing'),
        ('books', 'Books'),
        ('home', 'Home & Garden'),
        ('sports', 'Sports & Outdoors'),
    ]

    name = models.CharField(max_length=200, help_text='Product name')
    description = models.TextField(blank=True, help_text='Product description')
    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        default='electronics',
        help_text='Product category'
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Product price in dollars'
    )
    attachment = models.FileField(
        upload_to='attachments/',
        blank=True,
        null=True,
        help_text='Optional file attachment (image, document, etc.)'
    )
    # Track who created this item
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='items',
        help_text='The user who created this item'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']  # Newest items first

    def __str__(self):
        return self.name
