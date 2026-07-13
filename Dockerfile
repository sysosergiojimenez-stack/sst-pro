# Stage 1: Build
FROM node:20-slim AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build client + server
RUN npm run build

# Stage 2: Production
FROM node:20-slim
WORKDIR /app

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copy credentials (from Secret Manager mounted at runtime)
# Or from environment variable

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start
CMD ["node", "dist/server/index.js"]
