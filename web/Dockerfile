FROM node:24-alpine AS build
WORKDIR /app
COPY web/package*.json ./
RUN npm ci
COPY web/angular.json web/tsconfig.json web/tsconfig.app.json ./
COPY web/src ./src
COPY web/public ./public
RUN npm run build -- --configuration=production

FROM nginx:1.27-alpine
COPY web/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY web/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
COPY --from=build /app/dist/web/browser /usr/share/nginx/html
EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]