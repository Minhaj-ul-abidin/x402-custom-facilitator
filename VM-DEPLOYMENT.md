# x402 Facilitator VM Deployment Guide

This guide helps you deploy the x402 facilitator on a basic virtual machine.

## Prerequisites

- Ubuntu 20.04+ or similar Linux distribution
- At least 2GB RAM
- At least 10GB disk space
- Internet connection

## Quick Deployment

### Option 1: Automated Deployment (Recommended)

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd custom-facilitator
   ```

2. **Run the deployment script:**
   ```bash
   ./deploy.sh
   ```

3. **Configure environment variables:**
   ```bash
   nano .env
   ```

4. **Restart the service:**
   ```bash
   docker-compose restart
   ```

### Option 2: Manual Deployment

1. **Install Docker:**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

2. **Install Docker Compose:**
   ```bash
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

3. **Build and start:**
   ```bash
   docker-compose build
   docker-compose up -d
   ```

## Configuration

### Environment Variables

Edit the `.env` file with your configuration:

```bash
# Required: Private keys for signing transactions
FACILITATOR_PRIVATE_KEY=0x1234...
EVM_PRIVATE_KEY=0x1234...
SVM_PRIVATE_KEY=1234...

# Optional: Alchemy API key for better RPC performance
ALCHEMY_API_KEY=your_alchemy_key

# Optional: Custom port
PORT=3000

# Optional: Environment
NODE_ENV=production
```

### Firewall Configuration

Allow incoming connections on port 3000:

```bash
sudo ufw allow 3000
sudo ufw enable
```

## Service Management

### Using Docker Compose

```bash
# View logs
docker-compose logs -f

# Restart service
docker-compose restart

# Stop service
docker-compose down

# Update service
./update.sh
```

### Using Systemd

```bash
# Start service
sudo systemctl start x402-facilitator

# Stop service
sudo systemctl stop x402-facilitator

# Check status
sudo systemctl status x402-facilitator

# Enable auto-start
sudo systemctl enable x402-facilitator
```

## Monitoring

### Health Checks

- **Health endpoint:** `http://your-server:3000/health`
- **API documentation:** `http://your-server:3000/api-docs`
- **Supported networks:** `http://your-server:3000/supported`

### Logs

- **Application logs:** `logs/combined-*.log`
- **Error logs:** `logs/error-*.log`
- **HTTP logs:** `logs/http-*.log`

### Docker Logs

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs x402-facilitator

# Follow logs in real-time
docker-compose logs -f
```

## Security Considerations

### 1. Private Keys
- Store private keys securely
- Use environment variables, not code
- Consider using a key management service

### 2. Network Security
- Use a reverse proxy (nginx) for SSL/TLS
- Configure firewall rules
- Consider VPN access for admin functions

### 3. System Security
- Keep the system updated
- Use non-root user for deployment
- Monitor logs for suspicious activity

## Troubleshooting

### Service Won't Start

1. **Check logs:**
   ```bash
   docker-compose logs
   ```

2. **Check environment variables:**
   ```bash
   cat .env
   ```

3. **Check port availability:**
   ```bash
   sudo netstat -tlnp | grep 3000
   ```

### Performance Issues

1. **Check resource usage:**
   ```bash
   docker stats
   ```

2. **Check logs for errors:**
   ```bash
   tail -f logs/error-*.log
   ```

### Network Issues

1. **Test connectivity:**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Check firewall:**
   ```bash
   sudo ufw status
   ```

## Backup and Recovery

### Backup

```bash
# Backup logs
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/

# Backup configuration
cp .env .env.backup
```

### Recovery

```bash
# Restore from backup
tar -xzf logs-backup-YYYYMMDD.tar.gz

# Restore configuration
cp .env.backup .env
```

## Updates

### Automatic Update

```bash
./update.sh
```

### Manual Update

```bash
git pull
docker-compose build
docker-compose restart
```

## Support

For issues and questions:
1. Check the logs first
2. Review this documentation
3. Check the API documentation at `/api-docs`
4. Create an issue in the repository

## Production Checklist

- [ ] Private keys configured
- [ ] Firewall configured
- [ ] SSL/TLS configured (if exposing to internet)
- [ ] Monitoring set up
- [ ] Backup strategy implemented
- [ ] Log rotation configured
- [ ] Health checks working
- [ ] Service auto-starts on boot
