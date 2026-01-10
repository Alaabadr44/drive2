# Build Stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production Stage
FROM node:18-alpine

# Install FFmpeg for audio conversion
RUN apk add --no-cache ffmpeg


WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/TENANTS ./TENANTS
COPY --from=builder /app/nginx ./nginx
COPY --from=builder /app/public ./public

# Copy other necessary folders if they exist (like uploads)
# COPY --from=builder /app/uploads ./uploads
# Ensure the uploads directory exists
RUN mkdir -p uploads

# Copy entrypoint script
COPY docker-entrypoint.sh .
RUN chmod +x docker-entrypoint.sh

# Expose port
EXPOSE 3000

# Start command via entrypoint
ENTRYPOINT ["./docker-entrypoint.sh"]
