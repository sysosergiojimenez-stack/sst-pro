# SST Pro - Seguridad Industrial
# Build: v2 - Forzando rebuild para fix de credenciales EPP
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN echo '{"name":"sst-pro-server","version":"1.0.0","private":true}' > dist/server/package.json

FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
ENV GOOGLE_APPLICATION_CREDENTIALS=/secrets/service-account.json
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1
CMD ["node", "dist/server/index.js"]
