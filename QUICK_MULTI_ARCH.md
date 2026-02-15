# Quick Multi-Architecture Build Guide

## 🚀 Option 1: Use the Build Script (Recommended)

```bash
# Set your Docker Hub username
export DOCKER_HUB_USERNAME="yourusername"

# Run the multi-architecture build script
./build-multi-arch.sh
```

## 🔧 Option 2: Manual Build Commands

```bash
# 1. Create buildx builder
docker buildx create --name multiarch --driver docker-container --use

# 2. Build and push for both architectures
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --file Dockerfile.multi \
  --tag yourusername/the-nest:latest \
  --tag yourusername/the-nest:v1.0.0 \
  --push \
  .

# 3. Verify the image
docker buildx imagetools inspect yourusername/the-nest:latest
```

## 🏗️ Option 3: Linux Server Only (If you don't need ARM64)

```bash
# Build specifically for AMD64 (Linux servers)
docker buildx build \
  --platform linux/amd64 \
  --file Dockerfile.multi \
  --tag yourusername/the-nest:latest \
  --push \
  .
```

## 🔍 Verification Commands

```bash
# Check what architectures are available
docker buildx imagetools inspect yourusername/the-nest:latest

# Should show something like:
# ManifestList: yourusername/the-nest:latest
# ┌───┬──────────┬─────────────────┐
# │   │ PLATFORM │ IMAGE ID        │
# ├───┼──────────┼─────────────────┤
# │ 0 │ linux/amd64 │ sha256:... │
# │ 1 │ linux/arm64 │ sha256:... │
# └───┴──────────┴─────────────────┘
```

## 🐳 Usage on Linux Server

After publishing the multi-architecture image, your Linux server will automatically pull the correct AMD64 version:

```bash
# On your Linux server
docker pull yourusername/the-nest:latest
docker run -p 5000:5000 yourusername/the-nest:latest
```

## 📋 What This Fixes

**Before:** Image built only for your Mac's architecture (ARM64)
```
Error: no matching manifest for linux/amd64
```

**After:** Image supports both architectures
```
✅ Linux server pulls AMD64 version
✅ Mac/ARM devices pull ARM64 version
✅ Automatic architecture detection
```

## 🎯 Architecture Support

| Platform | Architecture | Status |
|----------|-------------|---------|
| Linux Servers | AMD64/x86_64 | ✅ Supported |
| Mac M1/M2/M3 | ARM64 | ✅ Supported |
| Raspberry Pi | ARM64 | ✅ Supported |
| Windows | AMD64 | ✅ Supported |

## 🚨 Important Notes

1. **Docker Hub Login Required:** Make sure you're logged into Docker Hub
   ```bash
   docker login
   ```

2. **Build Time:** Multi-architecture builds take longer (5-10 minutes)

3. **Storage:** Will push separate layers for each architecture

4. **Docker Version:** Requires Docker with buildx support (Docker Desktop 4.0+)
