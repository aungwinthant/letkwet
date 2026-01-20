# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Accept build arguments
ARG GEMINI_API_KEY
ARG SUPABASE_URL
ARG SUPABASE_ANON_KEY

# Create .env file for Vite during build
RUN echo "GEMINI_API_KEY=${GEMINI_API_KEY}" > .env.local && \
    echo "SUPABASE_URL=${SUPABASE_URL}" >> .env.local && \
    echo "SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}" >> .env.local

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install serve
RUN npm install -g serve

# Copy built app from builder
COPY --from=builder /app/dist ./dist

# Copy entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Set environment variables for Vite
ENV NODE_ENV=production
ENV PORT=8080

# Expose port (Cloud Run uses PORT env variable)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 8080), (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the application via entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]
