FROM node:lts-alpine as build
WORKDIR /app

COPY package.json package-lock.json* ./
COPY vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY index.html ./
COPY src ./src

RUN npm install
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 5173
CMD ["nginx","-g","daemon off;"]
