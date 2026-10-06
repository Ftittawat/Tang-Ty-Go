# syntax=docker/dockerfile:1.7
# tangty-go — Next.js (output: "standalone"), multi-stage build for arm64 (Raspberry Pi 5)
# Requires `output: "standalone"` in next.config.ts.

FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
# --ignore-scripts: npm 10 (bundled with node:22) runs `node-gyp rebuild` for packages that ship
# prebuilt binaries but set "gypfile": false (e.g. better-sqlite3 >= 13), which fails without Python.
# Remove the flag only if a dependency truly needs its install script (then add python3 make g++).
RUN npm ci --no-audit --no-fund --ignore-scripts

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3200
ENV HOSTNAME=0.0.0.0
ENV DATA_DIR=/data
RUN apk add --no-cache libc6-compat tini
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs \
 && mkdir -p /data \
 && chown nextjs:nodejs /data

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
VOLUME /data
EXPOSE 3200
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
