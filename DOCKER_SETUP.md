# Docker Setup Guide - EventGo

Complete guide for running EventGo with Docker on Windows, Linux, and macOS.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Platform-Specific Setup](#platform-specific-setup)
4. [Running Services](#running-services)
5. [Configuration](#configuration)
6. [Common Commands](#common-commands)
7. [Troubleshooting](#troubleshooting)
8. [Production Deployment](#production-deployment)

---

## Quick Start

### 30-Second Setup

```bash
# 1. Clone or navigate to project
cd aditya-eventgo

# 2. Copy environment template
cp .env.docker .env.local

# 3. Start services
docker-compose up -d

# 4. Visit application
# Windows/Linux: http://localhost:3000
# macOS: http://localhost:3000

# 5. View logs (if needed)
docker-compose logs -f
```

---

## Prerequisites

### All Platforms

- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum (8GB recommended)
- 10GB disk space

### Windows

- Windows 10 Pro/Enterprise or Windows 11
- WSL 2 (Windows Subsystem for Linux 2) enabled
- Docker Desktop for Windows

### Linux (Ubuntu/Debian)

- Ubuntu 20.04 LTS+ or Debian 11+
- sudo access for Docker commands

### macOS

- macOS 11 (Big Sur) or later
- Docker Desktop for Mac (Intel or Apple Silicon)

---

## Platform-Specific Setup

### Windows (WSL 2)

#### 1. Install Docker Desktop for Windows

```powershell
# Download from: https://www.docker.com/products/docker-desktop

# Verify installation
docker --version
docker-compose --version
```

#### 2. Enable WSL 2

```powershell
# In PowerShell (as Administrator)
wsl --install
wsl --set-default-version 2

# Verify WSL 2
wsl --list --verbose
```

#### 3. Configure Docker Desktop for WSL 2

- Open Docker Desktop → Settings → Resources → WSL Integration
- Enable "Ubuntu" (or your preferred WSL distro)
- Click "Apply & Restart"

#### 4. Verify Setup

```bash
# In WSL terminal
docker ps
docker-compose ps
```

#### 5. Clone Project into WSL

```bash
# Better performance: clone into WSL filesystem, not Windows
wsl
cd ~
git clone <your-repo-url>
cd aditya-eventgo
```

### Linux (Ubuntu/Debian)

#### 1. Install Docker

```bash
# Add Docker repository
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verify installation
docker --version
docker-compose --version
```

#### 2. Add User to Docker Group

```bash
# Add your user to docker group
sudo usermod -aG docker $USER

# Apply group changes (logout and login, or run:)
newgrp docker

# Verify
docker ps
```

#### 3. Enable Docker Service

```bash
# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Verify
sudo systemctl status docker
```

### macOS

#### 1. Install Docker Desktop for Mac

```bash
# Using Homebrew (recommended)
brew install docker
brew install docker-compose

# Or download from: https://www.docker.com/products/docker-desktop
```

#### 2. Start Docker Desktop

```bash
# Launch from Applications folder or:
open /Applications/Docker.app

# Wait for Docker to start (check menu bar icon)
```

#### 3. Verify Installation

```bash
docker --version
docker-compose --version
docker ps
```

---

## Running Services

### Development Mode

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Visit application
open http://localhost:3000  # macOS
xdg-open http://localhost:3000  # Linux
start http://localhost:3000  # Windows
```

**What runs in development:**
- Frontend (React): http://localhost:3000
- Backend (Express): http://localhost:5000
- DynamoDB Local: http://localhost:8000 (optional)

### Development with Local DynamoDB

```bash
# Start with local DynamoDB
docker-compose --profile local-db up -d

# DynamoDB available at: http://localhost:8000
# Configure .env.local:
# DYNAMODB_ENDPOINT=http://localhost:8000
```

### Production-like Mode

```bash
# Start with production settings
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check health
curl http://localhost/health  # If using Nginx proxy

# Stop services
docker-compose down
```

### Stopping Services

```bash
# Stop all services (data persists)
docker-compose down

# Stop and remove data
docker-compose down -v
```

---

## Configuration

### Environment Variables

Copy `.env.docker` to `.env.local` and configure:

```bash
cp .env.docker .env.local
nano .env.local
```

**Required variables:**

```env
# AWS/DynamoDB
AWS_REGION=us-east-1
EVENTS_TABLE=your-events-table
USERS_TABLE=your-users-table
REGISTRATIONS_TABLE=your-registrations-table

# Cognito
COGNITO_USER_POOL_ID=your-pool-id
COGNITO_CLIENT_ID=your-client-id
COGNITO_REGION=us-east-1

# JWT
JWT_SECRET=your-secret-key-min-32-chars
```

### Volume Mounts (Development)

```yaml
# In docker-compose.yml, volumes enable hot reload:
volumes:
  - ./backend:/app          # Backend source code
  - /app/node_modules       # Don't mount node_modules
```

**Benefits:**
- Changes reflected immediately
- No rebuild needed
- Faster development iteration

### Port Configuration

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Backend | 5000 | http://localhost:5000 |
| DynamoDB | 8000 | http://localhost:8000 |
| Nginx | 80 | http://localhost |
| Nginx SSL | 443 | https://localhost |

---

## Common Commands

### Using Docker Compose Directly

```bash
# Build images
docker-compose build

# Build without cache
docker-compose build --no-cache

# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs (all services)
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# List services
docker-compose ps

# Execute command in service
docker-compose exec backend npm test
docker-compose exec frontend npm run build

# Access shell in service
docker-compose exec backend sh
docker-compose exec frontend sh

# Restart service
docker-compose restart backend

# View resource usage
docker stats

# Clean up unused resources
docker system prune
docker system prune -a --volumes
```

### Using Make Commands

```bash
# View all available commands
make help

# Build Docker images
make build
make rebuild

# Start/stop services
make up
make down
make restart
make dev        # foreground
make prod       # production mode

# Monitoring
make logs
make logs-backend
make logs-frontend
make ps
make stats

# Development
make shell-backend
make shell-frontend
make test
make lint

# Database
make db-local   # with DynamoDB
make db-clean   # remove data

# Cleanup
make clean
make prune
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check Docker daemon
docker ps

# Check logs
docker-compose logs

# Check specific service
docker-compose logs backend

# Rebuild
docker-compose build --no-cache

# Restart
docker-compose down -v
docker-compose up -d
```

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000  # macOS/Linux
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
Stop-Process -Id <PID> -Force  # Windows

# Or use different port
docker-compose up -d -p 3001:3000
```

### Image Build Fails

```bash
# Clean build
docker-compose build --no-cache --progress=plain

# Check Dockerfile
cat backend/Dockerfile

# Test individual stage
docker build --target builder backend/

# View build history
docker image history eventgo-backend
```

### Volumes Not Mounting

**Windows (WSL 2):**
```bash
# Clone repo into WSL filesystem
wsl
cd ~
git clone <url>
cd aditya-eventgo

# Don't use /mnt/c/... paths (very slow)
```

**All platforms:**
```bash
# Verify volume mount
docker-compose exec backend mount | grep app

# Rebuild with volumes
docker-compose down
docker volume prune
docker-compose up -d --build
```

### Memory Issues

```bash
# Check resource limits
docker stats

# Increase Docker memory
# Windows: Docker Desktop Settings → Resources
# macOS: Docker Desktop Preferences → Resources
# Linux: Edit /etc/docker/daemon.json

# Example:
{
  "storage-driver": "overlay2",
  "storage-opts": [
    "overlay2.override_kernel_check=true"
  ],
  "memory": "4g",
  "memswap": "8g",
  "cpus": "2.0"
}
```

### DNS/Network Issues

```bash
# Check network connectivity
docker-compose exec backend ping frontend

# Restart Docker daemon
sudo systemctl restart docker  # Linux
# macOS/Windows: Docker Desktop → Restart

# Check container network
docker network ls
docker network inspect eventgo_eventgo
```

### Health Check Failing

```bash
# View health status
docker-compose ps

# Manual health check
docker-compose exec backend curl http://localhost:5000/health
docker-compose exec frontend curl http://localhost/

# Check service logs
docker-compose logs backend
docker-compose logs frontend
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates ready (for HTTPS)
- [ ] Backups configured
- [ ] Monitoring/logging setup
- [ ] Resource limits set
- [ ] Health checks verified

### Deploy to AWS EC2

```bash
# 1. SSH into EC2 instance
ssh -i key.pem ubuntu@your-instance-ip

# 2. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 3. Clone repository
git clone <your-repo-url>
cd aditya-eventgo

# 4. Configure environment
cp .env.docker .env.local
nano .env.local
# Set NODE_ENV=production, AWS credentials, etc.

# 5. Start with production config
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 6. Monitor
docker-compose logs -f
docker stats
```

### Setup SSL/TLS Certificates

```bash
# 1. Create certs directory
mkdir -p certs

# 2. Option A: Self-signed (development)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/key.pem -out certs/cert.pem

# 2. Option B: Let's Encrypt (production)
sudo apt-get install certbot
certbot certonly --standalone -d your-domain.com
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem certs/key.pem
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem certs/cert.pem
sudo chown -R $USER:$USER certs/

# 3. Start with Nginx proxy
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Enable Auto-Restart

```bash
# Edit docker-compose.prod.yml (already configured with restart: always)
# Or manually:
docker update --restart=always eventgo-backend
docker update --restart=always eventgo-frontend
docker update --restart=always eventgo-proxy
```

### Database Backup

```bash
# AWS DynamoDB: Use AWS Console or CLI
aws dynamodb create-backup \
  --table-name events \
  --backup-name events-backup-$(date +%Y%m%d)

# Local DynamoDB (if applicable)
docker-compose exec dynamodb-local \
  aws dynamodb export-table-to-point-in-time \
  --table-arn arn:aws:dynamodb:us-east-1:123456789012:table/events \
  --s3-bucket my-backup-bucket
```

### Monitoring

```bash
# Real-time metrics
docker stats

# Container logs
docker-compose logs -f

# Event logs
docker events

# System info
docker system df

# Health status
docker-compose ps

# Manual health check
curl http://localhost:5000/health
curl http://localhost:3000/
```

### Updating Services

```bash
# 1. Pull latest code
git pull

# 2. Rebuild images
docker-compose build

# 3. Stop and start services
docker-compose down
docker-compose up -d

# 4. Verify
docker-compose ps
docker-compose logs
```

---

## Performance Optimization

### Image Size

```bash
# Check image sizes
docker images | grep eventgo

# Multi-stage builds reduce size by ~70%
# Current sizes:
# - Backend: ~200MB
# - Frontend: ~150MB
```

### Build Caching

```bash
# Leverage Docker layer caching
# Best practices:
# 1. Copy package.json before source code
# 2. Install dependencies in separate layer
# 3. Copy source code last (changes most frequently)

# Current Dockerfile follows these practices
```

### Runtime Performance

```bash
# Monitor performance
docker stats

# Resource limits (in docker-compose.prod.yml):
# Backend: 1 CPU, 1GB RAM
# Frontend: 0.5 CPU, 512MB RAM

# Adjust as needed based on load
```

---

## Security

### Best Practices Implemented

- ✅ Non-root users in containers
- ✅ Health checks on all services
- ✅ Resource limits configured
- ✅ Network isolation (bridge network)
- ✅ Security headers in Nginx
- ✅ SSL/TLS support configured
- ✅ Environment variables in `.env.local` (not in images)

### Additional Security

```bash
# Scan images for vulnerabilities
docker scan eventgo-backend
docker scan eventgo-frontend

# Use secrets (production)
docker secret create jwt_secret <(echo "your-secret")
docker service create --secret jwt_secret ...

# Enable Docker Content Trust
export DOCKER_CONTENT_TRUST=1
docker push your-registry/eventgo-backend
```

---

## Advanced Topics

### Docker Networking

```bash
# Inspect network
docker network inspect eventgo_eventgo

# Services communicate via DNS
# Example: http://backend:5000 from frontend container
```

### Multi-stage Builds

```dockerfile
# Stage 1: Dependencies (minimal layer)
FROM node:18-alpine as dependencies

# Stage 2: Builder (compilation)
FROM node:18-alpine as builder

# Stage 3: Runtime (optimized)
FROM node:18-alpine

# Each stage is independent, final image is smallest
```

### Docker Volumes

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect eventgo_dynamodb-data

# Backup volume
docker run --rm -v eventgo_dynamodb-data:/data \
  -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz /data

# Restore volume
docker run --rm -v eventgo_dynamodb-data:/data \
  -v $(pwd):/backup alpine tar xzf /backup/backup.tar.gz -C /data
```

### Custom Networking

```bash
# Create overlay network (for Docker Swarm)
docker network create --driver overlay eventgo-overlay

# Connect to multiple networks
docker network connect eventgo-overlay eventgo-backend
```

---

## References

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Dockerfile Best Practices](https://docs.docker.com/develop/dev-best-practices/dockerfile_best-practices/)
- [AWS DynamoDB in Docker](https://hub.docker.com/r/amazon/dynamodb-local)

---

## Support

For issues or questions:

1. Check [Troubleshooting](#troubleshooting) section
2. Review [Docker Setup Guide](DOCKER_SETUP.md)
3. Check container logs: `docker-compose logs`
4. File issue: Include output from `docker-compose logs -f`

---

**Last Updated:** 2024
**Version:** 1.0
