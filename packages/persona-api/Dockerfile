# Build stage
FROM node:20-slim AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy package files (lockfile은 monorepo 루트에 있으므로 optional)
COPY package.json ./

# Install dependencies
RUN pnpm install

# Copy source
COPY . .

# Build
RUN pnpm build

# Production stage
FROM node:20-slim

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy package files and install production deps
COPY package.json ./
RUN pnpm install --prod

# Copy built files and data
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data

# Expose port (Fly.io uses 8080)
EXPOSE 8080

# Start
CMD ["node", "dist/index.js"]
