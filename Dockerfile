FROM node:lts-alpine

WORKDIR /app

# Install dependencies and build the TypeScript server
COPY package.json package-lock.json* ./
COPY tsconfig.json ./
COPY src ./src
COPY migrations ./migrations
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN apk add --no-cache postgresql-client && \
    npm install && \
    npm run build && \
    chmod +x ./docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node","dist/index.js"]
