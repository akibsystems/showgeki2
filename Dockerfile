# Use Node.js 18 LTS Alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies including canvas build dependencies
RUN apk add --no-cache \
    git \
    curl \
    bash \
    python3 \
    make \
    g++ \
    ffmpeg \
    imagemagick \
    pkgconfig \
    cairo-dev \
    pango-dev \
    libjpeg-turbo-dev \
    giflib-dev \
    librsvg-dev \
    pixman-dev

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Clone and setup mulmocast-cli
RUN git clone https://github.com/receptron/mulmocast-cli.git /app/mulmocast-cli

# Install mulmocast-cli dependencies
WORKDIR /app/mulmocast-cli
RUN npm install

# Apply quality parameter patch
RUN sed -i 's/type OpenAIModeration = "low" | "auto";/type OpenAIModeration = "low" | "auto";\ntype OpenAIImageQuality = "high" | "medium" | "low";/' src/agents/image_openai_agent.ts && \
    sed -i 's/  moderation?: "low" | "auto";/  moderation?: "low" | "auto";\n  quality?: OpenAIImageQuality;/' src/agents/image_openai_agent.ts && \
    sed -i 's/    moderation: OpenAIModeration | null | undefined;/    moderation: OpenAIModeration | null | undefined;\n    quality: OpenAIImageQuality | null | undefined;/' src/agents/image_openai_agent.ts && \
    sed -i 's/  const { moderation, canvasSize } = params;/  const { moderation, canvasSize, quality } = params;/' src/agents/image_openai_agent.ts && \
    sed -i 's/    imageOptions.moderation = moderation || "auto";/    imageOptions.moderation = moderation || "auto";\n    imageOptions.quality = quality || "medium";/' src/agents/image_openai_agent.ts && \
    sed -i 's/    moderation: z.string().optional(), \/\/ optional image style/    moderation: z.string().optional(), \/\/ optional image style\n    quality: z.string().optional(), \/\/ optional image quality/' src/types/schema.ts

# Create necessary directories
RUN mkdir -p scripts output

# Go back to main app directory
WORKDIR /app

# Create necessary directories for showgeki2
RUN mkdir -p scripts

# Copy application files
COPY scripts/ ./scripts/

# Set environment variables
ENV PORT=8080

# Expose port
EXPOSE 8080

# Run the webhook handler
CMD ["node", "scripts/webhook-handler.js"]