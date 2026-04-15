FROM node:20-alpine

# Security: run as non-root user
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

# Install dependencies first (separate layer — only reinstalls when package.json changes)
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application source
COPY . .

# Create upload directories and set ownership
RUN mkdir -p uploads/avatars uploads/loan-screenshots uploads/screenshots \
    && chown -R app:app /app

USER app

EXPOSE 3000

# Health check — uses the /api/health endpoint already in server.js
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { \
    r.statusCode === 200 ? process.exit(0) : process.exit(1); \
  }).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
