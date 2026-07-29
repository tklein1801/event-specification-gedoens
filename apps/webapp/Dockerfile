FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY apps ./apps
COPY packages ./packages
COPY docs ./docs

RUN npm ci
RUN npx turbo run build --filter=@tklein1801/esg-webapp

FROM nginx:1.29-alpine

ENV PORT=8080

COPY --from=build /app/apps/webapp/dist /usr/share/nginx/html
COPY apps/webapp/nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 8080
