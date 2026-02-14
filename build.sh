#!/bin/bash

# Build script for The Nest Docker Image
set -e

echo "🐳 Building The Nest Docker Image..."

# Configuration
IMAGE_NAME="the-nest"
IMAGE_TAG=${1:-latest}
DOCKERFILE=${2:-Dockerfile.prod}

echo "📋 Configuration:"
echo "  Image: $IMAGE_NAME:$IMAGE_TAG"
echo "  Dockerfile: $DOCKERFILE"

# Build the image
echo "🔨 Building Docker image..."
docker build -f $DOCKERFILE -t $IMAGE_NAME:$IMAGE_TAG .

# Tag as latest if not already latest
if [ "$IMAGE_TAG" != "latest" ]; then
    echo "🏷️  Tagging as latest..."
    docker tag $IMAGE_NAME:$IMAGE_TAG $IMAGE_NAME:latest
fi

echo "✅ Build completed successfully!"
echo ""
echo "📦 Available images:"
docker images | grep $IMAGE_NAME

echo ""
echo "🚀 To run the container:"
echo "  docker run -d -p 5000:5000 --name the-nest $IMAGE_NAME:$IMAGE_TAG"
echo ""
echo "🏠 To run with docker-compose:"
echo "  docker-compose up -d"
