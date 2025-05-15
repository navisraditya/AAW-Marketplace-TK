# Stage 1: Fetching the node image and building the application
FROM node:18.18.2 AS builder

# Setting up the work directory
WORKDIR /service-auth

# Copying package.json separately
COPY package.json ./

# Install pnpm
RUN npm install -g pnpm typescript

# Installing dependencies
RUN pnpm install

# Copying the rest of the application
COPY . .

# Building our application
RUN pnpm config set enable-scripts true
RUN pnpm run generate
RUN pnpm run build

# Stage 2: Creating a lightweight image for production
FROM node:18.18.2-slim

# Declaring env
ENV PORT 8001
ENV NODE_ENV production

# Set working directory
WORKDIR /service-auth

RUN npm install -g tsx
# Copy built files from the previous stage
COPY --from=builder /service-auth/dist ./dist
COPY --from=builder /service-auth/package.json ./package.json
COPY --from=builder /service-auth/drizzle ./drizzle


# Install production dependencies only
RUN npm install --only=production

# Expose server port
EXPOSE 8001

# Start the application
CMD ["bash", "-c", "tsx dist/src/db/migrate.js && node dist/src/server.js"]