# Docker Deployment Guide

This guide covers deploying ChatLayer using Docker and Docker Compose.

## Quick Start

The fastest way to get ChatLayer running with Docker:

```bash
# 1. Clone the repository
git clone https://github.com/lirrensi/ChatLayer.git
cd ChatLayer

# 2. Configure the server
nano server/config/server.json

# 3. Set environment variables
cp .env.example .env
nano .env  # Update FILE_SIGNING_SECRET

# 4. Start with Docker Compose
docker-compose up -d

# 5. Check the logs
docker-compose logs -f chatlayer
```

Access the web UI at `http://localhost:31000`

## Docker Compose Configuration

The `docker-compose.yml` file provides a complete production-ready setup:

### Services

**chatlayer**
- Builds from `server/Dockerfile` using multi-stage build
- Exposes port 31000
- Mounts configuration directory for easy updates
- Persists database and uploads in Docker volumes
- Includes health checks
- Auto-restarts on failure

### Volumes

- **chatlayer_db**: Persists the SQLite database file
- **chatlayer_uploads**: Persists uploaded files

### Networks

- **chatlayer-network**: Bridge network for service communication

## Configuration

### Server Configuration

Edit `server/config/server.json` before starting:

```json
{
  "port": 31000,
  "apiKeys": ["your-secret-api-key-here"],
  "maxFileSize": 10485760,
  "fileTTLSeconds": 604800,
  "webhooks": []
}
```

### Environment Variables

Create a `.env` file in the project root:

```bash
FILE_SIGNING_SECRET=your-super-secret-key-here
NODE_ENV=production
```

**Important:** The `FILE_SIGNING_SECRET` is required for file upload security. Generate a strong random string for production.

## Docker Compose Commands

### Basic Operations

```bash
# Start the service
docker-compose up -d

# Stop the service
docker-compose down

# Restart the service
docker-compose restart

# View logs
docker-compose logs -f chatlayer

# View service status
docker-compose ps
```

### Building and Updating

```bash
# Rebuild after code changes
docker-compose up -d --build

# Force rebuild without cache
docker-compose build --no-cache
docker-compose up -d

# Pull latest images (if using pre-built images)
docker-compose pull
docker-compose up -d
```

### Maintenance

```bash
# Access container shell
docker-compose exec chatlayer sh

# View resource usage
docker stats chatlayer-server

# Remove volumes (WARNING: deletes all data)
docker-compose down -v
```

## Dockerfile Details

The `server/Dockerfile` uses a multi-stage build for efficiency:

### Stage 1: Frontend Builder
- Installs frontend dependencies
- Builds the Vue 3 + Ionic web UI
- Outputs to `/app/web_ui/dist`

### Stage 2: Server Builder
- Installs server dependencies
- Generates Prisma client
- Compiles TypeScript to JavaScript
- Outputs to `/app/server/dist`

### Stage 3: Production Image
- Minimal Node.js 20 Alpine image
- Copies built artifacts from previous stages
- Sets up necessary directories
- Configures health checks
- Runs the server

### Build Optimization

The Dockerfile includes several optimizations:
- **Multi-stage build** - Reduces final image size
- **.dockerignore** - Excludes unnecessary files from build context
- **Layer caching** - Reuses unchanged layers for faster rebuilds
- **Alpine base** - Minimal image footprint

## Production Deployment

### Reverse Proxy Setup

For production, deploy behind a reverse proxy (nginx, Apache, Caddy):

**nginx example:**

```nginx
server {
    listen 80;
    server_name chatlayer.yourdomain.com;

    location / {
        proxy_pass http://localhost:31000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### HTTPS Setup

Use Let's Encrypt with Certbot for free SSL certificates:

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d chatlayer.yourdomain.com
```

### Resource Limits

Configure resource limits in `docker-compose.yml`:

```yaml
services:
  chatlayer:
    # ... existing config ...
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### Backup Strategy

**Database backup:**

```bash
# Backup database volume
docker run --rm \
  -v chatlayer_db:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/chatlayer-db-$(date +%Y%m%d).tar.gz -C /data .

# Restore database
docker run --rm \
  -v chatlayer_db:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/chatlayer-db-20240131.tar.gz -C /data
```

**Uploads backup:**

```bash
# Backup uploads volume
docker run --rm \
  -v chatlayer_uploads:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/chatlayer-uploads-$(date +%Y%m%d).tar.gz -C /data .
```

### Monitoring

**Health check endpoint:**

```bash
curl http://localhost:31000/health
```

**View logs:**

```bash
# Real-time logs
docker-compose logs -f chatlayer

# Last 100 lines
docker-compose logs --tail=100 chatlayer

# Logs since specific time
docker-compose logs --since 2024-01-31T10:00:00 chatlayer
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs chatlayer

# Check container status
docker-compose ps

# Inspect container
docker inspect chatlayer-server
```

### Database issues

```bash
# Access container shell
docker-compose exec chatlayer sh

# Check database file
ls -la /app/db/

# View database contents (requires sqlite3)
sqlite3 /app/db/main.db "SELECT * FROM Message LIMIT 10;"
```

### Permission issues

```bash
# Fix volume permissions
docker-compose exec chatlayer chown -R node:node /app/db /app/public/uploads
```

### Build fails

```bash
# Clean build
docker-compose down
docker system prune -a
docker-compose build --no-cache
docker-compose up -d
```

### Port already in use

Change the port mapping in `docker-compose.yml`:

```yaml
services:
  chatlayer:
    ports:
      - "31001:31000"  # Use 31001 instead of 31000
```

## Security Best Practices

1. **Change default API keys** - Always update `server/config/server.json`
2. **Use strong FILE_SIGNING_SECRET** - Generate a random string with at least 32 characters
3. **Enable HTTPS** - Use a reverse proxy with SSL/TLS
4. **Restrict network access** - Use firewall rules to limit access
5. **Regular updates** - Keep Docker images and dependencies updated
6. **Monitor logs** - Set up log aggregation and monitoring
7. **Backup regularly** - Implement automated backup strategy
8. **Use secrets management** - Consider using Docker secrets for sensitive data

## Advanced Configuration

### Custom Dockerfile

If you need to customize the build, create a custom Dockerfile:

```dockerfile
FROM node:20-alpine

# Install additional dependencies
RUN apk add --no-cache sqlite3

# Copy custom configuration
COPY custom-config.json /app/config/server.json

# Rest of the build...
```

### Multiple environments

Create separate compose files for different environments:

```bash
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### External database

To use an external database instead of SQLite, modify the Dockerfile and configuration to connect to PostgreSQL or MySQL.

## Support

For issues or questions:
- Check the main [README.md](../README.md)
- Review [server/docs/](../server/docs/) for detailed documentation
- Open an issue on GitHub