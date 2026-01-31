# Multi-stage Dockerfile for ChatLayer Server
# This builds both the frontend and backend, initializes the database, and runs the server

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/web_ui

# Copy web_ui package files
COPY web_ui/package.json web_ui/pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm@10.18.1 && \
    pnpm install --frozen-lockfile

# Copy web_ui source
COPY web_ui/ ./

# Build frontend
RUN pnpm run build

# Stage 2: Build Server
FROM node:20-alpine AS server-builder

WORKDIR /app/server

# Copy server package files
COPY server/package.json server/pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm@10.18.1 && \
    pnpm install --frozen-lockfile

# Copy server source
COPY server/ ./

# Generate Prisma client
RUN pnpm run generate

# Build TypeScript
RUN pnpm run build

# Stage 3: Production Image
FROM node:20-alpine

WORKDIR /app

# Install pnpm for runtime
RUN npm install -g pnpm@10.18.1

# Copy server dependencies and built files
COPY --from=server-builder /app/server/package.json /app/server/pnpm-lock.yaml ./
COPY --from=server-builder /app/server/node_modules ./node_modules
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/prisma ./prisma
COPY --from=server-builder /app/server/config ./config

# Copy frontend build to public directory
COPY --from=frontend-builder /app/web_ui/dist ./public

# Copy Prisma client for runtime
COPY --from=server-builder /app/server/src/generated ./src/generated

# Create necessary directories
RUN mkdir -p db public/uploads

# Expose port
EXPOSE 31000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:31000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["node", "dist/server.js"]