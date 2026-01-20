# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install yarn
RUN npm install -g yarn

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install yarn and serve
RUN npm install -g yarn serve

# Copy built app from builder
COPY --from=builder /app/dist ./dist

# Set environment variables for Vite
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the application
CMD ["serve", "-s", "dist", "-l", "3000"]
