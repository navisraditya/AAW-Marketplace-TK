# Stage 1: Fetching the node image and building the application
FROM node:18.18.2 AS builder

# Setting up the work directory
WORKDIR /service-wishlist

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
ENV PORT 8004
ENV NODE_ENV production

# Set working directory
WORKDIR /service-wishlist

RUN npm install -g tsx
# Copy built files from the previous stage
COPY --from=builder /service-wishlist/dist ./dist
COPY --from=builder /service-wishlist/package.json ./package.json
COPY --from=builder /service-wishlist/drizzle ./drizzle
COPY ./entrypoint.sh ./entrypoint.sh

# Make entrypoint executable
RUN chmod +x ./entrypoint.sh

# Install production dependencies only
RUN npm install --only=production

# Expose server port
EXPOSE 8004

# Start the application
CMD ["./entrypoint.sh"]


