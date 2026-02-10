# EventGo Docker Quick Reference

## 🚀 30-Second Start

```bash
# 1. Clone & Enter
git clone <repo-url>
cd aditya-eventgo

# 2. Setup Env
cp .env.docker .env.local
# (Edit .env.local with AWS credentials if needed)

# 3. Launch
make up
# OR: docker-compose up -d

# 4. Access
# Frontend: http://localhost:3000
# Backend:  http://localhost:5000
```

## 🛠️ Essential Commands

| Action | Command | Description |
|--------|---------|-------------|
| **Start** | `make up` | Start all services in background |
| **Stop** | `make down` | Stop all services |
| **Logs** | `make logs` | View all logs in real-time |
| **Backend Logs** | `make logs-backend` | View only backend logs |
| **Shell** | `make shell-backend` | Open terminal inside backend container |
| **Rebuild** | `make build` | Rebuild images from scratch |
| **Clean** | `make clean` | Remove containers & volumes |

## ⚠️ Common Issues

### Port 3000/5000/8000 in use
**Error**: `Bind for 0.0.0.0:3000 failed: port is already allocated`
**Fix**:
```bash
# Find process
lsof -i :3000 (Mac/Linux)
netstat -ano | findstr :3000 (Windows)

# Kill it or change usage
```

### Docker Daemon Not Running
**Error**: `Cannot connect to the Docker daemon`
**Fix**: Start Docker Desktop application.

### AWS Credentials Missing
**Error**: `Missing Region in config`
**Fix**: Ensure `AWS_REGION` and credentials are set in `.env.local`.

## 📚 More Info
- [Complete Setup Guide](DOCKER_SETUP.md)
- [Main README](README_DOCKER.md)
