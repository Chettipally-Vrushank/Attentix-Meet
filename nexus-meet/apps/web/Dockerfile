FROM node:20-alpine AS builder
WORKDIR /app
ENV NODE_ENV=development
RUN npm install -g pnpm

# Copy root configuration and lockfile
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Copy app package.json
COPY apps/web/package.json ./apps/web/

# Install dependencies using lockfile
RUN pnpm install --no-frozen-lockfile

# Copy app source code
COPY apps/web ./apps/web

ENV NEXT_TELEMETRY_DISABLED=1

# Run build for web
RUN pnpm --filter web build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser  --system --uid 1001 nextjs

# Copy standalone build output
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static     ./apps/web/.next/static
COPY --from=builder /app/apps/web/public           ./apps/web/public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]