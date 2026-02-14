#!/bin/bash

# Publish script for The Nest Docker Image
set -e

echo "🚀 Publishing The Nest Docker Image..."

# Configuration
IMAGE_NAME=${1:-the-nest}
IMAGE_TAG=${2:-latest}
REGISTRY=${3:-docker.io}
USERNAME=${4:-your-dockerhub-username}

echo "📋 Configuration:"
echo "  Registry: $REGISTRY"
echo "  Image: $USERNAME/$IMAGE_NAME:$IMAGE_TAG"

# Check if user is logged in
echo "🔐 Checking Docker login..."
if ! docker info | grep -q "Username"; then
    echo "❌ Not logged in to Docker Hub"
    echo "Please run: docker login"
    exit 1
fi

# Tag the image for registry
echo "🏷️  Tagging image for registry..."
docker tag $IMAGE_NAME:$IMAGE_TAG $REGISTRY/$USERNAME/$IMAGE_NAME:$IMAGE_TAG

# Also tag as latest if not already latest
if [ "$IMAGE_TAG" != "latest" ]; then
    docker tag $IMAGE_NAME:$IMAGE_TAG $REGISTRY/$USERNAME/$IMAGE_NAME:latest
fi

# Push to registry
echo "📤 Pushing to registry..."
docker push $REGISTRY/$USERNAME/$IMAGE_NAME:$IMAGE_TAG

if [ "$IMAGE_TAG" != "latest" ]; then
    docker push $REGISTRY/$USERNAME/$IMAGE_NAME:latest
fi

echo "✅ Published successfully!"
echo ""
echo "📦 Published images:"
echo "  $REGISTRY/$USERNAME/$IMAGE_NAME:$IMAGE_TAG"
if [ "$IMAGE_TAG" != "latest" ]; then
    echo "  $REGISTRY/$USERNAME/$IMAGE_NAME:latest"
fi

echo ""
echo "🚀 To pull and run:"
echo "  docker run -d -p 5000:5000 --name the-nest $REGISTRY/$USERNAME/$IMAGE_NAME:$IMAGE_TAG"
