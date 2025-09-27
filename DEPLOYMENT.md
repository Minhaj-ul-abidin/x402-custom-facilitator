# x402 Facilitator Server Deployment

## Production Deployment

### Docker Deployment

1. **Build Docker image:**
```bash
docker build -t x402-facilitator .
```

2. **Run container:**
```bash
docker run -d \
  --name x402-facilitator \
  -p 3000:3000 \
  -e EVM_PRIVATE_KEY=0x... \
  -e SVM_PRIVATE_KEY=... \
  -e NODE_ENV=production \
  x402-facilitator
```

### Environment Variables

**Required:**
- `EVM_PRIVATE_KEY` - Private key for EVM networks
- `SVM_PRIVATE_KEY` - Private key for Solana networks

**Optional:**
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (production/development)

### Health Monitoring

Monitor server health:
```bash
curl http://localhost:3000/health
```

### Load Balancing

For high availability, deploy multiple instances behind a load balancer:

```nginx
upstream x402_facilitator {
    server x402-facilitator-1:3000;
    server x402-facilitator-2:3000;
    server x402-facilitator-3:3000;
}

server {
    listen 80;
    location / {
        proxy_pass http://x402_facilitator;
    }
}
```

### Security Considerations

1. **Private Keys**: Store securely, never commit to version control
2. **HTTPS**: Use SSL certificates in production
3. **Rate Limiting**: Implement rate limiting for API endpoints
4. **Monitoring**: Set up logging and monitoring
5. **Backup**: Regular backups of configuration and logs

### Scaling

- **Horizontal**: Deploy multiple instances
- **Vertical**: Increase server resources
- **Database**: Add database for persistent storage if needed
- **Caching**: Implement caching for frequently accessed data
