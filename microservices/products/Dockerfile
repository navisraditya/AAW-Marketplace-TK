# Stage 1: Fetching the node image and building the application
FROM node:18.18.2 AS builder

# Setting up the work directory
WORKDIR /service-products

# Copying package.json separately
COPY package.json ./

# Install pnpm
RUN npm install -g pnpm typescript

# Installing dependencies
RUN pnpm install

# Copying the rest of the application
COPY . .

# Building our applicatioun
RUN pnpm config set enable-scripts true
RUN pnpm run generate
RUN pnpm run build

# Stage 2: Creating a lightweight image for production
FROM node:18.18.2-slim

# Declaring env
ENV PORT 8002
ENV NODE_ENV production

# Set working directory
WORKDIR /service-products

RUN npm install -g tsx
# Copy built files from the previous stage
COPY --from=builder /service-products/dist ./dist
COPY --from=builder /service-products/package.json ./package.json
COPY --from=builder /service-products/drizzle ./drizzle

# Install production dependencies only
RUN npm install --only=production

# Copy the entrypoint script
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Expose server port
EXPOSE 8002

# Start the application using the entrypoint script
CMD ["./entrypoint.sh"]
