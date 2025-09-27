#!/bin/bash

# x402 Facilitator Update Script
# This script updates the running x402 facilitator service

set -e

echo "🔄 Updating x402 Facilitator..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    print_error "docker-compose.yml not found. Please run this script from the application directory."
    exit 1
fi

# Backup current logs
print_status "Backing up current logs..."
if [ -d "logs" ]; then
    BACKUP_DIR="logs-backup-$(date +%Y%m%d-%H%M%S)"
    cp -r logs $BACKUP_DIR
    print_status "Logs backed up to $BACKUP_DIR"
fi

# Pull latest changes (if using git)
if [ -d ".git" ]; then
    print_status "Pulling latest changes from git..."
    git pull
fi

# Build new image
print_status "Building new Docker image..."
docker-compose build

# Restart services
print_status "Restarting services..."
docker-compose down
docker-compose up -d

# Wait for service to be ready
print_status "Waiting for service to start..."
sleep 10

# Check if service is running
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    print_status "✅ Update completed successfully!"
    print_status "🌐 Service is running at: http://localhost:3000"
else
    print_error "❌ Service failed to start after update. Check logs with: docker-compose logs"
    exit 1
fi

# Clean up old Docker images
print_status "Cleaning up old Docker images..."
docker image prune -f

print_status "🎉 Update completed successfully!"
