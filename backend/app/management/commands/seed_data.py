"""
Management command to seed demo data for testing.
Creates demo users and sample items so the app is ready for E2E tests.
Run with: python manage.py seed_data
"""
from django.core.management.base import BaseCommand
from users.models import CustomUser
from items.models import Item


class Command(BaseCommand):
    help = 'Seeds the database with demo users and sample items for testing'

    def handle(self, *args, **options):
        self.stdout.write('Seeding demo data...')

        # Create demo users (skip if they already exist)
        admin_user = self._create_user(
            email='admin@example.com',
            password='Admin123!',
            first_name='Admin',
            last_name='User',
            role='admin',
            is_staff=True,
        )

        regular_user = self._create_user(
            email='user@example.com',
            password='User123!',
            first_name='Regular',
            last_name='User',
            role='user',
            is_staff=False,
        )

        # Create sample items (skip if items already exist)
        if Item.objects.count() == 0:
            self._create_sample_items(admin_user)
            self.stdout.write(self.style.SUCCESS('Created sample items'))
        else:
            self.stdout.write('Sample items already exist, skipping')

        self.stdout.write(self.style.SUCCESS('Demo data seeding complete!'))

    def _create_user(self, email, password, first_name, last_name, role, is_staff):
        """Create a user if they don't already exist."""
        user, created = CustomUser.objects.get_or_create(
            email=email,
            defaults={
                'first_name': first_name,
                'last_name': last_name,
                'role': role,
                'is_staff': is_staff,
            }
        )
        if created:
            # Set the password properly (hashes it)
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Created user: {email} (role: {role})'))
        else:
            self.stdout.write(f'User {email} already exists, skipping')
        return user

    def _create_sample_items(self, created_by):
        """Create a set of sample product items for testing."""
        sample_items = [
            {
                'name': 'Wireless Bluetooth Headphones',
                'description': 'High-quality noise-canceling headphones with 30-hour battery life.',
                'category': 'electronics',
                'price': 79.99,
            },
            {
                'name': 'Mechanical Keyboard',
                'description': 'RGB backlit mechanical keyboard with Cherry MX switches.',
                'category': 'electronics',
                'price': 129.99,
            },
            {
                'name': 'Running Shoes Pro',
                'description': 'Lightweight running shoes with cushioned sole for marathon training.',
                'category': 'sports',
                'price': 119.95,
            },
            {
                'name': 'Cotton T-Shirt Pack',
                'description': 'Pack of 3 premium cotton t-shirts in black, white, and gray.',
                'category': 'clothing',
                'price': 34.99,
            },
            {
                'name': 'Python Programming Guide',
                'description': 'Comprehensive guide to Python programming for beginners and experts.',
                'category': 'books',
                'price': 44.99,
            },
            {
                'name': 'Smart LED Desk Lamp',
                'description': 'Adjustable LED desk lamp with multiple brightness levels and USB charging.',
                'category': 'home',
                'price': 49.99,
            },
            {
                'name': 'Yoga Mat Premium',
                'description': 'Non-slip yoga mat with extra thickness for comfort during workouts.',
                'category': 'sports',
                'price': 29.99,
            },
            {
                'name': 'Wireless Mouse',
                'description': 'Ergonomic wireless mouse with adjustable DPI and silent clicks.',
                'category': 'electronics',
                'price': 24.99,
            },
            {
                'name': 'Winter Jacket',
                'description': 'Warm winter jacket with waterproof outer shell and fleece lining.',
                'category': 'clothing',
                'price': 89.99,
            },
            {
                'name': 'Indoor Plant Set',
                'description': 'Set of 3 low-maintenance indoor plants with decorative pots.',
                'category': 'home',
                'price': 39.99,
            },
        ]

        for item_data in sample_items:
            Item.objects.create(created_by=created_by, **item_data)
