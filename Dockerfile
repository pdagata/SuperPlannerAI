# ── Stage 1: Build frontend ───────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm install -g tsx

COPY --from=builder /app/dist ./dist
COPY server.ts tsconfig.json ./
COPY src/db ./src/db
COPY src/lib ./src/lib

RUN mkdir -p /data

EXPOSE 3000
ENV NODE_ENV=production
ENV DATABASE_PATH=/data/agileflow.db

CMD ["tsx", "server.ts"]
