FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

RUN npm install

COPY packages/shared/ ./packages/shared/
COPY apps/web/ ./apps/web/

WORKDIR /app/apps/web

EXPOSE 5173

CMD ["npx", "vite", "--host", "0.0.0.0"]
