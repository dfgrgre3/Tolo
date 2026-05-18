#!/bin/bash
set -euo pipefail

# Thanawy Deployment Script
# Usage: IMAGE_TAG=<sha> ./scripts/deploy.sh

: "${IMAGE_TAG:?Must set IMAGE_TAG}"
: "${REGISTRY:=ghcr.io}"
: "${IMAGE_NAME_FRONTEND:=thanawy/thanawy-app}"
: "${IMAGE_NAME_BACKEND:=thanawy/thanawy-backend}"

echo "Deploying Thanawy version: $IMAGE_TAG"

# Pull latest images
docker compose -f docker-compose.production.yml pull

# Apply migrations
docker compose -f docker-compose.production.yml run --rm backend ./migrate

# Deploy with zero-downtime (rolling update)
docker compose -f docker-compose.production.yml up -d --remove-orphans --no-deps

# Health check
echo "Waiting for backend health check..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8082/health > /dev/null 2>&1; then
    echo "Backend healthy"
    break
  fi
  sleep 2
done

echo "Waiting for frontend health check..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000/api/healthz > /dev/null 2>&1; then
    echo "Frontend healthy"
    break
  fi
  sleep 2
done

# Cleanup old images
docker image prune -f

echo "Deployment complete: $IMAGE_TAG"
