FROM node:lts-alpine

WORKDIR /app

# Install dependencies and build the TypeScript server
COPY package.json package-lock.json* ./
COPY tsconfig.json ./
COPY src ./src

RUN npm install
RUN npm run build

EXPOSE 3000
CMD ["node","dist/index.js"]
