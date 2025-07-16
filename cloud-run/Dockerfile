# Use Node.js 22 Alpine image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for mulmocast-cli
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
    pixman-dev \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-cjk

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Clone and setup mulmocast-cli with fixed tag 0.0.24
RUN git clone https://github.com/receptron/mulmocast-cli.git /app/mulmocast-cli && \
    cd /app/mulmocast-cli && \
    git checkout 0.0.24

# Install mulmocast-cli dependencies
WORKDIR /app/mulmocast-cli
RUN npm install

# Apply quality parameter patch
RUN sed -i 's/type OpenAIModeration = "low" | "auto";/type OpenAIModeration = "low" | "auto";\ntype OpenAIImageQuality = "high" | "medium" | "low";/' src/agents/image_openai_agent.ts && \
    sed -i 's/  moderation?: "low" | "auto";/  moderation?: "low" | "auto";\n  quality?: OpenAIImageQuality;/' src/agents/image_openai_agent.ts && \
    sed -i 's/    moderation: OpenAIModeration | null | undefined;/    moderation: OpenAIModeration | null | undefined;\n    quality: OpenAIImageQuality | null | undefined;/' src/agents/image_openai_agent.ts && \
    sed -i 's/  const { moderation, canvasSize } = params;/  const { moderation, canvasSize, quality } = params;/' src/agents/image_openai_agent.ts && \
    sed -i 's/    imageOptions.moderation = moderation || "auto";/    imageOptions.moderation = moderation || "auto";\n    imageOptions.quality = (quality || process.env.OPENAI_IMAGE_QUALITY_DEFAULT || "low") as OpenAIImageQuality;/' src/agents/image_openai_agent.ts && \
    sed -i 's/        return await openai.images.edit({ ...imageOptions, size: targetSize, image: imagelist });/        console.log("[edit]imageOptions.quality", imageOptions.quality);\n        return await openai.images.edit({ ...imageOptions, size: targetSize, image: imagelist });/' src/agents/image_openai_agent.ts && \
    sed -i 's/        return await openai.images.generate(imageOptions);/        console.log("[generate]imageOptions.quality", imageOptions.quality);\n        return await openai.images.generate(imageOptions);/' src/agents/image_openai_agent.ts && \
    sed -i 's/    moderation: z.string().optional(), \/\/ optional image style/    moderation: z.string().optional(), \/\/ optional image style\n    quality: z.string().optional(), \/\/ optional image quality/' src/types/schema.ts && \
    sed -i 's/          moderation: ":preprocessor.imageParams.moderation",/          moderation: ":preprocessor.imageParams.moderation",\n          quality: ":preprocessor.imageParams.quality",/' src/actions/images.ts

# Build mulmocast-cli
RUN npm run build

# Create output directory
RUN mkdir -p scripts output

# Go back to main app directory
WORKDIR /app

# Copy webhook handler
COPY webhook-handler.js ./

# Puppeteer configuration
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    CI=true

# Expose port (Cloud Run sets PORT env var)
EXPOSE 8080

# Run the webhook handler
CMD ["node", "webhook-handler.js"]