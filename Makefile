.PHONY: help up down logs logs-backend shell-backend db-local dev prod build clean check-health install-deps

# Default target
all: help

# Colors
YELLOW := \033[1;33m
GREEN := \033[0;32m
RESET := \033[0m

help:
	@echo "$(YELLOW)EventGo Docker Make Commands$(RESET)"
	@echo ""
	@echo "Usage:"
	@echo "  $(GREEN)make up$(RESET)              Start all services in detached mode"
	@echo "  $(GREEN)make down$(RESET)            Stop all services"
	@echo "  $(GREEN)make restart$(RESET)         Restart all services"
	@echo "  $(GREEN)make logs$(RESET)            View logs for all services"
	@echo "  $(GREEN)make logs-backend$(RESET)    View logs for backend service"
	@echo "  $(GREEN)make shell-backend$(RESET)   Access backend container shell"
	@echo "  $(GREEN)make build$(RESET)           Rebuild images (no cache)"
	@echo "  $(GREEN)make clean$(RESET)           Remove containers, networks, and volumes"
	@echo "  $(GREEN)make dev$(RESET)             Start in development mode (attached)"
	@echo "  $(GREEN)make prod$(RESET)            Start in production mode"
	@echo "  $(GREEN)make db-local$(RESET)        Start only DynamoDB local"
	@echo "  $(GREEN)make check-health$(RESET)    Check health of services"
	@echo ""

up:
	docker-compose up -d
	@echo "$(GREEN)Services started! Access at http://localhost:3000$(RESET)"

down:
	docker-compose down

restart: down up

logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

shell-backend:
	docker-compose exec backend sh

build:
	docker-compose build --no-cache

clean:
	docker-compose down -v --remove-orphans

dev:
	docker-compose up

prod:
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

db-local:
	docker-compose up -d dynamodb-local
	@echo "$(GREEN)DynamoDB Local started at http://localhost:8000$(RESET)"
	@echo "Use --endpoint-url http://localhost:8000 for AWS CLI"

check-health:
	docker-compose ps
	@echo ""
	@echo "$(YELLOW)Container Stats:$(RESET)"
	docker stats --no-stream

install-deps:
	npm install
	cd backend && npm install
