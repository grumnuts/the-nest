# Cloudflare Tunnel Deployment Guide

## 🚀 Quick Setup with Cloudflare Tunnel

### 1. Docker Configuration
```bash
# Copy the Cloudflare environment template
cp .env.cloudflare .env

# Edit with your actual tunnel URL
nano .env
```

### 2. Set CLIENT_URL for Your Tunnel

#### **Option A: Cloudflare Pages Domain**
```bash
# Use the default Cloudflare Pages domain
CLIENT_URL=https://your-app-name.pages.dev
```

#### **Option B: Custom Domain**
```bash
# Use your custom domain with Cloudflare
CLIENT_URL=https://app.yourdomain.com
```

### 3. Deploy
```bash
# Start the application
docker-compose --env-file .env up -d

# Your app is now accessible via your Cloudflare Tunnel!
```

## 🌐 CLIENT_URL Scenarios

### **Scenario 1: Cloudflare Tunnel Only**
```
Local: http://localhost:5001
Tunnel: https://yourapp.pages.dev
Browser: https://yourapp.pages.dev
```
**Set**: `CLIENT_URL=https://yourapp.pages.dev`

### **Scenario 2: Custom Domain + Tunnel**
```
Local: http://localhost:5001
Domain: https://app.yourdomain.com
Tunnel: Routes domain to local server
Browser: https://app.yourdomain.com
```
**Set**: `CLIENT_URL=https://app.yourdomain.com`

### **Scenario 3: Multiple Domains**
```
Tunnel: https://yourapp.pages.dev
Domain: https://app.yourdomain.com
```
**Set**: `CLIENT_URL=https://app.yourdomain.com` (primary domain)

## 🔧 Finding Your Tunnel URL

### **Method 1: Cloudflare Dashboard**
1. Go to Cloudflare Dashboard → Zero Trust → Access → Tunnels
2. Find your tunnel and copy the public URL

### **Method 2: Command Line**
```bash
# List your tunnels
cloudflared tunnel list

# Get tunnel details
cloudflared tunnel info your-tunnel-name
```

## ⚠️ Common Issues

### **Issue 1: CORS Errors**
```
Error: Access blocked by CORS policy
```
**Solution**: Ensure CLIENT_URL matches exactly what you type in browser:
```bash
# If you access https://app.yourdomain.com
CLIENT_URL=https://app.yourdomain.com

# NOT https://www.app.yourdomain.com (unless that's what you use)
```

### **Issue 2: Mixed Content**
```
Error: Mixed Content: The page was loaded over HTTPS
```
**Solution**: Always use HTTPS in CLIENT_URL:
```bash
# ✅ Correct
CLIENT_URL=https://yourapp.pages.dev

# ❌ Wrong
CLIENT_URL=http://yourapp.pages.dev
```

### **Issue 3: Port Mismatch**
```bash
# Docker exposes port 5001 locally
# But tunnel uses HTTPS (443)
# Set CLIENT_URL to the tunnel URL, not local port
```

## 🔒 Security Considerations

### **Cloudflare Tunnel Benefits**
- ✅ Automatic SSL/TLS
- ✅ DDoS protection
- ✅ No open ports on your server
- ✅ Hide your IP address

### **Best Practices**
1. **Always use HTTPS** in CLIENT_URL
2. **Match exact domain** (no www/ non-www mismatch)
3. **Set JWT_SECRET** to a random value
4. **Use custom domain** for production

## 🎯 Testing Your Setup

### **1. Verify Tunnel Works**
```bash
# Check if your tunnel responds
curl https://yourapp.pages.dev/api/health
```

### **2. Test CORS**
```bash
# Should return your app, not CORS error
open https://yourapp.pages.dev
```

### **3. Check Console**
- Open browser dev tools
- Look for CORS errors
- If none, CLIENT_URL is correct!

## 🚀 Advanced Configuration

### **Multiple Tunnels**
If you have multiple tunnels/domains, update the CORS code:
```javascript
// In server/index.js
corsOptions.origin = [
  'https://app1.pages.dev',
  'https://app2.pages.dev',
  'https://yourdomain.com'
];
```

### **Local Development**
```bash
# Use local URLs for development
CLIENT_URL=http://localhost:5001

# Switch to tunnel for production
CLIENT_URL=https://yourapp.pages.dev
```

## 📱 Mobile Access

Cloudflare Tunnels work great on mobile! Just ensure:
1. CLIENT_URL matches your mobile browser URL
2. No HTTP/HTTPS mixing
3. JWT_SECRET is set

**Your app is now securely accessible anywhere!** 🌍
