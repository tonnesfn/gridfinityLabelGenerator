FROM node:22-alpine AS build
WORKDIR /app

COPY web/package.json web/package-lock.json ./
RUN npm ci

COPY web/ ./
RUN npm run build

FROM node:22-alpine AS csv-server
WORKDIR /app
COPY server/csv-server.mjs ./
ENV CSV_DATA_DIR=/data/csvs
EXPOSE 4000
CMD ["node", "csv-server.mjs"]

FROM nginx:stable-alpine AS web
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8009
