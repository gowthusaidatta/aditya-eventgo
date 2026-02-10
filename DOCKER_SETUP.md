# EventGo Docker Setup Guide

This guide covers the complete setup process for running EventGo using Docker containers.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

1.  **Docker Desktop** (or Docker Engine on Linux)
    *   [Download Docker Desktop](https://www.docker.com/products/docker-desktop/)
    *   Ensure it is running (whale icon in system tray).
2.  **Git** (for cloning the repository)
3.  **Make** (Optional but recommended, usually included or available via package manager)

---

## 💻 Platform Specifics

### Windows (WSL 2) - **Recommended**
For best performance on Windows, use WSL 2 (Windows Subsystem for Linux).
1.  Enable WSL 2 feature in Windows.
2.  Install Ubuntu from Microsoft Store.
3.  Configure Docker Desktop to use WSL 2 backend (Settings -> General -> Use the WSL 2 based engine).
4.  Standard: Clone the repo **inside** WSL (e.g., `~/projects/eventgo`), NOT in `/mnt/c/`.

### macOS (Intel & Apple Silicon)
Docker Desktop on Mac works out of the box. Ensure you allocate enough memory (at least 4GB recommended) in Preferences -> Resources.

### Linux (Ubuntu/Debian)
Install Docker Engine and Docker Compose plugin:
```bash
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER
# Log out and back in
```

---

## 🚀 Installation Steps

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd aditya-eventgo
```

### 2. Configure Environment Variables
Copy the template to a local environment file which Docker will read.
```bash
cp .env.docker .env.local
```
Edit `.env.local` to add your AWS Credentials if you want to connect to real AWS services. For local development with DynamoDB Local, strict AWS credentials might not be needed if using local endpoint.

### 3. Start Services
Use `make` for convenience:
```bash
make up
```
Or use standard Docker Compose:
```bash
docker-compose up -d
```
This will:
*   Build the backend image (~200MB)
*   Build the frontend image (~150MB)
*   Start DynamoDB Local (if configured)
*   Start Backend on port 5000
*   Start Frontend on port 3000

### 4. Verify Installation
Check running containers:
```bash
docker-compose ps
```
You should see `eventgo-frontend`, `eventgo-backend`, and optionally `dynamodb-local` all with status "Up".

---

## 🛠️ Troubleshooting

### "Bind for 0.0.0.0:3000 failed"
This means port 3000 is already in use by another application (maybe a local `npm run dev` instance?).
**Solution**: Stop the other process or change ports in `docker-compose.yml`.

### "EACCES: permission denied" (Linux)
If you see permission errors with volumes, ensure your user has access to the directory or use `sudo` (though Docker group is preferred).

### Slow Performance on Windows
If the app is slow, ensure you are running from the Linux filesystem (`\\wsl$\Ubuntu\...`) and NOT the Windows filesystem (`/mnt/c/...`). File I/O across the boundary is very slow.

### Database Connection Refused
If the backend cannot connect to DynamoDB:
1.  Ensure `dynamodb-local` service is running.
2.  Check that backend is using `http://dynamodb-local:8000` as the endpoint (internal Docker network DNS).

### Rebuilding After Changes
If you edit code, the changes should reflect automatically (hot reloading) because volumes are mounted.
If you install new dependencies (`package.json`), you MUST rebuild:
```bash
make build
make up
```
Or:
```bash
docker-compose up -d --build
```

---

## 📦 Production Deployment

For production usage:

1.  Use the production compose file:
    ```bash
    make prod
    ```
2.  This usage:
    *   Optimized production build (no hot-reloads)
    *   Nginx as a reverse proxy
    *   Restart policies (always restart on failure)

To deploy to AWS ECS or similar:
1.  Build images and push to ECR/Docker Hub.
2.  Use `docker-compose.prod.yml` as a reference for task definitions.

---

## 📚 More Resources

*   [Docker Documentation](https://docs.docker.com/)
*   [Docker Compose Reference](https://docs.docker.com/compose/)
