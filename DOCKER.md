# 🐳 Docker Deployment Guide

## Overview

The Nest application runs as a single container containing both the React frontend and Node.js backend.

## Quick Start

### Option 1: Using Docker Compose (Recommended)

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Option 2: Using Docker directly

```bash
# Build the image
./build.sh

# Run the container
docker run -d \
  -p 5000:5000 \
  --name the-nest \
  -v nest_data:/app/data \
  the-nest:latest
```

## Build & Publish

### Build for Production

```bash
# Build with latest tag
./build.sh

# Build with custom tag
./build.sh v1.0.0

# Build with custom Dockerfile
./build.sh latest Dockerfile.prod
```

### Publish to Registry

```bash
# Login to Docker Hub first
docker login

# Publish (replace with your username)
./publish.sh the-nest latest docker.io your-username

# Or publish custom version
./publish.sh the-nest v1.0.0 docker.io your-username
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `5000` | Application port |
| `JWT_SECRET` | `your-super-secret-jwt-key-change-this-in-production` | JWT signing secret |
| `CLIENT_URL` | `http://localhost:5000` | Frontend URL |

## Data Persistence

- Database files stored in `/app/data` inside container
- Docker volume `nest_data` mounted for persistence
- Data survives container restarts

## Health Check

The container includes a health check that:
- Runs every 30 seconds
- Checks `/api/health` endpoint
- Marks container as unhealthy after 3 failed attempts

## Security Features

- Runs as non-root user (`nest:1001`)
- Uses `dumb-init` for proper signal handling
- Minimal Alpine Linux base image
- Production dependencies only

## Accessing the Application

Once running, access the application at:
- **Local**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health

## Troubleshooting

### View Container Logs
```bash
docker-compose logs the-nest
# or
docker logs the-nest
```

### Access Container Shell
```bash
docker exec -it the-nest sh
```

### Check Health Status
```bash
docker ps
# Look for "healthy" status
```

### Rebuild After Changes
```bash
docker-compose down
docker-compose up -d --build
```

## Production Deployment

### Environment Setup
1. Set secure `JWT_SECRET`
2. Configure proper `CLIENT_URL`
3. Set up SSL termination (nginx/cloudflare)
4. Configure backup strategy for data volume

### Example Production Command
```bash
docker run -d \
  -p 5000:5000 \
  --name the-nest \
  --restart unless-stopped \
  -v nest_data:/app/data \
  -e NODE_ENV=production \
  -e JWT_SECRET="your-secure-secret-key" \
  -e CLIENT_URL="https://yourdomain.com" \
  your-username/the-nest:latest
```

## Architecture

```
┌─────────────────────────────────────┐
│           Single Container          │
│  ┌─────────────┐  ┌─────────────┐   │
│  │   React     │  │   Node.js   │   │
│  │  Frontend   │  │   Backend   │   │
│  │   (build)   │  │    API      │   │
│  └─────────────┘  └─────────────┘   │
│           │  │                     │
│      Static Files  Database         │
│         │           │              │
│    Express serves  SQLite           │
│    React app     (persistent)       │
└─────────────────────────────────────┘
```
