# The Nest - Chore & Task Tracking Platform

A task tracking platform for housemates and families to manage chores with customizable lists, goal tracking, and progress visualization.

## Features

- **Smart Lists** — Daily, Weekly, Monthly, Quarterly, Annually, or Static reset periods
- **Task Management** — Titles, descriptions, time estimates, drag & drop reordering
- **Repeating Tasks** — Tasks that can be completed multiple times per period
- **Goal System** — Track progress by task count, time, or percentage
- **Multi-User** — Admin and user roles with per-task assignment
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
  -e TZ="UTC" \
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
      - JWT_SECRET=your-random-jwt-secret-key-here-min-32-characters
      - CLIENT_URL=http://localhost:5000
      - TZ=UTC
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
| `JWT_SECRET` | **Yes** | — | Secret key for auth tokens (min 32 chars) |
| `CLIENT_URL` | **Yes** | — | URL users access the app from (for CORS) |
| `TZ` | No | `UTC` | Timezone (e.g. `Australia/Brisbane`) |
| `PUID` | No | `1001` | User ID for file permissions |
| `PGID` | No | `1001` | Group ID for file permissions |

> **PUID/PGID**: Only needed if you have volume permission issues on Linux. Set to match your host user (e.g. `1000`).

## Default Credentials

On first run, an admin account is created automatically:

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin123` |

**Change the password immediately after first login.**

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

## Troubleshooting

- **CORS errors** — Ensure `CLIENT_URL` matches the URL in your browser exactly
- **Permission errors on Linux** — Set `PUID` and `PGID` to match your host user (`id -u` / `id -g`)
- **Database path issues** — Ensure the volume is mounted to `/app/data`

---

**Docker Image**: [`grumnuts/the-nest`](https://hub.docker.com/r/grumnuts/the-nest)
