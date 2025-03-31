# Multi-stage Dockerfile for Telegram Bot

# Build stage
FROM oven/bun:1.0.30 AS build

WORKDIR /app

# Copy package.json and lock files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Production stage
FROM oven/bun:1.0.30-slim AS production

WORKDIR /app

# Copy package.json and lock files
COPY package.json bun.lock ./

# Install production dependencies only
RUN bun install --production --frozen-lockfile

# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Copy configuration
COPY --from=build /app/config ./config

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Command to run the application
CMD ["bun", "run", "dist/main.js"]