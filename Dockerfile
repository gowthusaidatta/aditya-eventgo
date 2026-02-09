# Frontend Dockerfile - React with Vite
# Compatible with both Linux (Ubuntu) and Windows

# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Build-time public env vars for Vite (passed via docker-compose build args)
ARG VITE_API_URL
ARG VITE_API_BASE_URL
ARG VITE_APP_URL
ARG VITE_COGNITO_USER_POOL_ID
ARG VITE_COGNITO_CLIENT_ID
ARG VITE_COGNITO_REGION
ARG VITE_COGNITO_DOMAIN
ARG VITE_COGNITO_REDIRECT_URI
ARG VITE_COGNITO_LOGOUT_URI

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_APP_URL=${VITE_APP_URL}
ENV VITE_COGNITO_USER_POOL_ID=${VITE_COGNITO_USER_POOL_ID}
ENV VITE_COGNITO_CLIENT_ID=${VITE_COGNITO_CLIENT_ID}
ENV VITE_COGNITO_REGION=${VITE_COGNITO_REGION}
ENV VITE_COGNITO_DOMAIN=${VITE_COGNITO_DOMAIN}
ENV VITE_COGNITO_REDIRECT_URI=${VITE_COGNITO_REDIRECT_URI}
ENV VITE_COGNITO_LOGOUT_URI=${VITE_COGNITO_LOGOUT_URI}

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
RUN mkdir -p /var/www/frontend
COPY --from=builder /app/dist /var/www/frontend

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
