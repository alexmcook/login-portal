FROM node:lts-alpine AS builder
WORKDIR /app

# Install dependencies and build the TypeScript server
COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:lts-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN apk add --no-cache postgresql-client && \
    npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY migrations ./migrations
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node","dist/index.js"]
