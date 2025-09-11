FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies including bcrypt for admin user management and test dependencies
RUN npm install

# Copy source code (excluding .env for security)
COPY . .
RUN rm -f .env
ENV NODE_ENV=production

# Remove AdSense configuration to prevent 400 errors
RUN sed -i '/adsbygoogle/d' index.html || true

# Create archives directory for privacy policy versions
RUN mkdir -p archives

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001
USER nodeuser

# Expose port
EXPOSE 3000

# Start application with auto-restart capability
CMD ["node", "server.js"]
