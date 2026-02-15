#!/bin/bash

# Multi-Architecture Docker Build Script
# Builds for linux/amd64 and linux/arm64

set -e

IMAGE_NAME="the-nest"
DOCKER_HUB_USERNAME="${DOCKER_HUB_USERNAME:-yourusername}"  # Replace with your username
VERSION="${VERSION:-latest}"

echo "🏗️  Building multi-architecture Docker image..."
echo "📦 Image: $DOCKER_HUB_USERNAME/$IMAGE_NAME:$VERSION"
echo "🏗️  Architectures: linux/amd64, linux/arm64"

# Create and use buildx builder
docker buildx create --name multiarch --driver docker-container --use || true
docker buildx inspect --bootstrap

# Build and push multi-architecture image
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --file Dockerfile.multi \
  --tag "$DOCKER_HUB_USERNAME/$IMAGE_NAME:$VERSION" \
  --tag "$DOCKER_HUB_USERNAME/$IMAGE_NAME:$(date +%Y%m%d)" \
  --push \
  .

echo "✅ Multi-architecture image published successfully!"
echo "🐳 Available at: docker.io/$DOCKER_HUB_USERNAME/$IMAGE_NAME:$VERSION"
echo ""
echo "🔍 Verify architectures:"
echo "docker buildx imagetools inspect $DOCKER_HUB_USERNAME/$IMAGE_NAME:$VERSION"
