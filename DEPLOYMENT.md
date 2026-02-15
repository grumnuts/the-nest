# Production Deployment Guide

## 🚀 Quick Deploy

### 1. Environment Setup
```bash
# Copy the production environment template
cp .env.production .env

# Edit with your actual values
nano .env
```

### 2. Required Environment Variables
```bash
# SECURITY - MUST CHANGE
JWT_SECRET=your-random-jwt-secret-key-here-min-32-characters

# CONFIGURATION - Set your domain
CLIENT_URL=https://your-domain.com

# TIMEZONE (optional)
TZ=UTC
```

### 3. Deploy with Docker Compose
```bash
# Production deployment
docker-compose -f docker-compose.prod.yml --env-file .env up -d

# Or use the default with environment variables
docker-compose --env-file .env up -d
```

## 🔒 Security Notes

### Critical Security Requirements
1. **JWT_SECRET**: Must be a random string at least 32 characters long
2. **Default Admin**: First user to sign up becomes admin
3. **Database**: Stored in Docker volume, persists across restarts

### Generate Secure JWT Secret
```bash
# Generate a secure random secret
openssl rand -base64 32
# or
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 🌐 Production Configuration

### Domain Setup
- Set `CLIENT_URL` to your actual domain (e.g., `https://app.yourdomain.com`)
- Configure SSL/TLS termination (reverse proxy recommended)
- Update port mapping if needed (e.g., `"80:5000"` for HTTP)

### Reverse Proxy (Recommended)
```nginx
# Nginx example
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📊 Monitoring

### Health Check
- Endpoint: `GET /api/health`
- Returns: `{"status": "ok", "timestamp": "..."}`
- Used by Docker healthcheck

### Logs
```bash
# View logs
docker-compose logs -f the-nest

# Check health status
docker ps
```

## 🔧 Maintenance

### Backup Database
```bash
# Copy database from container
docker cp the-nest:/app/data/the_nest.db ./backup-$(date +%Y%m%d).db
```

### Update Application
```bash
# Pull latest image and restart
docker-compose pull
docker-compose up -d
```

## 🚨 Troubleshooting

### Common Issues
1. **JWT Secret Not Set**: App will fail to start
2. **Wrong CLIENT_URL**: CORS errors in browser
3. **Port Conflicts**: Change port mapping in docker-compose

### Reset Admin Access
```bash
# Access container and create new admin
docker exec -it the-nest node create-admin.js yourusername
```
