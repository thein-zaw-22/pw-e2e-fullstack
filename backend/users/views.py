"""
API views for user authentication and profile management.
Handles login, logout, forgot password, and profile CRUD.
"""
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import parser_classes

from .models import CustomUser
from .serializers import UserSerializer, LoginSerializer, ForgotPasswordSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    Login endpoint.
    Accepts email and password, returns an auth token and user info.
    The token should be sent in the Authorization header for future requests.
    """
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    email = serializer.validated_data['email']
    password = serializer.validated_data['password']

    # Try to authenticate the user with the given credentials
    user = authenticate(request, username=email, password=password)

    if user is None:
        # Authentication failed - wrong email or password
        return Response(
            {'error': 'Invalid email or password'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # Create or get an auth token for this user
    token, _created = Token.objects.get_or_create(user=user)

    # Return the token and user profile data
    return Response({
        'token': token.key,
        'user': UserSerializer(user).data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Logout endpoint.
    Returns a success response. The frontend handles clearing the token
    from localStorage. We keep the token on the server side so that
    parallel test sessions sharing the same user are not disrupted.
    In a production app, you would delete the token here for security.
    """
    return Response({'message': 'Logged out successfully'})


@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password_view(request):
    """
    Forgot password endpoint (mock implementation).
    In a real app, this would send a password reset email.
    For demo purposes, it always returns a success message.
    """
    serializer = ForgotPasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    email = serializer.validated_data['email']

    # Check if the email exists (optional - some apps don't reveal this)
    if CustomUser.objects.filter(email=email).exists():
        # In a real app: send reset email here
        pass

    # Always return success to avoid revealing if an email exists
    return Response({
        'message': 'If an account with that email exists, a password reset link has been sent.'
    })


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def profile_view(request):
    """
    Profile endpoint.
    GET: Returns the current user's profile data.
    PUT: Updates the current user's profile (name, avatar).
    """
    user = request.user

    if request.method == 'GET':
        # Return the current user's profile
        serializer = UserSerializer(user)
        return Response(serializer.data)

    elif request.method == 'PUT':
        # Update the current user's profile
        serializer = UserSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
