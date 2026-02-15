#!/bin/sh

# Support PUID/PGID like LinuxServer.io images
PUID=${PUID:-1001}
PGID=${PGID:-1001}

echo "───────────────────────────────────"
echo "  Setting up The Nest container"
echo "  PUID=${PUID} PGID=${PGID}"
echo "───────────────────────────────────"

# Update nest user/group to match PUID/PGID if different
CURRENT_UID=$(id -u nest 2>/dev/null || echo "0")
CURRENT_GID=$(id -g nest 2>/dev/null || echo "0")

if [ "${CURRENT_UID}" != "${PUID}" ] || [ "${CURRENT_GID}" != "${PGID}" ]; then
    echo "🔧 Updating nest user to UID=${PUID} GID=${PGID}"
    deluser nest 2>/dev/null || true
    delgroup nodejs 2>/dev/null || true
    addgroup -g "${PGID}" -S nodejs 2>/dev/null || true
    adduser -S -u "${PUID}" -G nodejs -h /app -s /bin/sh -D nest 2>/dev/null || true
fi

# Ensure data directory exists
mkdir -p /app/data

# Fix permissions on data directory
echo "🔧 Setting /app/data ownership to ${PUID}:${PGID}..."
chown -R "${PUID}:${PGID}" /app/data 2>/dev/null || true
chmod 755 /app/data 2>/dev/null || true

# Verify write access
if touch /app/data/.perm_test 2>/dev/null; then
    echo "✅ /app/data is writable"
    rm -f /app/data/.perm_test
else
    echo "⚠️  /app/data may not be writable"
    echo "   Run on host: chown -R ${PUID}:${PGID} <your-data-directory>"
fi

# Fix ownership of app files for the nest user
chown -R "${PUID}:${PGID}" /app/server /app/public /app/node_modules 2>/dev/null || true

# Start the application as the nest user
echo "🚀 Starting The Nest application..."
cd /app/server
exec su-exec nest npm start
