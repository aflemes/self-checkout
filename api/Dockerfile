FROM node:24-alpine AS build
WORKDIR /app
COPY api/package*.json ./
RUN npm ci
COPY api/tsconfig.json api/nest-cli.json ./
COPY api/src ./src
RUN npm run build

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY api/package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY database ./database
EXPOSE 3000
CMD ["sh", "-c", "node database/migrate.js && node dist/main"]