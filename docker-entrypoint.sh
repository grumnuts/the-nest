#!/bin/sh

# Ensure the data directory has correct permissions
if [ -d "/app/data" ]; then
    echo "🔍 Checking /app/data directory permissions..."
    
    # Check if we can write to the data directory as current user (root)
    if ! touch /app/data/.test 2>/dev/null; then
        echo "❌ Cannot write to /app/data directory even as root!"
        export NODE_ENV=fallback
    else
        echo "✅ Root can write to /app/data directory"
        rm -f /app/data/.test
        
        # Fix ownership for the nest user
        echo "🔧 Setting ownership to nest:nodejs for /app/data..."
        chown -R nest:nodejs /app/data
        chmod 755 /app/data
        
        # Test if the nest user can write to it
        if su nest -c "touch /app/data/.test" 2>/dev/null; then
            echo "✅ nest user can write to /app/data directory"
            rm -f /app/data/.test
        else
            echo "❌ nest user cannot write to /app/data directory"
        fi
    fi
else
    echo "📁 Creating /app/data directory..."
    mkdir -p /app/data
    chown -R nest:nodejs /app/data
    chmod 755 /app/data
    
    # Test if the nest user can write to it
    if su nest -c "touch /app/data/.test" 2>/dev/null; then
        echo "✅ nest user can write to /app/data directory"
        rm -f /app/data/.test
    else
        echo "❌ nest user cannot write to /app/data directory"
    fi
fi

# Start the application as root (user account issue workaround)
echo "🚀 Starting The Nest application..."
cd /app/server
exec npm start
