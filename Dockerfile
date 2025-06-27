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

# Apply comprehensive quality parameter patch
RUN sed -i 's/type OpenAIModeration = "low" | "auto";/type OpenAIModeration = "low" | "auto";\ntype OpenAIImageQuality = "high" | "medium" | "low";/' src/agents/image_openai_agent.ts && \
    sed -i 's/  moderation?: "low" | "auto";/  moderation?: "low" | "auto";\n  quality?: OpenAIImageQuality;/' src/agents/image_openai_agent.ts && \
    sed -i 's/    moderation: OpenAIModeration | null | undefined;/    moderation: OpenAIModeration | null | undefined;\n    quality: OpenAIImageQuality | null | undefined;/' src/agents/image_openai_agent.ts && \
    sed -i 's/  const { moderation, canvasSize } = params;/  const { moderation, canvasSize, quality } = params;/' src/agents/image_openai_agent.ts && \
    sed -i 's/    imageOptions.moderation = moderation || "auto";/    imageOptions.moderation = moderation || "auto";\n    imageOptions.quality = quality || process.env.OPENAI_IMAGE_QUALITY_DEFAULT || "low";/' src/agents/image_openai_agent.ts && \
    sed -i 's/        return await openai.images.edit({ ...imageOptions, size: targetSize, image: imagelist });/        console.log("[edit]imageOptions.quality", imageOptions.quality);\n        return await openai.images.edit({ ...imageOptions, size: targetSize, image: imagelist });/' src/agents/image_openai_agent.ts && \
    sed -i 's/        return await openai.images.generate(imageOptions);/        console.log("[generate]imageOptions.quality", imageOptions.quality);\n        return await openai.images.generate(imageOptions);/' src/agents/image_openai_agent.ts && \
    sed -i 's/    moderation: z.string().optional(), \/\/ optional image style/    moderation: z.string().optional(), \/\/ optional image style\n    quality: z.string().optional(), \/\/ optional image quality/' src/types/schema.ts && \
    sed -i 's/          moderation: ":preprocessor.imageParams.moderation",/          moderation: ":preprocessor.imageParams.moderation",\n          quality: ":preprocessor.imageParams.quality",/' src/actions/images.ts

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