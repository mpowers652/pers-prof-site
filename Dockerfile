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

# Build the frontend assets with webpack
RUN npx webpack --mode=production

# Remove AdSense configuration to prevent 400 errors
RUN sed -i '/adsbygoogle/d' index.html || true

# Create required directories
RUN mkdir -p archives sessions

# Create non-root user and set permissions
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 && \
    chown -R nodeuser:nodejs /usr/src/app/sessions /usr/src/app/archives

USER nodeuser

# Expose port
EXPOSE 3000

# Start application with auto-restart capability
CMD ["npm", "start"]
