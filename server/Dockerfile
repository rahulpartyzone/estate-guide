# syntax=docker/dockerfile:1

# --- STAGE 1: Install ALL dependencies (dev + prod) ---
# This stage is fine, but we'll rename it for clarity
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# --- STAGE 2: Build the app ---
FROM node:20-alpine AS builder
WORKDIR /app

# Copy ALL dependencies (dev + prod)
COPY --from=base /app/node_modules ./node_modules

# Copy ALL source code (including prisma/schema.prisma)
COPY . .

# --- FIX #1: Run Prisma Generate ---
# Now that we have both node_modules AND schema.prisma,
# we can generate the Prisma client before building.
RUN npx prisma generate

# Now we can safely build the app
RUN npm run build

# --- STAGE 3: Production Runner ---
FROM node:20-alpine AS runner
# Ensure OpenSSL runtime libraries are present for Prisma
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /app

# Install ONLY production dependencies for a small final image
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund

# Copy the *compiled code* from the builder
COPY --from=builder /app/dist ./dist

# --- FIX #2: Copy the *generated* Prisma client ---
# This is the magic. We take our clean prod node_modules,
# and we just add the generated client bits on top.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client


# Cloud Run uses PORT env var
ENV PORT=8080
EXPOSE 8080

CMD ["npm", "run", "start:migrate:prod"]
