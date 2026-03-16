# Backend Dockerfile - Django API server
FROM python:3.13-slim

# Set working directory inside the container
WORKDIR /app

# Install system dependencies needed for PostgreSQL client
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements first (Docker caches this layer if requirements don't change)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

# Create a directory for uploaded media files
RUN mkdir -p /app/media

# Expose the port Django runs on
EXPOSE 8000

# Default command - can be overridden in docker-compose
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
