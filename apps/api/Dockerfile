FROM node:20-alpine

WORKDIR /app

# Copy root workspace files
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install all workspace deps
RUN npm install

# Copy source
COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/
COPY .env ./

WORKDIR /app/apps/api

EXPOSE 4000

CMD ["npx", "ts-node-dev", "--respawn", "--transpile-only", "src/index.ts"]
