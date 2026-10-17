# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_BASE
ENV VITE_API_BASE=$VITE_API_BASE
ARG VITE_MSG91_WIDGET_ID
ENV VITE_MSG91_WIDGET_ID=$VITE_MSG91_WIDGET_ID
ARG VITE_MSG91_TOKEN_AUTH
ENV VITE_MSG91_TOKEN_AUTH=$VITE_MSG91_TOKEN_AUTH

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install serve to serve static files
RUN npm install -g serve

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 8080

# Start server
CMD ["serve", "-s", "dist", "-l", "8080"]
