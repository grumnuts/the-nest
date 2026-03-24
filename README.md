# The Nest - Chore & Task Tracking Platform

A task tracking platform for housemates and families to manage chores and tasks with customizable lists, goal tracking, and progress visualization.

## Features

- **Smart Lists** — Daily, Weekly, Fortnightly, Monthly, Quarterly, Annually, or Static reset periods
- **Task Management** — Titles, descriptions, time estimates, drag & drop reordering
- **Repeating Tasks** — Tasks that can be completed multiple times per period
- **Goal System** — Track progress by task count, time, or percentage
- **Multi-User** — Owner, Admin, and User roles with per-list and per-task permissions
- **Mobile Friendly** — Responsive design for phones, tablets, and desktop

## Quick Start

### Docker Run

```bash
docker run -d \
  --name the-nest \
  -p 5000:5000 \
  -v nest_data:/app/data \
  -e JWT_SECRET="$(openssl rand -base64 32)" \
  -e CLIENT_URL="http://localhost:5000" \
  -e TZ="Australia/Sydney" \
  -e DOCKER_ENV="true" \
  --restart unless-stopped \
  grumnuts/the-nest:latest
```

### Docker Compose

See [`docker-compose.yml`](docker-compose.yml) or use this:

```yaml
services:
  the-nest:
    image: grumnuts/the-nest:latest
    container_name: the-nest
    ports:
      - "5000:5000"
    environment:
      - JWT_SECRET=CHANGE_ME_TO_RANDOM_32_CHAR_SECRET
      - CLIENT_URL=http://localhost:5000
      - TZ=Australia/Sydney
      - DOCKER_ENV=true
      - PUID=1001 # Optional
      - PGID=1001 # Optional
    volumes:
      - nest_data:/app/data
    restart: unless-stopped

volumes:
  nest_data:
    driver: local
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | **Yes** | — | Secret key for auth tokens. Generate with `openssl rand -base64 32`. Server will refuse to start without this. |
| `CLIENT_URL` | **Yes** | — | URL users access the app from (for CORS, e.g. `http://localhost:5000`) |
| `DOCKER_ENV` | **Yes (Docker)** | `false` | Set to `true` when running in Docker to use `/app/data` for the database |
| `TZ` | No | `UTC` | Timezone for date/time operations (e.g. `Australia/Sydney`, `America/New_York`, `Europe/London`) |
| `PORT` | No | `5000` | Server port |
| `PUID` | No | `1001` | User ID for file permissions (Docker/Linux only) |
| `PGID` | No | `1001` | Group ID for file permissions (Docker/Linux only) |
| `EMERGENCY_RESET_PASSWORD` | No | — | Emergency password reset (see below) |
| `EMERGENCY_RESET_USER` | No | — | Target user for emergency reset |

> **TZ (Timezone)**: Critical for weekly/monthly/quarterly goals to reset at the correct time. Use your local timezone (e.g. `Australia/Sydney` for AEDT/AEST, `America/Los_Angeles` for PST/PDT). If left as `UTC`, goals may appear to reset early or late due to the time offset.

> **DOCKER_ENV**: This flag tells the server to store the database in `/app/data` (your mounted volume). Without it, the database is written next to the server files and will be lost on container restart.

> **PUID/PGID**: Only needed if you have volume permission issues on Linux. Set to match your host user (e.g. `1000`).

## Default Credentials

On first run, an admin account is created automatically with a **randomly generated password** that is printed once to the server logs:

```
========================================
  FIRST RUN — DEFAULT ADMIN CREDENTIALS
  Username: admin
  Password: <random>
  Change this password immediately after login.
========================================
```

Check the logs after first startup to retrieve the password:

```bash
docker logs the-nest
```

**Change the password immediately after first login** via Settings → Profile.

## Security

- `JWT_SECRET` **must** be set — the server will not start without it
- Rate limiting is applied to all API endpoints (stricter on login)
- Security headers (HSTS, X-Frame-Options, X-Content-Type-Options, etc.) are enabled via Helmet
- All database queries use parameterized statements (SQL injection protection)
- Input is validated and sanitized on all endpoints

## Data & Backups

Data is stored in `/app/data` inside the container. Mount a volume to persist it.

```bash
# Backup
docker cp the-nest:/app/data/the_nest.db ./backup.db

# Restore
docker cp ./backup.db the-nest:/app/data/the_nest.db
```

## Health Check

The container includes a built-in health check:

```
GET /api/health → {"status":"OK","database":"CONNECTED"}
```

## Emergency Password Reset

If you get locked out of your admin account, you can reset the password using environment variables:

### Step 1: Activate Emergency Reset

Edit your `docker-compose.yml` and add the emergency reset lines:

```yaml
environment:
  - JWT_SECRET=CHANGE_ME_TO_RANDOM_32_CHAR_SECRET
  - CLIENT_URL=http://localhost:5000
  - TZ=Australia/Sydney
  - DOCKER_ENV=true
  - EMERGENCY_RESET_USER=YOUR_USERNAME
  - EMERGENCY_RESET_PASSWORD=YOUR_NEW_PASSWORD
```

> The new password must be at least 8 characters.

### Step 2: Restart Container

```bash
docker-compose restart the-nest
```

### Step 3: Check Logs

```bash
docker logs the-nest
```

You should see:
```
🚨 🚨 🚨 EMERGENCY PASSWORD RESET 🚨 🚨 🚨
🔐 User: YOUR_USERNAME
✅ Password reset successful for: YOUR_USERNAME
🔑 New password is now active
⚠️  IMPORTANT: Remove EMERGENCY_RESET_* environment variables immediately
⚠️  Then restart the server
🚨 🚨 🚨 EMERGENCY PASSWORD RESET 🚨 🚨 🚨
```

### Step 4: Test Login & Cleanup

1. **Test login** with your new password
2. **Edit docker-compose.yml** and remove the emergency reset lines
3. **Restart container**: `docker compose restart the-nest`

### Important Notes

- **Minimum password length**: 8 characters required
- **Security**: The password is hashed immediately on startup
- **One-Time Use**: The reset only happens when both environment variables are present
- **No API Endpoint**: This is a server-side only process — it cannot be triggered remotely

## Troubleshooting

- **Server won't start** — Ensure `JWT_SECRET` is set in your environment
- **CORS errors** — Ensure `CLIENT_URL` matches the URL in your browser exactly
- **Database not persisting** — Ensure `DOCKER_ENV=true` is set and the volume is mounted to `/app/data`
- **Permission errors on Linux** — Set `PUID` and `PGID` to match your host user (`id -u` / `id -g`)
- **Emergency reset not working** — Check that both `EMERGENCY_RESET_PASSWORD` and `EMERGENCY_RESET_USER` are set, and the password is at least 8 characters

---

**Docker Image**: [`grumnuts/the-nest`](https://hub.docker.com/r/grumnuts/the-nest)
