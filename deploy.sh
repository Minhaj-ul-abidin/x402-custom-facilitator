#!/bin/bash

# x402 Facilitator Deployment Script
# This script sets up the x402 facilitator on a basic VM

set -e

echo "🚀 Starting x402 Facilitator Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# Update system packages
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
if ! command -v docker &> /dev/null; then
    print_status "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    print_warning "Please log out and back in for Docker group changes to take effect"
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_status "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Create application directory
APP_DIR="/opt/x402-facilitator"
print_status "Creating application directory at $APP_DIR..."
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Copy application files
print_status "Copying application files..."
cp -r . $APP_DIR/
cd $APP_DIR

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    print_status "Creating .env file from template..."
    cp env.example .env
    print_warning "Please edit .env file with your actual values before starting the service"
fi

# Create logs and data directories
mkdir -p logs data

# Build and start the application
print_status "Building Docker image..."
docker-compose build

print_status "Starting x402 Facilitator..."
docker-compose up -d

# Wait for service to be ready
print_status "Waiting for service to start..."
sleep 10

# Check if service is running
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    print_status "✅ x402 Facilitator is running successfully!"
    print_status "🌐 API available at: http://localhost:3000"
    print_status "📚 API docs available at: http://localhost:3000/api-docs"
    print_status "📊 Health check: http://localhost:3000/health"
else
    print_error "❌ Service failed to start. Check logs with: docker-compose logs"
    exit 1
fi

# Create systemd service for auto-start
print_status "Creating systemd service for auto-start..."
sudo tee /etc/systemd/system/x402-facilitator.service > /dev/null <<EOF
[Unit]
Description=x402 Facilitator Service
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0
User=$USER

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable x402-facilitator.service

print_status "✅ Deployment completed successfully!"
print_status ""
print_status "📋 Useful commands:"
print_status "  View logs: docker-compose logs -f"
print_status "  Restart: docker-compose restart"
print_status "  Stop: docker-compose down"
print_status "  Update: git pull && docker-compose build && docker-compose up -d"
print_status ""
print_status "🔧 Service management:"
print_status "  Start: sudo systemctl start x402-facilitator"
print_status "  Stop: sudo systemctl stop x402-facilitator"
print_status "  Status: sudo systemctl status x402-facilitator"
print_status ""
print_warning "Don't forget to:"
print_warning "  1. Edit .env file with your private keys and API keys"
print_warning "  2. Configure firewall to allow port 3000"
print_warning "  3. Set up SSL/TLS if exposing to the internet"
