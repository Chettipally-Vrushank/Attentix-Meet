FROM node:20-alpine AS builder
WORKDIR /app/apps/signal
ENV NODE_ENV=development
RUN npm install -g pnpm

# Copy package.json
COPY apps/signal/package.json ./

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy signal source code and generated prisma client
COPY apps/signal/ ./
COPY generated/prisma /app/generated/prisma/

# Build the app
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app/apps/signal
ENV NODE_ENV=production
RUN npm install -g pnpm

COPY apps/signal/package.json ./
RUN pnpm install --prod --no-frozen-lockfile

# Copy build output and generated prisma
COPY --from=builder /app/apps/signal/dist ./dist
COPY --from=builder /app/generated/prisma /app/generated/prisma

CMD ["node", "dist/index.js"]