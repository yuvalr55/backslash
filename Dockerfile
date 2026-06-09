# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ── Stage 2: production ────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Non-root user for least-privilege execution
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output from the builder stage
COPY --from=builder /app/dist ./dist

# Copy graph data (can be overridden by a bind mount at runtime)
COPY data/ ./data/

# Copy OpenAPI spec — served as interactive Swagger UI at /docs
COPY openapi.yaml ./

ENV NODE_ENV=production \
    PORT=3000 \
    LOG_LEVEL=info \
    GRAPH_DATA_PATH=./data/graph.json \
    REQUEST_LOGGING_ENABLED=true \
    MAX_GRAPH_DEPTH=50

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
