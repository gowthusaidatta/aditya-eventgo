# Frontend Dockerfile - React with Vite
# Compatible with both Linux (Ubuntu) and Windows

# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Stage 2: Production runtime with nginx
FROM nginx:alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built application from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Create non-root user
RUN addgroup -g 1001 -S nginx && \
    adduser -S nginx -u 1001 || true

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
