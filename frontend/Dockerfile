# ── Stage 1: Build React app ──────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps (cached layer)
COPY package*.json ./
# --legacy-peer-deps: react-scripts@5 declares peer dep on typescript@^3||^4
# but this project uses typescript@6. The flag skips the conflict check —
# the build works fine in practice.
RUN npm ci --legacy-peer-deps

# Copy source and build
COPY . .

# REACT_APP_API_URL is baked into the JS bundle at build time
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build

# ── Stage 2: Serve with Nginx ──────────────────────────────────────────────────
FROM nginx:alpine

# Copy React build output
COPY --from=builder /app/build /usr/share/nginx/html

# SPA nginx config (handles React Router + static asset caching)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
