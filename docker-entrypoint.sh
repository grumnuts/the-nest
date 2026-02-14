#!/bin/sh

# Ensure the data directory has correct permissions
if [ -d "/app/data" ]; then
    echo "🔍 Checking /app/data directory permissions..."
    
    # Check if we can write to the data directory
    if ! touch /app/data/.test 2>/dev/null; then
        echo "⚠️  Fixing permissions for /app/data directory..."
        
        # Try to fix permissions (this might fail if not root, but that's ok)
        chown -R nest:nodejs /app/data 2>/dev/null || true
        chmod 755 /app/data 2>/dev/null || true
        
        # Test again
        if touch /app/data/.test 2>/dev/null; then
            echo "✅ Permissions fixed successfully"
            rm -f /app/data/.test
        else
            echo "❌ Cannot fix permissions. Running with current user..."
            # Fallback: try to create database in current directory
            export NODE_ENV=fallback
        fi
    else
        echo "✅ /app/data directory is writable"
        rm -f /app/data/.test
    fi
else
    echo "📁 Creating /app/data directory..."
    mkdir -p /app/data
    chown -R nest:nodejs /app/data 2>/dev/null || true
    chmod 755 /app/data 2>/dev/null || true
fi

# Start the application
echo "🚀 Starting The Nest application..."
exec npm start
