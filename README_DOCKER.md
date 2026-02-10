# EventGo - Docker-Ready Event Management Platform

Full-stack event management application with Docker containerization for Windows, Linux, and macOS.

## 🚀 Quick Start

```bash
# Navigate to the project directory
cd aditya-eventgo

# Copy environment template
cp .env.docker .env.local

# Start all services
docker-compose up -d

# Open in browser
# Windows: start http://localhost:3000
# Linux: xdg-open http://localhost:3000
# macOS: open http://localhost:3000
```

**Services running:**
- **Frontend**: http://localhost:3000 (React + TypeScript)
- **Backend**: http://localhost:5000 (Express.js)
- **DynamoDB**: http://localhost:8000 (optional, with `--profile local-db`)

---

## 📚 Documentation

### Quick References
- **[DOCKER_QUICK_REFERENCE.md](DOCKER_QUICK_REFERENCE.md)** - 30-second setup, essential commands, platform guides
- **[DOCKER_SETUP.md](DOCKER_SETUP.md)** - Complete guide, troubleshooting, production deployment

### Using Make Commands

```bash
# View all available commands
make help

# Essential commands
make up              # Start services
make down            # Stop services
make logs            # Watch logs
make shell-backend   # Access backend terminal
make db-local        # With local DynamoDB
```

All make commands available in [Makefile](Makefile).

---

## 🖥️ Platform Support

### Windows (WSL 2)
- Docker Desktop for Windows
- WSL 2 backend enabled
- Project cloned into WSL filesystem for performance

### Linux (Ubuntu/Debian)
- Native Docker support
- Single command installation
- Verified on Ubuntu 20.04 LTS+

### macOS
- Docker Desktop for Mac
- Both Intel and Apple Silicon supported
- Same commands as Linux

---

## 🏗️ Architecture

### Multi-Stage Docker Builds

**Backend (Express.js)**
```dockerfile
Stage 1: Dependencies layer (minimal)
Stage 2: Builder layer (with dev deps)
Stage 3: Runtime layer (production only)
Result: ~200MB optimized image
```

**Frontend (React + Vite)**
```dockerfile
Stage 1: Node.js build
Stage 2: Nginx runtime
Result: ~150MB optimized image with static serving
```

### Docker Compose

- **Development**: Hot reload enabled, simple setup
- **Production**: Resource limits, SSL/TLS ready, logging configured

---

## 📦 What's Included

### Infrastructure Files
```
├── backend/Dockerfile              # Backend multi-stage build
├── Dockerfile                       # Frontend multi-stage build
├── docker-compose.yml               # Development orchestration
├── docker-compose.prod.yml          # Production overrides
├── .dockerignore (2 files)          # Build optimization
├── .env.docker                      # Configuration template
├── nginx.conf                       # SPA routing config
├── nginx.proxy.prod.conf            # Production SSL/TLS config
└── Makefile                         # Convenient command shortcuts
```

### Documentation
```
├── DOCKER_QUICK_REFERENCE.md        # Quick start & common commands
└── DOCKER_SETUP.md                  # Complete guide with troubleshooting
```

---

## 🔐 Security Features

✅ **Non-root users** in containers  
✅ **Health checks** on all services  
✅ **Resource limits** configured  
✅ **Network isolation** via bridge network  
✅ **SSL/TLS support** for production  
✅ **Security headers** in Nginx  
✅ **Environment variables** separated from images  

---

## 📊 Service Status

```bash
# Check service health
docker-compose ps

# Monitor resource usage
docker stats

# View logs
docker-compose logs -f
```

---

## 🛠️ Common Tasks

### Development
```bash
make dev                    # Start in foreground
make logs                   # Watch logs
docker-compose exec backend npm test
```

### Debugging
```bash
docker-compose exec backend sh   # Shell access
docker-compose logs backend      # Service logs
docker-compose ps                # Service status
```

### Production Deployment
```bash
make prod                   # Production mode
docker-compose logs         # Monitor
docker stats                # Resource usage
```

### Database
```bash
make db-local              # With DynamoDB Local
docker-compose exec dynamodb-local sh
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Copy and edit template
cp .env.docker .env.local
nano .env.local
```

**Required settings:**
```env
AWS_REGION=us-east-1
EVENTS_TABLE=your-events-table
USERS_TABLE=your-users-table
REGISTRATIONS_TABLE=your-registrations-table
COGNITO_USER_POOL_ID=your-pool-id
COGNITO_CLIENT_ID=your-client-id
COGNITO_REGION=us-east-1
JWT_SECRET=your-secret-key-min-32-chars
```

### Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Backend | 5000 | http://localhost:5000 |
| DynamoDB | 8000 | http://localhost:8000 |

---

## 📈 Performance

### Image Optimization

- **Multi-stage builds**: 70% smaller than single-stage
- **Alpine Linux**: Minimal base images
- **Layer caching**: Fast rebuilds
- **Production optimizations**: Removed dev dependencies

### Benchmark (Approximate)

| Component | Image Size | Build Time | Startup Time |
|-----------|-----------|-----------|---|
| Backend | ~200MB | 45s | 3s |
| Frontend | ~150MB | 60s | 2s |
| Total | ~350MB | 120s | 5s |

---

## 🚨 Troubleshooting

### Port Already in Use
```bash
# Find process
lsof -i :3000

# Kill and restart
docker-compose restart
```

### Slow on Windows
```bash
# Clone into WSL filesystem, not /mnt/c/
wsl
cd ~
git clone <url>
```

### Memory Issues
```bash
# Increase Docker memory in settings
# Windows/macOS: Docker Desktop → Settings → Resources
# Linux: Edit /etc/docker/daemon.json

# Check usage
docker stats
```

### Build Failures
```bash
# Full rebuild without cache
docker-compose build --no-cache --progress=plain

# Check logs
docker-compose logs backend
```

For more troubleshooting, see [DOCKER_SETUP.md#troubleshooting](DOCKER_SETUP.md#troubleshooting).

---

## 📞 Support

- **Quick answers**: Check [DOCKER_QUICK_REFERENCE.md](DOCKER_QUICK_REFERENCE.md)
- **Detailed guide**: See [DOCKER_SETUP.md](DOCKER_SETUP.md)
- **Issues**: Check `docker-compose logs` output
- **Help**: Run `make help` for available commands

---

## 🎯 Next Steps

1. **Set up environment**: `cp .env.docker .env.local`
2. **Start services**: `docker-compose up -d`
3. **Verify health**: `docker-compose ps`
4. **Access app**: http://localhost:3000
5. **View logs**: `docker-compose logs -f`

---

## 📋 Features

✨ **Full-Stack Application**
- React 18 + TypeScript frontend
- Express.js backend with 23+ endpoints
- AWS Cognito OAuth 2.0 authentication
- DynamoDB serverless database

🐳 **Docker Ready**
- Multi-platform support (Windows, Linux, macOS)
- Development and production configurations
- Hot reload for rapid development
- Production-grade security & optimization

📚 **Well Documented**
- Quick reference guide (30 seconds to running)
- Complete setup guide with troubleshooting
- Platform-specific instructions
- Make commands for easy operations

---

**Status**: ✅ Production Ready  
**Last Updated**: 2024  
**Version**: 1.0
