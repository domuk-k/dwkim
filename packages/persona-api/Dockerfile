# Bun official image
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies (no lockfile in package dir, uses root workspace lock)
RUN bun install

# Copy source
COPY . .

# Build TypeScript
RUN bun run build

# Production stage
FROM oven/bun:1-slim

WORKDIR /app

# Copy package files and install production deps
COPY package.json ./
RUN bun install --production

# Copy built files and data
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data

# Expose port (Fly.io uses 8080)
EXPOSE 8080

# Start with Bun
CMD ["bun", "run", "dist/index.js"]
