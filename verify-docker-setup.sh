#!/bin/bash
# Docker Setup Verification Script
# Run this to verify all Docker infrastructure is in place

set -e

echo "================================================"
echo "EventGo Docker Infrastructure Verification"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
total=0
found=0

# Function to check file
check_file() {
    local file=$1
    local description=$2
    
    total=$((total + 1))
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $description"
        echo "  Location: $file"
        echo "  Size: $(du -h "$file" | cut -f1)"
        found=$((found + 1))
    else
        echo -e "${RED}✗${NC} $description"
        echo "  Location: $file (NOT FOUND)"
    fi
    echo ""
}

# Function to check directory
check_dir() {
    local dir=$1
    local description=$2
    
    total=$((total + 1))
    
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓${NC} $description"
        echo "  Location: $dir"
        found=$((found + 1))
    else
        echo -e "${RED}✗${NC} $description"
        echo "  Location: $dir (NOT FOUND)"
    fi
    echo ""
}

# Function to check command
check_command() {
    local cmd=$1
    local description=$2
    
    total=$((total + 1))
    
    if command -v $cmd &> /dev/null; then
        echo -e "${GREEN}✓${NC} $description"
        echo "  Version: $($cmd --version | head -n 1)"
        found=$((found + 1))
    else
        echo -e "${RED}✗${NC} $description (NOT INSTALLED)"
    fi
    echo ""
}

echo "1. CHECKING DOCKER INSTALLATION"
echo "==============================="
check_command docker "Docker Engine"
check_command docker-compose "Docker Compose"
echo ""

echo "2. CHECKING DOCKER FILES"
echo "========================"
check_file "Dockerfile" "Frontend Dockerfile"
check_file "backend/Dockerfile" "Backend Dockerfile"
check_file "docker-compose.yml" "Docker Compose (Development)"
check_file "docker-compose.prod.yml" "Docker Compose (Production)"
check_file ".dockerignore" "Frontend .dockerignore"
check_file "backend/.dockerignore" "Backend .dockerignore"
check_file ".env.docker" "Environment Template"
echo ""

echo "3. CHECKING NGINX CONFIGURATION"
echo "================================"
check_file "nginx.conf" "Nginx Configuration (Frontend Routing)"
check_file "nginx.proxy.prod.conf" "Nginx Configuration (Production SSL/TLS)"
echo ""

echo "4. CHECKING DOCUMENTATION"
echo "========================="
check_file "DOCKER_SETUP.md" "Complete Docker Setup Guide"
check_file "DOCKER_QUICK_REFERENCE.md" "Quick Reference Guide"
check_file "DOCKER_COMPLETION_SUMMARY.md" "Completion Summary"
check_file "README_DOCKER.md" "Docker Overview"
echo ""

echo "5. CHECKING BUILD AUTOMATION"
echo "============================="
check_file "Makefile" "Makefile with Docker Commands"
echo ""

echo "6. CHECKING PROJECT STRUCTURE"
echo "============================="
check_dir "src" "Frontend Source"
check_dir "backend" "Backend Source"
check_dir "public" "Public Assets"
echo ""

echo "7. CHECKING CONFIGURATION FILES"
echo "================================"
check_file ".env.local" "Local Environment Configuration"
check_file "package.json" "Frontend Package Configuration"
check_file "backend/package.json" "Backend Package Configuration"
echo ""

echo "8. DOCKER COMPOSE VALIDATION"
echo "============================"
if command -v docker-compose &> /dev/null; then
    if docker-compose config > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} docker-compose.yml is valid"
        echo "  Services defined:"
        docker-compose config --services 2>/dev/null | sed 's/^/    - /'
    else
        echo -e "${RED}✗${NC} docker-compose.yml validation failed"
    fi
else
    echo -e "${YELLOW}⚠${NC} docker-compose not found, skipping validation"
fi
echo ""

echo "================================================"
echo "VERIFICATION SUMMARY"
echo "================================================"
echo "Files checked: $total"
echo "Files found: $found"

if [ $found -eq $total ]; then
    echo -e "${GREEN}Status: ALL CHECKS PASSED ✓${NC}"
    echo ""
    echo "Your Docker infrastructure is ready!"
    echo ""
    echo "Next steps:"
    echo "1. Run: make help (for available commands)"
    echo "2. Run: docker-compose up -d (to start services)"
    echo "3. Open: http://localhost:3000 (in browser)"
    exit 0
else
    missing=$((total - found))
    echo -e "${RED}Status: $missing FILES MISSING${NC}"
    echo ""
    echo "Please ensure all files are present before deploying."
    exit 1
fi
