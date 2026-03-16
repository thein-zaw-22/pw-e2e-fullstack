"""
API views for item (product) CRUD operations.
Admin users can create, edit, and delete items.
Regular users can only view and search items.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import Item
from .serializers import ItemSerializer


def is_admin(user):
    """Check if the user has admin role."""
    return user.role == 'admin' or user.is_staff


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def item_list_create(request):
    """
    GET: List all items. Supports ?search= query parameter to filter by name.
    POST: Create a new item (admin only).
    """
    if request.method == 'GET':
        # Start with all items
        items = Item.objects.all()

        # If a search query is provided, filter items by name
        search = request.query_params.get('search', '')
        if search:
            items = items.filter(name__icontains=search)

        serializer = ItemSerializer(items, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        # Only admin users can create items
        if not is_admin(request.user):
            return Response(
                {'error': 'Only admin users can create items'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Automatically set the creator to the current user
        serializer.save(created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def item_detail(request, pk):
    """
    GET: Get a single item by ID.
    PUT: Update an item (admin only).
    DELETE: Delete an item (admin only).
    """
    # Try to find the item by its ID
    try:
        item = Item.objects.get(pk=pk)
    except Item.DoesNotExist:
        return Response(
            {'error': 'Item not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == 'GET':
        serializer = ItemSerializer(item)
        return Response(serializer.data)

    elif request.method == 'PUT':
        # Only admin users can edit items
        if not is_admin(request.user):
            return Response(
                {'error': 'Only admin users can edit items'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ItemSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    elif request.method == 'DELETE':
        # Only admin users can delete items
        if not is_admin(request.user):
            return Response(
                {'error': 'Only admin users can delete items'},
                status=status.HTTP_403_FORBIDDEN
            )

        item.delete()
        return Response(
            {'message': 'Item deleted successfully'},
            status=status.HTTP_200_OK
        )
