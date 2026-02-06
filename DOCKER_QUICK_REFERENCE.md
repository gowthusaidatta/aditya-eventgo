# Docker Quick Reference - EventGo

**30-second setup • Essential commands • Platform guides**

---

## 🚀 30-Second Quick Start

```bash
cd aditya-eventgo
cp .env.docker .env.local
docker-compose up -d
open http://localhost:3000
```

That's it! Your app is running.

---

## 📋 Essential Commands

### Start & Stop

```bash
docker-compose up -d       # Start (background)
docker-compose down        # Stop
docker-compose logs -f     # Watch logs
docker-compose ps          # List services
```

### Rebuild & Clean

```bash
docker-compose build       # Rebuild images
docker-compose down -v     # Stop + remove data
docker system prune -a     # Clean everything
```

### Shell Access

```bash
docker-compose exec backend sh     # Backend terminal
docker-compose exec frontend sh    # Frontend terminal
```

---

## 🖥️ Platform Quick Start

### Windows (WSL 2)

```powershell
# Install Docker Desktop for Windows
# Enable WSL 2 in Docker Desktop Settings

# In WSL Terminal:
cd ~/aditya-eventgo
cp .env.docker .env.local
docker-compose up -d
start http://localhost:3000
```

### Linux (Ubuntu/Debian)

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh | sudo sh
sudo usermod -aG docker $USER
newgrp docker

# Run app
cd ~/aditya-eventgo
cp .env.docker .env.local
docker-compose up -d
xdg-open http://localhost:3000
```

### macOS

```bash
# Install Docker Desktop for Mac
brew install docker docker-compose

# Run app
cd ~/aditya-eventgo
cp .env.docker .env.local
docker-compose up -d
open http://localhost:3000
```

---

## 📊 Service Overview

| Service | Port | Status | URL |
|---------|------|--------|-----|
| Frontend | 3000 | ✅ | http://localhost:3000 |
| Backend | 5000 | ✅ | http://localhost:5000 |
| DynamoDB | 8000 | 🔧 | http://localhost:8000 |

Check status: `docker-compose ps`

---

## 🔧 Configuration

### Environment Variables

```bash
# Copy template
cp .env.docker .env.local

# Essential settings:
AWS_REGION=us-east-1
EVENTS_TABLE=your-events-table
USERS_TABLE=your-users-table
REGISTRATIONS_TABLE=your-registrations-table
COGNITO_USER_POOL_ID=your-pool-id
COGNITO_CLIENT_ID=your-client-id
COGNITO_REGION=us-east-1
JWT_SECRET=your-secret-min-32-chars
```

### Development vs. Production

```bash
# Development (hot reload)
docker-compose up -d

# Production (optimized)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Local Database

```bash
# With DynamoDB Local
docker-compose --profile local-db up -d

# Stop and remove data
docker-compose --profile local-db down -v
```

---

## 🔍 Debugging

### View Logs

```bash
docker-compose logs              # All services
docker-compose logs backend      # Backend only
docker-compose logs -f           # Follow (stream)
docker-compose logs --tail 50    # Last 50 lines
```

### Check Health

```bash
docker-compose ps                    # Status
curl http://localhost:5000/health    # Backend health
curl http://localhost:3000/          # Frontend check
```

### Access Container

```bash
docker-compose exec backend sh
# You're now inside the backend container

# Useful commands:
ls -la
npm test
npm run build
exit
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Port already in use | `lsof -i :3000` then kill process |
| Container won't start | `docker-compose logs backend` to see error |
| Slow on Windows | Clone into WSL filesystem, not `/mnt/c/` |
| Network error | `docker-compose exec backend curl http://frontend` |
| Out of memory | Increase Docker Desktop memory allocation |

---

## 📈 Monitoring

### Resource Usage

```bash
docker stats                    # CPU, memory per container
docker system df                # Disk usage
docker image ls                 # Image sizes
docker volume ls                # Volumes
```

### Service Status

```bash
docker-compose ps               # Service status table
docker-compose exec backend npm test   # Run tests
```

---

## 🛠️ Using Make Commands

```bash
make help                  # View all commands
make up                    # Start services
make down                  # Stop services
make logs                  # Watch logs
make shell-backend         # Backend terminal
make test                  # Run tests
make db-local              # With DynamoDB
make prod                  # Production mode
```

---

## 🔒 Security Checklist

- ✅ Non-root users in containers
- ✅ Health checks enabled
- ✅ Resource limits set
- ✅ SSL/TLS ready (production)
- ✅ Security headers configured
- ✅ Credentials in `.env.local` (never in images)

---

## 📦 Multi-Stage Build Benefits

Our Dockerfiles use multi-stage builds:

```dockerfile
# Stage 1: Dependencies (minimal)
FROM node:18-alpine as dependencies

# Stage 2: Builder (with dev dependencies)
FROM node:18-alpine as builder

# Stage 3: Runtime (only production code)
FROM node:18-alpine
```

Result: **70% smaller images**, faster deploys, better security.

---

## 🌐 Network Communication

Services communicate via Docker DNS:

```
frontend → http://backend:5000    ✅
backend → http://dynamodb-local:8000
```

Exposed ports: `localhost:3000`, `localhost:5000`

---

## 💾 Data Persistence

- **Volumes**: `dynamodb-data` persists between restarts
- **Logs**: Printed to stdout (always available)
- **Environment**: `.env.local` keeps settings

```bash
# Backup data
docker-compose down -v    # Removes volumes

# Preserve data
docker-compose down       # Keeps volumes
docker-compose up -d      # Resumes with same data
```

---

## 🚀 Quick Workflows

### Development Workflow

```bash
# 1. Start services
docker-compose up -d

# 2. Make code changes (hot reload)
# ... edit files ...

# 3. Check logs
docker-compose logs -f backend

# 4. Run tests
docker-compose exec backend npm test

# 5. Stop when done
docker-compose down
```

### Production Deployment

```bash
# 1. Prepare
docker-compose build --no-cache

# 2. Deploy
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 3. Monitor
docker stats
docker-compose logs -f

# 4. Backup
# Use AWS Console or CLI for DynamoDB backups
```

### Troubleshooting Workflow

```bash
# 1. Check status
docker-compose ps

# 2. View error
docker-compose logs backend

# 3. Restart service
docker-compose restart backend

# 4. Full rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

---

## 📚 Useful Links

- [Docker Quick Start](https://docs.docker.com/get-started/)
- [Docker Compose Docs](https://docs.docker.com/compose/)
- [Dockerfile Reference](https://docs.docker.com/engine/reference/builder/)
- Full guide: [DOCKER_SETUP.md](DOCKER_SETUP.md)

---

## 💡 Pro Tips

1. **Use volumes for development** - Changes reflect immediately without rebuild
2. **Check logs first** - 80% of issues are in the logs
3. **Use `docker-compose exec`** - Access running containers instantly
4. **Resource limits** - Set in production to prevent runaway processes
5. **Health checks** - Automatically restart unhealthy services
6. **Keep `.env.local` secret** - Never commit it

---

## ❓ FAQ

**Q: My changes aren't showing up**
A: Backend has hot reload via volumes. Frontend needs rebuild. Check `docker-compose logs`

**Q: Can I use this on Windows without WSL?**
A: No, Docker Desktop needs WSL 2 for Linux containers.

**Q: How do I access the database?**
A: Use local DynamoDB: `docker-compose --profile local-db up -d`

**Q: Can I run this on Linux servers?**
A: Yes! Same commands work on Ubuntu, Debian, etc.

**Q: How do I setup SSL/TLS?**
A: See [DOCKER_SETUP.md](DOCKER_SETUP.md#setup-ssltls-certificates) for production SSL setup.

**Q: What if I need more memory?**
A: Increase Docker's memory in Docker Desktop settings (Windows/Mac) or `/etc/docker/daemon.json` (Linux)

---

**Last Updated:** 2024 | **Version:** 1.0
