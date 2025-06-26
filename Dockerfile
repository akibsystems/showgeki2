# Use Node.js 18 LTS Alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    git \
    curl \
    bash \
    python3 \
    make \
    g++

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Create necessary directories
RUN mkdir -p /app/scripts /app/mulmocast-cli/scripts /app/mulmocast-cli/output

# Copy application files
COPY scripts/ ./scripts/

# Set environment variables for Cloud Run
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Run the webhook handler
CMD ["node", "scripts/webhook-handler.js"]