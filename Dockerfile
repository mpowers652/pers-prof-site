FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies including bcrypt for admin user management and test dependencies
RUN npm install

# Copy source code (excluding .env for security)
COPY . .

# Build and configure application
RUN rm -f .env && \
    npm run build && \
    sed -i '/adsbygoogle/d' index.html || true && \
    mkdir -p archives sessions && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 && \
    chown -R nodeuser:nodejs /usr/src/app/sessions /usr/src/app/archives

ENV NODE_ENV=production

USER nodeuser

# Expose port
EXPOSE 3000

# Start application with auto-restart capability
CMD ["npm", "start"]
